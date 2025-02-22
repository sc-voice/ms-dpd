import { ScvMath, Text } from '@sc-voice/tools';
const { Fraction } = ScvMath;
const { Unicode, LegacyDoc, WordVector, TfidfSpace } = Text;
import { SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from '../defines.mjs';
import Dictionary from '../dictionary.mjs';
let dpdAlignerCtor;
let alignableItemsCtor;

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
  NO_COLOR,
} = Unicode.LINUX_COLOR;

export class AlignmentItem {
  constructor(opts = {}) {
    let { 
      id, // line number or scid
      text, // text to align (e.g., fr)
      bow,  // word frequency of text
      groupId, // grouped items are template-similar across sutta
      pScore=0, // similarity with previous item
    } = opts;

    Object.assign(this, { id, text, bow, groupId, pScore });
  }
}

export class AlignmentGroup {
  constructor(opts = {}) {
    let { 
      id, 
      bow, 
      gScore,
      itemIds = [],
    } = opts;

    Object.assign(this, { id, bow, itemIds, gScore });
  }

  //biome-ignore format:
  static rangedString(numbers) {
    const msg = 'a12p.rangedString:';
    const dbg = DBG.A12P_RANGE_STRING;
    let rangeStart = null;
    let rangeLast = null;
    numbers.sort((a,b)=>a-b);
    let rs = numbers.reduce((a, n) => {
      if (rangeStart == null) {
        rangeStart = rangeLast = n;
        dbg && console.log(msg, '[1]null', {n, rangeStart, rangeLast});
      } else if (rangeLast + 1 === n) {
        rangeLast++;
        dbg && console.log(msg, '[2]+1', { n, rangeStart, rangeLast });
      } else {
        let idPart = rangeStart === rangeLast
          ? rangeStart
          : `${rangeStart}-${rangeLast}`;
        a += (a ? `_${idPart}` : idPart);
        rangeStart = rangeLast = n;
        dbg && console.log(msg, '[3]idPart',
          {n, idPart, rangeStart, rangeLast});
      }
      return a;
    }, '');
    if (rangeStart != null) {
      let idPart = rangeStart === rangeLast
        ? rangeStart
        : `${rangeStart}-${rangeLast}`;
      dbg && console.log(msg, '[5]idPart', 
        {idPart, rangeStart, rangeLast});
      rs += rs ? `_${idPart}` : idPart;
    }
    dbg && console.log(msg, '[6]rs', rs, numbers);

    return rs;
  }
}

export class AlignableItems {
  constructor(opts = {}) {
    const msg = 'u11s.ctor:';
    if (!alignableItemsCtor) {
      throw new Error(`${msg} fromLines()?`);
    }
    Object.assign(this, opts);
  }

