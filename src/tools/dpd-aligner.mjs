import { JS, ScvMath, Text } from '@sc-voice/tools';
const { Assert } = JS;
const { Interval, Fraction } = ScvMath;
const { ColorConsole, Unicode, LegacyDoc, WordVector, TfidfSpace } =
  Text;
import { SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from '../defines.mjs';
import Dictionary from '../dictionary.mjs';
let dpdAlignerCtor;

// For more information, see MS-DPD wiki
// https://github.com/sc-voice/ms-dpd/wiki/Case-Study:-Repetition-in-the-Tipitaka

// biome-ignore format:
const {
  GREEN_CHECKBOX, LEFT_ARROW, RIGHT_ARROW, CHECKMARK,
  ELEMENT_OF, WARNING, RED_X, EMDASH, ELLIPSIS,
} = Unicode;
// biome-ignore format:
const {
  BLACK, WHITE, RED, GREEN, BLUE, CYAN, MAGENTA, YELLOW,
  BRIGHT_BLACK,
  BRIGHT_WHITE,
  BRIGHT_RED,
  BRIGHT_GREEN,
  BRIGHT_BLUE,
  BRIGHT_CYAN,
  BRIGHT_MAGENTA,
  BRIGHT_YELLOW,
  NO_COLOR,
} = Unicode.LINUX_COLOR;
const {
  BRIGHT_BLACK: B_BLACK,
  BRIGHT_WHITE: B_WHITE,
  BRIGHT_RED: B_RED,
  BRIGHT_GREEN: B_GREEN,
  BRIGHT_BLUE: B_BLUE,
  BRIGHT_CYAN: B_CYAN,
  BRIGHT_MAGENTA: B_MAGENTA,
  BRIGHT_YELLOW: B_YELLO,
  NO_COLOR: NC,
} = Unicode.LINUX_COLOR;
const PLI_CHARS = 30;

const cc = new ColorConsole({valueColor: BRIGHT_YELLOW});

export class Stanza extends Interval {
  constructor(lo, hi, group='group?', id=0) {
    super(lo, hi);
    let nStanzas = group?.nStanzas || '?';

    let ref = 'S' + id + '/' + nStanzas + super.toString();

    Object.assign(this, { id, group, ref, nStanzas });
  }

  toString() {
    return this.ref;
  }
} // class Stanza

export class AlignmentItem {
  constructor(opts = {}) {
    let {
      id, // line number or scid
      ref,
      text, // text to align (e.g., fr)
      bow, // word frequency of text
      groupId, // grouped items are template-similar across sutta
      group,
      pScore = 0, // similarity with previous item
    } = opts;

    Object.assign(this, {
      id,
      ref: ref == null ? id : ref,
      text,
      bow,
      group,
      groupId,
      pScore,
    });
  }

  toString() {
    let dbg = DBG.A11M_TO_STRING;
    let { id, ref, group, stanza } = this;
    let idRef = id === ref
      ? 'I' + id
      : 'I' + id + '.' + ref;
    let s = stanza
      ? idRef + stanza.ref
      : idRef + group.id;
    return s;
  } // a11m.toString()

  get headGroup() {
    let { group } = this;
    return group.head || group;
  }

  get stanza() {
    let { id, headGroup } = this;
    return headGroup.inferredStanza(id);
  }
} // class AlignmentItem

export class AlignmentGroup {
  constructor(opts = {}) {
    const msg = 'a12p.ctor';
    const dbg = DBG.A12P_CTOR;
    let { 
      id, // 1-based number 
      ref,  // short descriptor
      bow, 
      gScore, 
      itemIds = [], 
      extent 
    } = opts;

    if (gScore == null) {
      gScore = 1;
    }
    dbg && cc.fyi1(msg, opts);
    let {
      id: idDefault,
      idDelta,
      nStanzas,
    } = AlignmentGroup.analyzeItemIds(itemIds);

    let idRanges = Alignable.idRanges(itemIds);
    let delta = 1;

    id = id || idDefault;

    Object.assign(this, {
      id,
      ref,
      bow,
      itemIds,
      gScore,
      delta,
      idRanges,
      extent,
      nStanzas,
    });

    dbg && cc.ok1(msg, this, {id, nStanzas});
  }

  static analyzeItemIds(itemIds, itemId = itemIds[0]) {
    const msg = 'a12p.analyzeItemIds';
    const dbg = DBG.A12P_ANALYZE_ITEM_IDS;
    let idRanges = Alignable.idRanges(itemIds);
    let rSize; // range size
    let idDelta; // distance between ranges
    let nRanges = idRanges.length;
    dbg > 1 && cc.fyi1(msg + 0.1, 'itemIds:', itemIds.join(','));
    let prevLo;
    let ranges = idRanges.map((interval, i) => {
      let { lo, hi } = interval;
      let r3e = hi - lo + 1;
      if (rSize == null) {
        rSize = r3e;
      } else if (rSize !== r3e) {
        rSize = '?';
      }
      if (i > 0) {
        let dlo = lo - prevLo;
        if (idDelta == null) {
          idDelta = dlo;
        } else if (dlo === idDelta) {
          // skip is consistent;
        } else {
          idDelta = '?';
        }
      }
      dbg > 1 && cc.fyi(msg + 0.2, { idDelta, nRanges, lo, hi });
      prevLo = lo;

      if (lo === hi) {
        return `${lo}`;
      }
      let sLow = '' + lo;
      let sRange = sLow;
      if (lo !== hi) {
        sRange += '-';
        let sHigh = hi + '';
        // strip characters shared with sLow from sHigh
        for (let i = 0; i < sHigh.length; i++) {
          if (sRange[i] !== sHigh[i]) {
            sRange += sHigh.substring(i);
            break;
          }
        }
      }
      return sRange;
    });
    let idSuffix;
    let nStanzas = nRanges;
    if (nRanges === 1) {
      // simple range
      let { lo, hi } = idRanges[0];
      nStanzas = hi - lo + 1;
      if (lo === hi) {
        dbg && cc.ok1(msg + 1, { itemId, lo, hi, idDelta, nStanzas });
        idSuffix = lo;
      } else {
        dbg && cc.ok1(msg + 2, { itemId, lo, hi, idDelta, nStanzas });
        idSuffix = lo + ELLIPSIS + hi + 'S' + nStanzas + '@1';
      }
    } else if (Number.isFinite(rSize) && Number.isFinite(idDelta)) {
      dbg && cc.ok1(msg + 3, { itemId, idDelta, nStanzas });
      idSuffix =
        ranges[0] +
        ELLIPSIS +
        idRanges.at(-1).hi +
        'S' +
        nStanzas +
        '@' +
        idDelta;
    } else {
      dbg && cc.ok1(msg + 4, { itemId, idDelta, nStanzas });
      idSuffix = ranges.join('.');
    }

    return {
      id: 'G' + idSuffix,
      idDelta,
      nStanzas,
    };
  } // analyzeItemIds

  get bounds() {
    let { idRanges } = this;
    return new Interval(idRanges[0].lo, idRanges.at(-1).hi);
  }

  get spanning() {
    let { idRanges } = this;
    return idRanges.length === 1 ||
      idRanges.reduce((a, s) => a && s.lo === s.hi, true);
  }

  overlaps(group2) {
    const msg = 'a12p.overlaps';

    let { id: id1, spanning: spanning1, idRanges: intervals1 } = this;
    let lo1 = intervals1[0].lo;
    let hi1 = intervals1.at(-1).hi;
    let span1 = new Interval(lo1, hi1);
    if (group2 == null) {
      throw new Error(`${msg} groups2?`);
    }
    let {
      id: id2,
      spanning: spanning2,
      idRanges: intervals2,
    } = group2;
    if (intervals2 == null) {
      throw new Error(`${msg} ${group2.id} idRanges?`);
    }
    let lo2 = intervals2[0].lo;
    let hi2 = intervals2.at(-1).hi;
    let span2 = new Interval(lo2, hi2);

    let spanOverlaps = span1.overlaps(span2);
    if (spanning1 && spanning2) {
      cc.ok(msg + 1, 'spanning overlaps', id1, id2);
      return spanOverlaps;
    }

    for (let i = 0; i < intervals1.length; i++) {
      let s1 = intervals1[i];
      for (let j = 0; j < intervals2.length; j++) {
        let s2 = intervals2[j];
        if (s1.overlaps(s2)) {
          cc.ok(msg + 2, 'sparse overlaps', id1, id2, s1, s2);
          return true;
        }
      }
    }

    cc.fyi(msg + 0.1, '!overlaps', id1, id2);
    return false;
  } // overlaps

  toString() {
    const msg = 'a12p.toString';
    let { id, idRanges, spanning, extent, bounds } = this;
    if (spanning) {
      let s = id;
      if (extent) {
        s += EMDASH + extent.toString();
      }
      return s;
    }
    return id + ELLIPSIS + (extent || bounds);
  } // toString

  inferredStanza(id) {
    const msg = 'a12p.inferredStanza';
    const dbg = DBG.A12P_INFERRED_STANZA;
    let { id: gid, head = this } = this;
    let { idRanges, extent, spanning } = head;
    if (!extent?.contains(id)) {
      return null;
    }
    let res = null;
    let nRanges = idRanges.length;
    if (spanning) {
      dbg > 1 && cc.fyi(msg + 0.1, this, this);
      for (let i = 1; !res && i < nRanges; i++) {
        let lo = idRanges[i - 1].lo;
        let hi = idRanges[i].lo - 1;
        if (lo <= id && id <= hi) {
          res = new Stanza(lo, hi, this, i);
          dbg && cc.ok1(msg + 1.1, '#' + id + '^' + head, '=>', res);
        }
      }
      if (res == null) {
        let { lo } = idRanges.at(-1);
        let hi = extent?.hi || lo;
        if (nRanges === 1) {
          // Singleton group implies each item is a stanza
          let iStanza = id - lo + 1;
          res = new Stanza(lo, hi, this, iStanza);
          dbg && cc.ok1(msg + 1.2, '#' + id + '^' + head, '=>', res);
        } else {
          res = new Stanza(lo, hi, this, nRanges);
          dbg && cc.ok1(msg + 1.3, '#' + id + '^' + head, '=>', res);
        }
      }
    } else {
      // sparse
      for (let i = 1; !res && i < nRanges; i++) {
        let lo = idRanges[i - 1].lo;
        let hi = idRanges[i].lo - 1;
        if (lo <= id && id <= hi) {
          res = new Stanza(lo, hi, this, i);
          dbg && cc.ok1(msg + 2.1, '#' + id + '^' + head, '=>', res);
        }
      }
      if (res) {
        dbg && cc.ok1(msg + 2.1, this, '#' + id, '=>', res);
      } else {
        dbg>1 && cc.fyi1(msg+0.22, {nRanges});
        let { lo } = idRanges.at(-1);
        let hi = extent?.hi || lo;
        res = new Stanza(lo, hi, this, nRanges);
        dbg && cc.ok1(msg + 2.2, '#' + id + '^' + head, '=>', res);
      }
    }

    return res;
  } // a12p.inferredStanza

} // class AlignmentGroup

export class Alignable {
  static #privateCtor;
  constructor(opts = {}) {
    const msg = 'a7e.ctor:';
    if (!Alignable.#privateCtor) {
      throw new Error(`${msg} fromList()?`);
    }
    Object.assign(this, opts);
  }

  static fromListRaw(list, tfidfSpace, opts = {}) {
    const msg = 'a7e.fromListRaw:';
    const dbg = DBG.A7E_FROM_LIST;
    if (list == null) {
      throw new Error(`${msg} list?`);
    }
    if (tfidfSpace == null) {
      throw new Error(`${msg} tfidfSpace?`);
    }
    let {
      groupThreshold = 0.4,
      listText = (listItem) => listItem, // item text
      listId = (i) => i + 1, // item id number [1..N]
      listRef, // item id string (optional)
    } = opts;
    let items = [];
    for (let i = 0; i < list.length; i++) {
      let id = listId(i);
      let text = listText(list[i]);
      let bow = tfidfSpace.bowOfText(text);
      let pScore = i > 0 ? bow.similar(items[i - 1].bow) : 0;
      let newItem = new AlignmentItem({ id, text, bow, pScore });
      if (listRef != null) {
        newItem.ref = listRef(i);
      }
      items.push(newItem);
    }

    try {
      Alignable.#privateCtor = true;
      let a7e = new Alignable({
        tfidfSpace,
        groupThreshold,
        items,
      });
      return a7e;
    } catch (e) {
      console.error(msg, e);
      throw e;
    } finally {
      Alignable.#privateCtor = false;
    }
  } // a7e.fromListRaw

  static fromList(list, tfidfSpace, opts = {}) {
    const msg = 'a7e.fromList:';
    const dbg = DBG.A7E_FROM_LIST;
    let a7e = Alignable.fromListRaw(list, tfidfSpace, opts);
    a7e.groupSimilar();
    a7e.addHeadGroups();

    return a7e;
  }

  static idRanges(itemIds) {
    const msg = 'a7e.idRanges';
    const dbg = DBG.A7E_idRanges;
    let lo;
    let hi;
    let [...ids] = itemIds;
    ids.sort((a, b) => a - b);
    dbg && cc.fyi(msg, { itemIds, ids });
    let idRanges = ids.reduce((a, id, i) => {
      if (i === 0) {
        lo = id;
        hi = id;
      } else {
        if (id === 1 + ids[i - 1]) {
          hi = id;
        } else {
          a.push(new Interval(lo, hi));
          lo = id;
          hi = id;
        }
      }
      return a;
    }, []);
    idRanges.push(new Interval(lo, hi));

    return idRanges;
  }

  addHeadGroups() {
    const msg = 'a7e.addHeadGroups';
    const dbg = DBG.A7E_ADD_HEAD_GROUPS;

    let { items } = this;
    let nItems = items.length;
    let { group: group0 } = items[0];
    let bPrev;
    let head = group0;
    let bCur = head.bounds;
    let extent = bCur;
    let iExtent = 0;
    function addExtent(end) {
      for (let i = iExtent; i < end; i++) {
        let item = items[i];
        let { id, ref, group } = item;
        group.extent = extent;
        if (group.head) {
          if (group.head !== head) {
            throw new Error(
              `${msg} head! ${head} ${group.toString()}`,
            );
          }
        } else {
          group.head = head;
        }
        dbg && cc.ok1(msg + 1, item, '^' + head.toString());
      }
    }
    for (let i = 1; i < nItems; i++) {
      let item = items[i];
      let { id, ref, group } = item;
      let sItem = '#' + ref + group.id;
      bPrev = bCur;
      bCur = group.bounds;
      if (extent.overlaps(bCur)) {
        extent = new Interval(
          Math.min(extent.lo, bCur.lo),
          Math.max(extent.hi, bCur.hi),
        );
        dbg > 1 && cc.fyi(msg + 0.1, bCur, 'extend', extent);
      } else {
        addExtent(i);
        extent = bCur;
        iExtent = i;
        head = group;
        dbg > 1 && cc.fyi(msg + 0.2, bCur, 'start', extent);
      }
    }
    if (nItems) {
      dbg > 1 && cc.fyi(msg + 0.3, 'end', extent);
      addExtent(nItems);
    } else {
      cc.bad1(msg + -1, 'items?:');
    }
  }

  /* Group similar input lines having small differences.
   * Small differences complicate alignment which
   * tends to be "distracted" by the large body of text
   * accompanying the small differences.
   * Distracted aligners can misalign different instances
   * of the same group, so the repeated words are replaced by
   * a smaller proxy word set for alignment.
   * Q: what should those proxies be?
   * A1: guid?
   * A2: Pali?
   * A3: FR?
   */
  groupSimilar() {
    const msg = 'a7e.groupSimilar';
    const dbg = DBG.A7E_GROUP_SIMILAR;
    let { items, tfidfSpace: ts, groupThreshold } = this;
    let nitems = items.length;
    const msStart = Date.now();
    for (let i = 0; i < nitems; i++) {
      let { id, ref: iRef, bow: iBow, group: group_i } = items[i];
      if (group_i == null) {
        let itemIds = [i + 1];
        group_i = { itemId:i+1, itemIds, ref: iRef };
        dbg > 1 && cc.fyi(msg + 0.1, group_i);
        items[i].group = group_i;
        group_i.bows = [iBow]; // temporary;
      }
      for (let j = i + 1; j < nitems; j++) {
        let jItem = items[j];
        let { id: jId, ref: jRef, bow: jBow, group: group_j } = jItem;
        if (group_j == null) {
          let gScore = iBow.similar(jBow);
          // biome-ignore format:
          dbg>1 && cc.fyi(msg + 0.2, id + '?' + jId, iRef + '?' + jRef,
            'gScore:', gScore,);
          if (groupThreshold <= gScore) {
            let groupBows = group_i.bows;
            group_i.itemIds.push(j + 1);
            group_i.bows.push(jBow);
            group_i.gScore = group_i.gScore
              ? Math.min(group_i.gScore, gScore)
              : gScore;
            items[j].group = group_i;
            // biome-ignore format:
            dbg > 1 && cc.fyi(msg + 0.3, { i, j, gScore,
              bows: group_i.bows.length, itemIds: group_i.itemIds});
          }
        }
      }
    }
    this.groups = items.reduce((ag, item, itemId) => {
      // convert group POJO to AlignmentGroup
      let { group } = item;
      let { id: groupId, idDelta } = AlignmentGroup.analyzeItemIds(
        group.itemIds,
        itemId,
      );
      item.groupId = groupId;
      item.idDelta = idDelta;
      if (ag[groupId] == null) {
        group.itemIds.sort((a, b) => a - b);
        if (group?.bows?.length) {
          // the group bow is the average of its constituent bows
          let n = group.bows.length;
          let bowSum = group.bows[0];
          let mask = bowSum.oneHot();
          for (let k = 1; k < n; k++) {
            let kBow = group.bows[k];
            bowSum = bowSum.add(kBow);
            mask = mask.andOneHot(kBow);
          }
          group.bow = mask.multiply(bowSum).scale(1 / n);
          delete group.bows;
          ag[groupId] = new AlignmentGroup(group);
        }
      }
      item.group = ag[groupId]; // the real group
      return ag;
    }, {});
    if (dbg) {
      Object.values(this.groups).forEach((group) => {
        let { id, ref, bow, gScore, itemIds, idRanges } = group;
        //biome-ignore format:
        cc.ok1(msg + 1, B_CYAN + id,
          itemIds[0] === itemIds.at(-1) ? ref :  ref + ELLIPSIS,
          'gScore:', gScore,
          'idRanges:', idRanges.map(s=>s.toString()).join(','),
          );
      });
    }
    let elapsed = ((Date.now() - msStart) / 1000).toFixed(3);
    dbg > 1 && cc.fyi1(msg + 0.2, 'elapsed', 'ms:', elapsed);

    return this;
  } // groupSimilar
} // class Alignable

export class ScanResult {
  constructor(opts = {}) {
    let {
      pliChars,
      refItem,
      scid,
      scoreDpdSrc,
      srcItem,
      streakSize = 0,
      vDpd,
      vDpdSrc,
    } = opts;

    Object.assign(this, {
      pliChars,
      refItem,
      srcItem,
      scid,
      scoreDpdSrc,
      streakSize,
      vDpd,
      vDpdSrc,
    });
  }

  start(refItem) {
    this.streakSize = 1;
    this.refItem = refItem;
  }

  scanSummary(refItem, status, color) {
    if (refItem == null) {
      refItem = this.refItem;
    }
    if (color == null) {
      color = NC;
    }
    if (status == null) {
      status = '0';
    }
    let { srcItem, streakSize, scoreDpdSrc, pliChars } = this;
    let scid = refItem?.ref;
    let refGrpId = refItem?.groupId;
    let refText = refItem?.text;
    let refInfo = `${B_CYAN}${scid}${refGrpId}${NC}`;
    let pliInfo = `${refText?.substring(0, pliChars)}`;
    let srcLine = srcItem.id;
    let srcGrpId = srcItem.groupId;
    let srcInfo = `${CYAN}${srcLine}${srcGrpId}${NC}`;

    return [srcInfo, `<${status}>`, refInfo].join('');
  }

  dbgLog(msg, dbgPos, status, refItem, color) {
    if (refItem == null) {
      refItem = this.refItem;
    }
    if (color == null) {
      color = NC;
    }
    let { scoreDpdSrc, pliChars } = this;
    let refText = refItem?.text;
    let pliInfo = `${refText?.substring(0, pliChars)}`;
    let scores = scoreDpdSrc.toFixed(3) + ' ';
    let summary = this.scanSummary(refItem, status, color);

    //biome-ignore format:
    console.log([ color, msg, dbgPos, ' ',
      scores, summary, ' ', 
      pliInfo].join(''));
  }

  toString(opts={}) {
    let { 
      refItem, srcItem, scoreDpdSrc, pliChars,
    } = this;

    let srcStanza = srcItem?.stanza;
    let refStanza = refItem?.stanza;
    let refText = refItem?.text;

    return [
      cc.valueOf(scoreDpdSrc),
      srcItem,
      refItem,
      refText?.substring(0, pliChars),
    ].join(' ');
  } // s8t.toString()
} // class ScanResult

export class Scanner {
  constructor(aligner, alignableSrc) {
    const msg = 's5r.ctor:';
    let { items } = alignableSrc;
    let nSegs = items.length;
    let segCursor = new Fraction(0, nSegs, 'segs');

    Object.assign(this, {
      aligner,
      alignableSrc,
      segCursor,
    });
  }

  get tfidfSpace() {
    return this.aligner.tfidfSpace;
  }
  get minScore() {
    return this.aligner.minScore;
  }
  get maxScanSize() {
    return this.aligner.maxScanSize;
  }
  get minScanSize() {
    return this.aligner.minScanSize;
  }
  get maxStreak() {
    return this.aligner.maxStreak;
  }
  get maxSegWords() {
    return this.aligner.maxSegWords;
  }
  get streakStart() {
    return this.aligner.streakStart;
  }
  get alignableRef() {
    return this.aligner.alignableRef;
  }

  areGroupAlignable(srcItem, refItem) {
    const msg = 's5r.areGroupAlignable';
    const dbg = DBG.S5R_ARE_GROUP_ALIGNABLE || DBG.S5R_SCAN_TEXT > 2;
    let { alignableRef, alignableSrc } = this;
    let srcGid = srcItem.groupId;
    let refGid = refItem.groupId;
    let srcGrp = alignableSrc.groups[srcGid];
    let nSrc = srcGrp.itemIds.length;
    let refGrp = alignableRef.groups[refGid];
    let nRef = srcGrp.itemIds.length;
    let alignable = false;
    let scid = refItem.ref;
    let line = srcItem.id;

    if (nSrc === nRef) {
      let srcId = srcItem.id;
      let srcIdx = srcGrp.itemIds.indexOf(srcId);
      let refId = refItem.id;
      let refIdx = refGrp.itemIds.indexOf(refId);
      if (srcIdx === refIdx) {
        // biome-ignore format:
        dbg && console.log(`${B_GREEN}${msg}@1`, 
          `${CYAN}${srcId}${srcGrp.id}`,
          `${B_CYAN}${scid}${refGrp.id}`,
          `alignable src:${srcGid} ref:${refGid} idx:${srcIdx}`,
          NC);
        alignable = true;
      } else {
        //biome-ignore format:
        dbg && console.log(`${RED}${msg}@-1`, 
          `${CYAN}${srcId}${srcGrp.id}`,
          `${B_CYAN}${scid}${refGrp.id}`,
          `${CYAN}${scid}${refGrp.id}`, NC);
      }
    } else {
      // biome-ignore format:
      dbg && console.log(`${msg}@-2`, RED,
          `!alignable src:${srcGid} ref:${refGid}`, NC);
    }

    return alignable;
  }

  trimWords(rawText) {
    const msg = 's54.trimWords:';
    const dbg = DBG.S54_TRIM_WORDS;
    let { aligner, maxSegWords } = this;
    let { tfidfSpace: ts } = aligner;
    let text = ts.normalizeText(rawText);
    if (maxSegWords) {
      text = text.split(/\s+/).slice(0, maxSegWords).join(' ');
    }

    dbg && console.log(msg, text);
    return text;
  }

  // biome-ignore format:
  scanItem(srcItem) {
    const msg = 's5r.scanItem';
    const dbg = DBG.S5R_SCAN_ITEM;
    let {
      aligner,
      alignableRef,
      alignableSrc,
      tfidfSpace: ts,
      segCursor,
      minScanSize,
      maxScanSize,
      minScore,
      maxStreak,
      streakStart,
      pliChars,
    } = this;
    if (!(srcItem instanceof AlignmentItem)) {
      throw new Error(`${msg} AlignmentItem?`);
    }

    let { pScore, groupId:srcGrpId, id:srcLine } = srcItem;
    let dbgTextChars = dbg>3 ? undefined : 15;
    let srcGrp = alignableSrc.groups[srcGrpId];
    let srcText = this.trimWords(srcItem.text);
    let srcStanza = srcItem.stanza;
    let vSrc = ts.tfidfOfBow(srcItem.bow);
    let refItems = alignableRef.items;
    let iScanStart = segCursor.numerator;
    let sr = new ScanResult({
      srcItem,
      refItem: refItems[iScanStart],
      vSrc,
      segCursor,
      scoreDpdSrc: 0,
      pliChars:dbgTextChars,
    });
    let scanning = (i) =>
      i < maxScanSize &&
      (i < minScanSize || sr.scoreDpdSrc < minScore) &&
      sr.streakSize < maxStreak;
    let scid;
    let refStart = refItems[iScanStart];
    dbg>1 && console.log(`${msg}@0.1 srcText`, sr.scanSummary(refStart),
      `${GREEN}${srcText.substring(0,dbgTextChars)}${NC}`);
    let streakFirst = null;
    let streakStop = null;
    dbg && cc.fyi(msg+0.1, srcItem, srcText);
    for (let iScan = 0; scanning(iScan); iScan++) {
      let iRef = iScanStart + iScan;
      let refItem = refItems[iRef];
      scid = refItem.ref;
      let refText = refItem.text;
      let refStanza = refItem.stanza;
      let refId = refItem.id;
      let refGrpId = refItem.groupId;
      let refGrp = alignableRef.groups[refGrpId];
      let vDpd = refItem.vDpd;
      let scoreDpdSrc = vSrc.similar(vDpd);
      let vDpdSrc = vDpd.hadamardL1(vSrc);
      let startStreak = ()=>{
        sr.start(refItem);
        Object.assign(sr, { iScan, scid, scoreDpdSrc,
          vDpd, refText, vDpdSrc});
      }
      if (scoreDpdSrc < minScore) {
        if (sr.streakSize > 0) { // end of streak
          dbg && cc.fyi(msg+0.2, 'end_streak', srcItem, refItem);
          break;
        } else {
          // ignore segment
          dbg && cc.fyi(msg+0.3, 'skip', scoreDpdSrc, srcItem, refItem);
        } 
      } else if (srcStanza.id > refStanza.id) {
        dbg && cc.fyi(msg+0.35, 'catchup', srcItem, refItem);
      } else {
        // new streak candidate
        let streakMovable =
          sr.scoreDpdSrc * streakStart < scoreDpdSrc
        let canGrp = this.areGroupAlignable(srcItem, refItem);
        if (sr.streakSize === 0) { // start a streak
          let grpSize = refGrp.itemIds.at(-1) - refGrp.itemIds[0];
          dbg && cc.fyi(msg+0.4, srcItem, 'strtStreak', refItem);
          startStreak();
          if (canGrp && grpSize>1) {
            let lastInGroup = srcItem.id === srcGrp.itemIds.at(-1);
            if (lastInGroup) {
              let ds = grpSize - sr.streakSize;
              dbg && cc.bad1(msg+0.45, srcItem, 'grow+'+ds, 
                refItem, refItem.group);
              sr.streakSize += ds;
              break;
            } else {
              dbg>1 && sr.dbgLog(msg, '@1.2', 
                `${CHECKMARK}${sr.streakSize}`, refItem, YELLOW);
            }
          } else {
            dbg>1 && sr.dbgLog(msg, '@1', 
              `${CHECKMARK}${sr.streakSize}`, refItem, GREEN);
          }
        } else if (streakMovable && ( refGrp.itemIds.length === 1)) {
          dbg && cc.fyi(msg+0.5, srcItem, 'moveStreak', refItem);
          startStreak(); // move streak to new start
        } else if (srcItem.stanza.id === refItem.stanza.id) {
          dbg && cc.fyi1(msg+0.6, srcItem, 'growStreak', refItem);
          sr.streakSize++;
        } else { 
          dbg && cc.bad1(msg+0.7, srcItem, 'growStreak', refItem);
          break;
        }
      }
    } // scanning
    if (sr.scoreDpdSrc < minScore) { // no alignment found
      dbg && sr.dbgLog(msg, '@-1', RED_X, null, B_RED);
      return null;
    }

    segCursor.numerator += sr.iScan + sr.streakSize;
    dbg && cc.ok1(msg+5, `${CHECKMARK}${sr.streakSize}`, sr);

    return sr;
  } // scanItem

  xscanItem(srcItem) {
    const msg = 's5r.xscanItem';
    const dbg = DBG.S5R_SCAN_ITEM;
    let {
      aligner,
      alignableRef,
      alignableSrc,
      tfidfSpace: ts,
      segCursor,
      minScanSize,
      maxScanSize,
      minScore,
      maxStreak,
      streakStart,
      pliChars,
    } = this;
    if (!(srcItem instanceof AlignmentItem)) {
      throw new Error(`${msg} AlignmentItem?`);
    }

    let { pScore, groupId:srcGrpId, id:srcLine } = srcItem;
    let dbgTextChars = dbg>3 ? undefined : 15;
    let srcGrp = alignableSrc.groups[srcGrpId];
    let srcText = this.trimWords(srcItem.text);
    let vSrc = ts.tfidfOfBow(srcItem.bow);
    let refItems = alignableRef.items;
    let iScanStart = segCursor.numerator;
    let sr = new ScanResult({
      srcItem,
      refItem: refItems[iScanStart],
      vSrc,
      segCursor,
      scoreDpdSrc: 0,
      pliChars:dbgTextChars,
    });
    let scanning = (i) =>
      i < maxScanSize &&
      (i < minScanSize || sr.scoreDpdSrc < minScore) &&
      sr.streakSize < maxStreak;
    let scid;
    let refStart = refItems[iScanStart];
    let streakFirst = null;
    let streakStop = null;
    dbg && cc.fyi(msg+0.1, 'FOOF', srcItem, srcText, 'hi');
    for (let iScan = 0; scanning(iScan); iScan++) {
      let iRef = iScanStart + iScan;
      let refItem = refItems[iRef];
      scid = refItem.ref;
      let refText = refItem.text;
      let refId = refItem.id;
      let refGrpId = refItem.groupId;
      let refGrp = alignableRef.groups[refGrpId];
      let vDpd = refItem.vDpd;
      let scoreDpdSrc = vSrc.similar(vDpd);
      let vDpdSrc = vDpd.hadamardL1(vSrc);
      let startStreak = ()=>{
        sr.start(refItem);
        Object.assign(sr, { iScan, scid, scoreDpdSrc,
          vDpd, refText, vDpdSrc});
      }
      if (dbg>3) {
        console.log(`${msg}@0.3`, 'vDpdSrc', GREEN,
          vDpdSrc.toString({ precision: 3 }), NC);
      }
      if (minScore <= scoreDpdSrc) { // new streak candidate
        let streakMovable =
          sr.scoreDpdSrc * streakStart < scoreDpdSrc
        let canGrp = this.areGroupAlignable(srcItem, refItem);
        if (sr.streakSize === 0) { // start a streak
          let grpSize = refGrp.itemIds.at(-1) - refGrp.itemIds[0];
          dbg && cc.fyi(msg+0.2, srcItem, 'strtStreak', refItem);
          startStreak();
          if (canGrp && grpSize>1) {
            let lastInGroup = srcItem.id === srcGrp.itemIds.at(-1);
            if (lastInGroup) {
              sr.streakSize = grpSize;
              dbg>1 && sr.dbgLog(msg, '@1.1', 
                `${CHECKMARK}${sr.streakSize}`, refItem, YELLOW);
              break;
            } else {
              dbg>1 && sr.dbgLog(msg, '@1.2', 
                `${CHECKMARK}${sr.streakSize}`, refItem, YELLOW);
            }
          } else {
            dbg>1 && sr.dbgLog(msg, '@1', 
              `${CHECKMARK}${sr.streakSize}`, refItem, GREEN);
          }
        } else if (streakMovable && ( refGrp.itemIds.length === 1)) {
          dbg && cc.fyi(msg+0.3, srcItem, 'moveStreak', refItem);
          startStreak(); // move streak to new start
          dbg>1 && sr.dbgLog(msg, '@2', '!', refItem, B_WHITE);
        } else { // grow streak
          dbg && cc.fyi(msg+0.4, srcItem, 'growStreak', refItem);
          sr.streakSize++;
          dbg>1 && sr.dbgLog(msg, '@3', sr.streakSize, refItem, GREEN);
        }
      } else if (sr.streakSize > 0) { // end of streak?
        dbg>1 && sr.dbgLog(msg, '@4', '$', refItem);
        break;
      } else { // ignore segment
        dbg>1 && sr.dbgLog(msg, '@0.5', sr.streakSize, refItem);
      }
    } // scanning
    if (sr.scoreDpdSrc < minScore) { // no alignment found
      dbg && sr.dbgLog(msg, '@-1', RED_X, null, B_RED);
      return null;
    }

    segCursor.numerator += sr.iScan + sr.streakSize;
    dbg && sr.dbgLog(msg, '@5', `${CHECKMARK}${sr.streakSize}`, 
      null, B_GREEN);

    return sr;
  } // xscanItem
} // class Scanner

export class DpdAligner {
  constructor(opts = {}) {
    const msg = 'd8r.ctor:';
    if (!dpdAlignerCtor) {
      throw new Error(`${msg}create?`);
    }
    Object.assign(this, opts);
  }

  static async createSuttaAligner(sref, opts = {}) {
    const msg = 'd8r.createSuttaAligner:';
    const dbg = DBG.D8R_CREATE;
    let { sutta_uid, lang, author } = SuttaRef.create(sref);
    // Required
    if (sutta_uid == null) {
      throw new Error(`${msg}sutta_uid?`);
    }
    if (lang == null) {
      throw new Error(`${msg}lang?`);
    }
    if (author == null) {
      throw new Error(`${msg}author?`);
    }
    let {
      // Optional
      dbgScid, // print out info for this SCID
      maxScanSize = 40, // maximum segments to scan for alignment
      minScanSize = 4, // minimum number of segments to scan
      maxStreak = 2, // maximum segment matches for 1 line
      minScore = 0.085, // minimum alignment scoreDpdSrc
      maxSegWords = 22, // align to truncated legacy segments
      streakStart = 1.1, // threshold to change start of streak
      idfWeight = 1.618033988749895, // sensitivity to word rarity
      groupThreshold = 0.55, // groupSimilar
    } = opts;

    // possible future options
    let tfidfSpace;
    if (tfidfSpace == null) {
      let normalizeText;
      normalizeText = DpdAligner.normalizeFR_DEPRECATED;
      tfidfSpace = new TfidfSpace({ lang, normalizeText, idfWeight });
    }
    let msdpd;
    if (msdpd == null) {
      const msStart = Date.now();
      msdpd = await Dictionary.create({ lang });
      let elapsed = ((Date.now() - msStart) / 1000).toFixed(3);
      dbg && console.log(msg, `elapsed ${elapsed}s`);
    }

    try {
      dpdAlignerCtor = true;
      let aligner = new DpdAligner({
        sutta_uid,
        author,
        //dbgScid,
        msdpd,
        lang,
        maxScanSize,
        minScanSize,
        maxStreak,
        minScore,
        maxSegWords,
        streakStart,
        groupThreshold,
        //minWord: 1,
        scvEndpoint: 'https://www.api.sc-voice.net/scv',
        tfidfSpace,
      });
      return aligner;
    } catch (e) {
      console.error(`${msg}${e.message}`);
      throw e;
    } finally {
      dpdAlignerCtor = false;
    }
  } // create

  // move this back to @sc-voice/tools/text TfidfSpace when stable
  static normalizeFR_DEPRECATED(s) {
    let sAbbr = s
      .toLowerCase()
      .replace(/\bd[’']/gi, 'de ')
      .replace(/\bl[’']/gi, 'le ')
      .replace(/\bs[’']/gi, 's_')
      .replace(/\bj[’']/gi, 'j_')
      .replace(/\bm[’']/gi, 'm_')
      .replace(/\bn[’']/gi, 'n_')
      .replace(/\bc[’']/gi, 'c_')
      .replace(/<[^>]*>/gi, '')
      .replace(/[\[\]]+/gi, '');
    return TfidfSpace.removeNonWords(sAbbr);
  }

  async *alignLegacySutta(opts = {}) {
    const msg = 'd8r.alignLegacySutta:';
    const dbg = DBG.D8R_ALIGN_LEGACY_SUTTA;
    let { cache } = opts;
    let {
      sutta_uid,
      lang,
      author,
      maxScanSize,
      minScanSize,
      minScore,
      tfidfSpace: ts,
      alignableRef,
    } = this;
    let { corpus } = ts;

    try {
      if (alignableRef) {
        dbg && cc.bad1(msg + -1, '!addReferenceSutta', sutta_uid);
        return alignableRef;
      }
      dbg > 1 && cc.fyi(msg + 0.1, 'addReferenceSutta', sutta_uid);
      await this.addReferenceSutta(sutta_uid);
      let fetchOpts = Object.assign(
        { cache },
        SuttaRef.create({ sutta_uid, lang, author }),
      );
      dbg > 1 && cc.fyi(msg + 0.2, 'fetchLegacy', fetchOpts);
      let legacyDoc = await LegacyDoc.fetchLegacy(fetchOpts);
      if (!(legacyDoc instanceof LegacyDoc)) {
        throw new Error(`${msg}legacyDoc?`);
      }
      let { lines } = legacyDoc;
      dbg && cc.fyi(msg + 0.3, 'lines', lines.length);
      let alignableSrc = Alignable.fromList(lines, ts, this);
      let { items } = alignableSrc;
      let scanner = new Scanner(this, alignableSrc);
      let { segCursor } = scanner;
      let done = lines.length < 1;
      for (let iSrc = 0; !done; iSrc++, done = iSrc >= lines.length) {
        let srcItem = items[iSrc];
        let { text: srcText } = srcItem;
        let line = iSrc + 1;
        dbg > 1 && cc.fyi(msg + 0.3, 'scanItem', srcItem);
        let scanRes = scanner.scanItem(srcItem);
        Object.assign(scanRes, { line, srcText });
        let { refItem } = scanRes;
        dbg &&
          cc.ok(
            msg + 1,
            'scanItem',
            '#' + line,
            srcText.substring(0, 15),
            '=>',
            refItem,
          );
        if (scanRes == null) {
          break;
        }
        yield Object.assign(scanRes, { line, srcText });
      }
    } catch (e) {
      console.error(msg, 'ERROR', e);
      throw new Error(`${msg} ${e.message}`);
    } finally {
      dbg && console.error(msg, 'END');
    }
  }

  get corpus() {
    return this.tfidfSpace.corpus;
  }

  scids() {
    let { alignableRef } = this;
    return alignableRef?.items?.map((item) => item.ref);
  }

  queryVector(text) {
    let { tfidfSpace: ts, corpus } = this;
    return ts.tfidf(text);
  }

  bowOfText(text) {
    const msg = 'd8r.bowOfText:';
    let { tfidfSpace } = this;
    return tfidfSpace.bowOfText(text);
  }

  bowOfSegment(seg) {
    const msg = 'd8r.bowOfSegment:';
    const dbg = DBG.D8R_BOW_OF_SEGMENT;
    let { scid, pli } = seg;
    let { tfidfSpace, msdpd } = this;
    let words = pli.trim().split(' ');
    let bow = new WordVector();
    let msStart = Date.now();
    for (let j = 0; j < words.length; j++) {
      let word = words[j];
      let entry = msdpd.entryOf(word);
      if (entry) {
        let { definition } = entry;
        definition.reduce((a, d) => {
          let def = msdpd.parseDefinition(d);
          let { meaning, meaning_lit } = def;
          let text = [meaning, meaning_lit].join(' ').trim();
          dbg && console.log(msg, { text, def });
          let v = tfidfSpace.bowOfText(text);
          a.increment(v);
          return a;
        }, bow);
      }
    }
    let elapsed = ((Date.now() - msStart) / 1000).toFixed(3);
    dbg > 1 && console.log(msg, `elapsed ${elapsed}s`);
    return bow;
  } // bowOfSegment

  async addReferenceSutta(suid) {
    const msg = 'd8r.addReferenceSutta';
    const dbg = DBG.D8R_ADD_REFERENCE_SUTTA;
    let { tfidfSpace } = this;
    let { corpus } = tfidfSpace;
    let mld = await this.fetchMLDoc(suid);
    let { segMap } = mld;
    let scids = Object.keys(segMap);
    let alignableRef = Alignable.fromList(scids, tfidfSpace, {
      listText: (scid) => segMap[scid].pli,
      listRef: (i) => scids[i],
    });
    //biome-ignore format:
    if (dbg) {
      let { groups, items } = alignableRef;
      items.forEach((item) => {
        let { id, ref: scid, bow, groupId, pScore, text } = item;
        let group = groups[groupId];
        let { gScore } = group;
        cc.ok(msg+'+1', B_CYAN+scid+'@'+id+groupId, 
          gScore.toFixed(2)+'g');
      });
    }
    alignableRef.items.forEach((item, i) => {
      let { ref: scid, id, text, bow, groupId, pScore } = item;
      let seg = segMap[scid];
      let dpdBow = this.bowOfSegment(seg);
      let docInfo = tfidfSpace.addCorpusDocument(scid, dpdBow);
      item.dpdBow = dpdBow;
      item.nWords = docInfo.nWords;
      item.vDpd = tfidfSpace.tfidfOfBow(dpdBow);
      dbg > 1 && console.log(msg, 'item', i, item);
    });
    this.alignableRef = alignableRef;

    return alignableRef;
  } // addReferenceSutta

  async fetchMLDoc(sref) {
    const msg = 'd8r.fetchMLDoc:';
    const dbg = DBG.D8R_FETCH_MLDOC;
    let { sutta_uid, lang, author } = SuttaRef.create(sref);
    let { scvEndpoint } = this;
    let url = [
      scvEndpoint,
      'search',
      [
        [sutta_uid, lang, author].join('%2F'),
        '-da',
        author,
        '-ml1',
      ].join('%20'),
      lang,
    ].join('/');
    dbg && console.log(msg, '[1]url', url);
    try {
      let res = await fetch(url);
      let json = await res.json();
      let mld = json.mlDocs[0];
      return mld;
    } catch (e) {
      console.error(msg, e);
      throw e;
    }
  }
} // class DpdAligner
