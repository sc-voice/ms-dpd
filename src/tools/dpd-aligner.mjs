import assert from 'node:assert';
import { ScvMath, Text } from '@sc-voice/tools';
const { Interval, Fraction } = ScvMath;
const { 
  ColorConsole, Unicode, LegacyDoc, WordVector, TfidfSpace 
} = Text;
import { SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from '../defines.mjs';
import Dictionary from '../dictionary.mjs';
let dpdAlignerCtor;

// biome-ignore format:
const {
  GREEN_CHECKBOX, LEFT_ARROW, RIGHT_ARROW, CHECKMARK,
  ELLIPSIS, WARNING, RED_X,
} = Unicode;
// biome-ignore format:
const {
  BLACK, WHITE, RED, GREEN, BLUE, CYAN, MAGENTA, YELLOW,
  BRIGHT_BLACK, BRIGHT_WHITE, BRIGHT_RED, BRIGHT_GREEN,
  BRIGHT_BLUE, BRIGHT_CYAN, BRIGHT_MAGENTA, BRIGHT_YELLOW,
  NO_COLOR:NC,
} = Unicode.LINUX_COLOR;
const PLI_CHARS = 30;

const cc = new ColorConsole();

export class AlignmentItem {
  constructor(opts = {}) {
    let {
      id, // line number or scid
      text, // text to align (e.g., fr)
      bow, // word frequency of text
      groupId, // grouped items are template-similar across sutta
      pScore = 0, // similarity with previous item
    } = opts;

    Object.assign(this, { id, text, bow, groupId, pScore });
  }

  toString() {
    let keys = Object.keys(this).sort((a, b) => a.localeCompare(b));
    let entries = keys.reduce((a, k) => {
      let v = this[k];
      let sk = `\n  ${k}:${GREEN}`;
      if (v instanceof WordVector) {
        a.push(`${sk}${v.toString({})}${NC}`);
      } else {
        a.push(`${sk}${v}${NC}`);
      }
      return a;
    }, []);
    return `{${entries.join('')}}`;
  }
}

export class AlignmentGroup {
  constructor(opts = {}) {
    let { id, bow, gScore, itemIds = [] } = opts;

    if (gScore == null) {
      gScore = 1;
    }

    Object.assign(this, { id, bow, itemIds, gScore });
  }

  //biome-ignore format:
  static rangedString(numbers) {
    const msg = 'a12p.rangedString:';
    const dbg = DBG.A12P_RANGE_STRING;
    let rangeStart = null;
    let rangeLast = null;
    let range2String = (low,high)=>{
      let sRange = ''+low;
      if (low !== high) {
        sRange += '-';
        let sHigh = high+'';
        for (let i = 0; i < sHigh.length; i++) {
          if (sRange[i] !== sHigh[i]) {
            sRange += sHigh.substring(i);
            break;
          }
        }
      }
      return sRange;
    }
    numbers.sort((a,b)=>a-b);
    let rs = numbers.reduce((a, n) => {
      if (rangeStart == null) {
        rangeStart = rangeLast = n;
        dbg && console.log(msg, '[1]null', {n, rangeStart, rangeLast});
      } else if (rangeLast + 1 === n) {
        rangeLast++;
        dbg && console.log(msg, '[2]+1', { n, rangeStart, rangeLast });
      } else {
        let idPart = range2String(rangeStart, rangeLast);
        a += (a ? `.${idPart}` : idPart);
        rangeStart = rangeLast = n;
        dbg && console.log(msg, '[3]idPart',
          {n, idPart, rangeStart, rangeLast});
      }
      return a;
    }, '');
    if (rangeStart != null) {
      let idPart = range2String(rangeStart, rangeLast);
      dbg && console.log(msg, '[5]idPart', 
        {idPart, rangeStart, rangeLast});
      rs += rs ? `.${idPart}` : idPart;
    }
    dbg && console.log(msg, '[6]rs', rs, numbers);

    return rs;
  }

  get delta() {
    let { itemIds } = this;
    return itemIds.length == 1
      ? 1
      : itemIds[1] - itemIds[0];
  }
}

export class Alignable {
  static #privateCtor;
  constructor(opts = {}) {
    const msg = 'a7e.ctor:';
    if (!Alignable.#privateCtor) {
      throw new Error(`${msg} fromList()?`);
    }
    Object.assign(this, opts);
  }

  static fromList(list, tfidfSpace, opts = {}) {
    const msg = 'a7e.fromList:';
    const dbg = DBG.A7E_FROM_LIST;
    if (list == null) {
      throw new Error(`${msg} list?`);
    }
    if (tfidfSpace == null) {
      throw new Error(`${msg} tfidfSpace?`);
    }
    let {
      groupThreshold = 0.5,
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
      a7e.groupSimilar();
      return a7e;
    } catch (e) {
      console.error(msg, e);
      throw e;
    } finally {
      Alignable.#privateCtor = false;
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
  // biome-ignore format:
  groupSimilar() {
    const msg = 'a7e.groupSimilar:';
    const dbg = DBG.A7E_GROUP_SIMILAR;
    let { items, tfidfSpace: ts, groupThreshold } = this;
    let nitems = items.length;
    const msStart = Date.now();
    for (let i = 0; i < nitems; i++) {
      let { id, bow: iBow, group: group_i } = items[i];
      if (group_i == null) {
        let itemIds = [i+1];
        group_i = new AlignmentGroup({itemIds});
        items[i].group = group_i;
        group_i.bows = [iBow]; // temporary;
      }
      for (let j = i + 1; j < nitems; j++) {
        let { bow: jBow, group: group_j } = items[j];
        if (group_j == null) {
          let gScore = iBow.similar(jBow);
          if (groupThreshold <= gScore) {
            let groupBows = group_i.bows;
            group_i.itemIds.push(j + 1);
            group_i.bows.push(jBow);
            group_i.gScore = group_i.gScore 
              ? Math.min(group_i.gScore, gScore)
              : gScore;
            items[j].group = group_i;
            dbg>1 && console.log(msg, 
              {i, j, gScore, 
              bows: group_i.bows.length,
              itemIds: group_i.itemIds,
            });
          }
        }
      }
    }
    this.groups = items.reduce((ag, item, ig) => {
      let { group } = item;
      let groupId =
        'G' + AlignmentGroup.rangedString(item.group.itemIds);
      item.groupId = groupId;
      delete item.group;
      group.id = groupId;
      if (ag[groupId] == null) {
        group.itemIds.sort((a,b) => a-b);
        ag[groupId] = group;
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
          group.bow = mask.multiply(bowSum).scale(1/n);
          delete group.bows;
        }
      }
      return ag;
    }, {});
    if (dbg) {
      Object.entries(this.groups).forEach(entry=>{
        let [ id, group ] = entry;
        let { bow, gScore } = group;
        let show = { id };
        if (gScore != null) {
          show.gScore = gScore.toFixed(5);
        }
        console.log(msg, show);
      });
    }
    let elapsed = ((Date.now() - msStart) / 1000).toFixed(3);
    dbg && console.log(msg, { elapsed });

    return this;
  } // groupSimilar

  itemGroup(item) {
    let { groups, items } = this;
    return groups[item.groupId];
  }

  item2GroupShadow(item) {
    const msg = 'a7e.item2GroupShadow';
    const dbg = DBG.A7E_ITEM_2_GROUP_SHADOW;;
    let { items } = this;
    let interval;
    let { id, groupId } = item;
    dbg>1 && cc.fyi(msg+'.1', { id, groupId });
    for (let i = 0; !interval && i < items.length; i++) {
      let iItem = items[i];
      let group = this.itemGroup(iItem);
      let { itemIds: gItemIds, delta } = group;
      if (1 < delta) {
        dbg>1 && cc.fyi(msg+'.2', 
          {id:iItem.id, group:iItem.groupId, delta});
      }
      let gLo = gItemIds[0];
      let gEnd = gItemIds.at(-1)+delta;
      if (gLo <= item.id && item.id < gEnd) {
        dbg>1 && cc.ok(msg+'+2 iItem', 
          {id:iItem.id, group:iItem.groupId, delta});
        for (let j = 0; j < gItemIds.length; j++) {
          let jid = gItemIds[j];
          let nid = jid+delta;
          if (jid <= item.id && item.id < nid) {
            interval = new Interval(jid, nid-1);
            dbg && cc.ok1(msg+'+3', interval.toString());
          } else {
            dbg>1 && cc.fyi(msg+'.3', { id, jid, nid, delta });
          }
        }
      } else {
        let LINE_TO_INDEX = 1;
        i = gEnd - 1 - LINE_TO_INDEX; // skip over all resolved groups
        dbg>1 && cc.fyi(msg+'.4', {id, gLo, gEnd });
      }
      if (iItem === item) {
        if (interval == null) {
          interval = new Interval(gLo, gHi);
          dbg && cc.ok(msg+'+4', interval.toString(), interval);
        }
        break;
      }
    }
    if (interval == null) {
      dbg && cc.bad(msg+'-1', item);
    }

    return interval;
  } // item2GroupShadow
} // Alignable

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
    let refInfo = `${BRIGHT_CYAN}${scid}${refGrpId}${NC}`;
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

  toString() {
    const msg = 's7e.toString():';
    const dbg = DBG.S7E_TO_STRING;
    let keys = Object.keys(this).sort((a, b) => a.localeCompare(b));
    let result = keys.reduce((a, k) => {
      let v = this[k];
      if (k === 'vDpdSrc') {
        v = v.toString({ precision: 6 });
      } else if (v instanceof WordVector) {
        if (dbg < 1) {
          return a;
        }
        v = v.toString();
      } else if (k === 'segCursor') {
        v = v?.toString();
      }
      a[k] = v;
      return a;
    }, {});
    return result;
  }
}

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
        dbg && console.log(`${BRIGHT_GREEN}${msg}@1`, 
          `${CYAN}${srcId}${srcGrp.id}`,
          `${BRIGHT_CYAN}${scid}${refGrp.id}`,
          `alignable src:${srcGid} ref:${refGid} idx:${srcIdx}`,
          NC);
        alignable = true;
      } else {
        //biome-ignore format:
        dbg && console.log(`${RED}${msg}@-1`, 
          `${CYAN}${srcId}${srcGrp.id}`,
          `${BRIGHT_CYAN}${scid}${refGrp.id}`,
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
    const dbg = DBG.S5R_SCAN_TEXT;
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
    dbg>1 && console.log(`${msg}@0.1 srcText`, sr.scanSummary(refStart),
      `${GREEN}${srcText.substring(0,dbgTextChars)}${NC}`);
    let streakFirst = null;
    let streakStop = null;
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
          startStreak(); // move streak to new start
          dbg>1 && sr.dbgLog(msg, '@2', '!', refItem, BRIGHT_WHITE);
        } else { // grow streak
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
      dbg && sr.dbgLog(msg, '@-1', RED_X, null, BRIGHT_RED);
      return null;
    }

    segCursor.numerator += sr.iScan + sr.streakSize;
    dbg && sr.dbgLog(msg, '@5', `${CHECKMARK}${sr.streakSize}`, 
      null, BRIGHT_GREEN);

    return sr;
  }
}

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
      minScore = 0.09, // minimum alignment scoreDpdSrc
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
        dbg && console.log(msg, '[1]!addReferenceSutta', sutta_uid);
        return alignableRef;
      }
      dbg && console.log(msg, '[2]addReferenceSutta', sutta_uid);
      await this.addReferenceSutta(sutta_uid);
      let fetchOpts = Object.assign(
        { cache },
        SuttaRef.create({ sutta_uid, lang, author }),
      );
      dbg && console.log(msg, '[3]fetchLegacy', fetchOpts);
      let legacyDoc = await LegacyDoc.fetchLegacy(fetchOpts);
      if (!(legacyDoc instanceof LegacyDoc)) {
        throw new Error(`${msg}legacyDoc?`);
      }
      let { lines } = legacyDoc;
      dbg && console.log(msg, '[4]lines', lines.length);
      let alignableSrc = Alignable.fromList(lines, ts, this);
      let { items } = alignableSrc;
      let scanner = new Scanner(this, alignableSrc);
      let { segCursor } = scanner;
      let done = lines.length < 1;
      for (let iSrc = 0; !done; iSrc++, done = iSrc >= lines.length) {
        let srcItem = items[iSrc];
        let { text: srcText } = srcItem;
        let line = iSrc + 1;
        let scanRes = scanner.scanItem(srcItem);
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
    if (dbg>1) {
      let { groups, items } = alignableRef;
      items.forEach((item) => {
        let { id, ref: scid, bow, groupId, pScore, text } = item;
        let group = groups[groupId];
        let { gScore } = group;
        console.log( `${msg}@1`, `${scid}#${id}`,
          `${CYAN}${groupId} ${gScore.toFixed(2)}g`,
          `${GREEN}${pScore.toFixed(2)}p`, 
          NC);
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
      dbg > 1 && console.log(msg, 'item', i, item.toString());
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
} // DpdAligner