  static fromLines(lines, aligner) {
    const msg = 'u11s.fromLines:';
    const dbg = DBG.U11S_FROM_LINES;
    if (lines == null) {
      throw new Error(`${msg} lines?`);
    }
    if (aligner == null) {
      throw new Error(`${msg} aligner?`);
    }
    let { tfidfSpace, groupThreshold } = aligner;
    let items = [];
    for (let i = 0; i < lines.length; i++) {
      let id = i+1; // line number
      let text = lines[i];
      let bow = tfidfSpace.bowOfText(text);
      let pScore = i>0 ? bow.similar(items[i-1].bow) : 0;
      let newItem = new AlignmentItem({ id, text, bow, pScore });
      items.push( newItem );
    }

    try {
      alignableItemsCtor = true;
      let ut = new AlignableItems({
        tfidfSpace,
        groupThreshold,
        items,
      });
      ut.groupSimilar();
      return ut;
    } catch (e) {
      console.error(msg, e);
      throw e;
    } finally {
      alignableItemsCtor = false;
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
    const msg = 'u11s.groupSimilar:';
    const dbg = DBG.U11S_GROUP_SIMILAR;
    let { aligner, items, tfidfSpace: ts, groupThreshold } = this;
    let nitems = items.length;
    const msStart = Date.now();
    for (let i = 0; i < nitems; i++) {
      let { id, bow: iBow, group: group_i } = items[i];
      if (group_i == null) {
        items[i].group = group_i = new AlignmentGroup({
          itemIds: [id],
          bow: iBow,
        });
      }
      for (let j = i + 1; j < nitems; j++) {
        let { bow: jBow, group: group_j } = items[j];
        if (group_j == null) {
          let gScore = iBow.similar(jBow);
          if (groupThreshold <= gScore) {
            let ij = iBow.intersect(jBow);
            let intersect = ij.toString();
            group_i.itemIds.push(j + 1);
            group_i.bow = group_i.bow.intersect(jBow);
            group_i.gScore = group_i.gScore 
              ? Math.min(group_i.gScore, gScore)
              : gScore;
            items[j].group = group_i;
            dbg>1 && console.log(msg, {i, j, gScore, intersect});
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
      group.itemIds.sort();
      ag[groupId] = group;
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
} // AlignableItems

class ScanResult {
  constructor(opts = {}) {
    Object.assign(this, opts);
  }

  toString() {
    let { vText, iScan, scid, vRef, segCursor } = this;
    return {
      vText: vText?.toString(),
      scid,
      vRef: vRef?.toString(),
      segCursor: segCursor?.toString(),
    };
  }
}

export class Scanner {
  constructor(aligner, scids) {
    const msg = 's5r.ctor:';
    let nSegs = scids.length;
    let segCursor = new Fraction(0, nSegs, 'segs');

    Object.assign(this, {
      aligner,
      scids,
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
  scanItem(item) {
    const msg = 's5r.scanItem:';
    const dbg = DBG.S5R_SCAN_TEXT;
    let {
      aligner,
      tfidfSpace: ts,
      scids,
      segCursor,
      minScanSize,
      maxScanSize,
      minScore,
      maxStreak,
      streakStart,
    } = this;
    if (!(item instanceof AlignmentItem)) {
      throw new Error(`{$msg} AlignmentItem?`);
    }

    let { id:line } = item;
    let text = this.trimWords(item.text);
    let vText = ts.tfidfOfBow(item.bow);
    let result = new ScanResult({
      vText,
      segCursor,
      scanScore: 0,
    });
    let scanning = (i) =>
      i < maxScanSize &&
      (i < minScanSize || result.scanScore < minScore) &&
      streakSize < maxStreak;
    let scid;
    let iScanStart = segCursor.numerator;
    dbg>1 && console.log( msg, `[0.1]text#${line}`,
        segCursor.toString(), `${GREEN}${text}${NO_COLOR}`);
    dbg>2 && console.log(msg, '[0.2]vText', vText);
    let streakSize = 0;
    for (let iScan = 0; scanning(iScan); iScan++) {
      scid = scids[iScanStart + iScan];
      let docInfo = aligner.docInfo(scid);
      let vRef = aligner.docVector(scid);
      let scanScore = vText.similar(vRef);
      if (dbg>2) {
        let intersect = vRef.intersect(vText);
        console.log( msg, '[0.3]intersect',
          intersect.toString({ precision: 5 }));
      }
      if (minScore <= scanScore) {
        if (streakSize === 0) { // start a streak
          streakSize++;
          Object.assign(result, { docInfo, iScan, scid, scanScore,
            streakSize, vRef, });
          dbg>1 && console.log( msg, [
            '[1]  ', YELLOW, line, ':', CHECKMARK, scid,
            ' ', scanScore.toFixed(3), ' ', docInfo.pli.substring(0, 40),
              NO_COLOR, 
          ].join(''),);
        } else if ( /*!vText.__lquote && */
          result.scanScore * streakStart < scanScore
        ) {
          result.streakSize = streakSize = 1;
          Object.assign(result, { docInfo, iScan, scid, scanScore,
            streakSize, vRef, });
          dbg>1 && console.log( msg, [
            '[2]  ', BRIGHT_WHITE, line, ':!', scid, ' ',
            scanScore.toFixed(3), ' ',
            docInfo.pli.substring(0, 40), NO_COLOR,
          ].join(''));
        } else {
          result.streakSize = ++streakSize;
          dbg>1 && console.log( msg, [
            '[3]  ', YELLOW, line, ':+', scid, ' ',
            scanScore.toFixed(3), ' ',
            docInfo.pli.substring(0, 40), NO_COLOR,
          ].join(''));
        }
      } else if (result.scanScore <= scanScore) {
        dbg>2 && console.log( msg, [
          '[0.4]', line, ':>', scid, ' ', scanScore.toFixed(3), ' ',
          CYAN, docInfo.pli.substring(0, 40), NO_COLOR,
        ].join(''));
      } else {
        dbg>2 && console.log( msg, [
          '[0.5]', BRIGHT_BLACK, iScan, ': ', scid, ' ',
          scanScore.toFixed(3), ' ',
          docInfo.pli.substring(0, 40), NO_COLOR,
        ].join(''));
      }
    } // scanning
    if (result.scanScore < minScore) {
      dbg && console.log( msg, [ 
        '[-1] ', RED, result.iScan, RED_X, result.scid, ' ',
        result.scanScore.toFixed(3), ' ', scoreInfo.pli, NO_COLOR,
      ].join(''));
      return null;
    }

    segCursor.numerator += result.iScan + result.streakSize;
    dbg && console.log( msg, [
      '[4]  ', line, GREEN_CHECKBOX, result.scid, ' ',
      result.scanScore.toFixed(3), ' ', `streak:${result.streakSize} `,
      result.docInfo.pli,
    ].join(''));

    return result;
  }
}

export class DpdAligner {
  constructor(opts = {}) {
    const msg = 'd8r.ctor:';
    if (!dpdAlignerCtor) {
      throw new Error(`$msgcreate?`);
    }
    Object.assign(this, opts);
  }

  static async createSuttaAligner(sref, opts = {}) {
    const msg = 'd8r.createSuttaAligner:';
    const dbg = DBG.D8R_CREATE;
    let { sutta_uid, lang, author } = SuttaRef.create(sref);
    // Required
    if (sutta_uid == null) {
      throw new Error(`$msgsutta_uid?`);
    }
    if (lang == null) {
      throw new Error(`$msglang?`);
    }
    if (author == null) {
      throw new Error(`$msgauthor?`);
    }
    let {
      // Optional
      dbgScid, // print out info for this SCID
      maxScanSize = 40, // maximum segments to scan for alignment
      minScanSize = 4, // minimum number of segments to scan
      maxStreak = 2, // maximum segment matches for 1 line
      minScore = 0.1, // minimum alignment scanScore
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
      dbg && console.log(msg, `elapsed $elapseds`);
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
      console.error(`$msg$e.message`);
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
    let {
      cache,
    } = opts;
    let {
      sutta_uid,
      lang,
      author,
      maxScanSize,
      minScanSize,
      minScore,
      tfidfSpace: ts,
    } = this;
    let { corpus } = ts;

    try {
      dbg && console.log(msg, '[1]addCorpusSutta', sutta_uid);
      await this.addCorpusSutta(sutta_uid);
      let scids = this.corpusIds();
      let scanner = new Scanner(this, scids);
      let { segCursor } = scanner;
      let fetchOpts = Object.assign({ cache },
        SuttaRef.create({ sutta_uid, lang, author }));
      dbg && console.log(msg, '[2]fetchLegacy', fetchOpts);
      let legacyDoc = await LegacyDoc.fetchLegacy(fetchOpts);
      if (!(legacyDoc instanceof LegacyDoc)) {
        throw new Error(`$msglegacyDoc?`);
      }
      let { lines } = legacyDoc;
      dbg && console.log(msg, '[3]lines', lines.length);
      let uTexts = AlignableItems.fromLines(lines, this);
      let { items } = uTexts;
      let done = lines.length < 1;
      for (let iSrc = 0; !done; iSrc++, done = iSrc >= lines.length) {
        let item = items[iSrc];
        let { text } = item;
        let line = iSrc + 1;
        let scanRes = scanner.scanItem(item);
        if (scanRes == null) {
          break;
        }
        yield Object.assign(scanRes, { line, text });
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

  corpusIds() {
    return Object.keys(this.corpus.docMap);
  }

  queryVector(text) {
    let { tfidfSpace: ts, corpus } = this;
    return ts.tfidf(text);
  }

  docInfo(docId) {
    return this.corpus.getDocument(docId);
  }

  docVector(docId) {
    const msg = 'd8r.docVector:';
    let { tfidfSpace: ts } = this;
    let docInfo = this.docInfo(docId);
    if (docInfo == null) {
      throw new Error(`$msgdocId? ${docId}`);
    }
    let { vector, bow } = docInfo;
    if (vector == null) {
      vector = ts.tfidfOfBow(bow);
      docInfo.vector = vector;
    }
    return vector;
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
    dbg > 1 && console.log(msg, `elapsed $elapseds`);
    return bow;
  } // bowOfSegment

  async addCorpusSutta(suid) {
    const msg = 'd8r.addCorpusSutta:';
    const dbg = DBG.D8R_ADD_CORPUS_SUTTA;
    let { tfidfSpace } = this;
    let { corpus } = tfidfSpace;
    let mld = await this.fetchMLDoc(suid);
    let { segMap } = mld;
    let scids = Object.keys(segMap);
    scids.forEach((scid, i) => {
      let seg = segMap[scid];
      let { pli } = seg;
      let bow = this.bowOfSegment(seg);
      let info = tfidfSpace.addCorpusDocument(scid, bow);
      info.pli = pli;
      dbg &&
        console.log(msg, `[1]seg[$i]`, scid, `$info.nWordsw`, pli);
    });

    return this;
  }

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
      //`$sutta_uid%20-dl%20$lang%20-da%20$author%20-ml1`,
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
