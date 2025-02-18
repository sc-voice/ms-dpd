import { ScvMath, Text } from '@sc-voice/tools';
const { Fraction } = ScvMath;
const { Unicode, LegacyDoc, WordVector, TfidfSpace } = Text;
import { SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from '../defines.mjs';
import Dictionary from '../dictionary.mjs';
let dpdAlignerCtor;

const {
  GREEN_CHECKBOX,
  LEFT_ARROW,
  RIGHT_ARROW,
  CHECKMARK,
  ELLIPSIS,
  WARNING,
  RED_X,
} = Unicode;
const {
  BLACK,
  WHITE,
  RED,
  GREEN,
  BLUE,
  CYAN,
  MAGENTA,
  YELLOW,
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

class ScanResult {
  constructor(opts={}) {
    Object.assign(this, opts);
  }

  toString() {
    let { vText, iScan, scid, vRef, segCursor } = this;
    return {
      vText: vText?.toString(),
      scid,
      vRef: vRef?.toString(),
      segCursor: segCursor?.toString(),
    }  
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

  get tfidfSpace() { return this.aligner.tfidfSpace; }
  get minScore() { return this.aligner.minScore; }
  get maxScanSize() { return this.aligner.maxScanSize; }
  get minScanSize() { return this.aligner.minScanSize; }

  scanText(text) {
    const msg = 's5r.scanText:';
    const dbg = DBG.S5R_SCAN_TEXT;
    let { 
      aligner, tfidfSpace:ts, scids, segCursor,
      minScanSize, maxScanSize, minScore,
    } = this;
    let vText = ts.tfidf(text);
    let result = new ScanResult({ vText, segCursor, score: 0 });
    let scanning = (i) =>
      i < maxScanSize && (i < minScanSize || result.score < minScore);
    let scid;
    dbg && console.log(msg, '[1]text', `${GREEN}${text}${NO_COLOR}`);
    let iScanStart = segCursor.numerator;
    for (let iScan = 0; scanning(iScan); iScan++) {
      scid = scids[iScanStart + iScan];
      let docInfo = aligner.docInfo(scid);
      let vRef = aligner.docVector(scid);
      let score = vText.similar(vRef);

      if (result.score < score) {
        Object.assign(result, {score, scid, docInfo, vRef, iScan});
        dbg && console.log(msg, `[2]  ${scid}`, [
          YELLOW, 
          score.toFixed(3), ' ', docInfo.pli.substring(0,40), ELLIPSIS,
          NO_COLOR,
        ].join(''));
      } else {
        dbg && console.log(msg, `[2.1]${scid}`, [
          BRIGHT_BLACK, 
          score.toFixed(3), ' ', docInfo.pli.substring(0,40), ELLIPSIS, 
          NO_COLOR
        ].join(''));
      }
    }
    if (result.score < minScore) {
      segCursor.numerator += result.iScan;
      dbg && console.log(msg, `[3]${result.scid}`, 
        result.score.toFixed(3), 
        RED_X, `${RED}${scoreInfo.pli}${NO_COLOR}`);
      return null;
    } 

    segCursor.numerator += iScanStart;
    dbg && console.log(msg, `[4]${result.scid}`, 
      result.score.toFixed(3), 
      GREEN_CHECKBOX, `${GREEN}${result.docInfo.pli}${NO_COLOR}`);

    return result;
  }

}

export class DpdAligner {
  constructor(opts = {}) {
    const msg = 'd8r.ctor:';
    if (!dpdAlignerCtor) {
      throw new Error(`${msg} create?`);
    }
    Object.assign(this, opts);
  }

  static async createSuttaAligner(sref, opts = {}) {
    const msg = 'd8r.createSuttaAligner:';
    const dbg = DBG.D8R_CREATE;
    let { sutta_uid, lang, author } = SuttaRef.create(sref);
    // Required
    if (sutta_uid == null) {
      throw new Error(`${msg} sutta_uid?`);
    }
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    if (author == null) {
      throw new Error(`${msg} author?`);
    }
    let {
      // Optional
      dbgScid, // print out info for this SCID
      //groupDecay = 0.5, // group exponential decay
      //groupSize = 1, // comparison group size
      maxScanSize = 40, // maximum segments to scan for alignment
      minScanSize = 5, // minimum number of segments to scan
      minScore = 0.1, // minimum alignment score
      //normalizeVector,
      //tfidfSpace,
    } = opts;

    // possible future options
    let tfidfSpace;
    if (tfidfSpace == null) {
      let normalizeText;
      // normalizeText = DpdAligner.normalizeFR_DEPRECATED;
      tfidfSpace = new TfidfSpace({ lang, normalizeText });
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
        //alignMethod: 'alignPali',
        //authorAligned: 'ms',
        sutta_uid,
        author,
        //dbgScid,
        msdpd,
        //groupDecay,
        //groupSize,
        lang,
        maxScanSize,
        minScanSize,
        minScore,
        //minWord: 1,
        //normalizeVector,
        scvEndpoint: 'https://www.api.sc-voice.net/scv',
        tfidfSpace,
      });
      return aligner;
    } catch (e) {
      console.error(`${msg} ${e.message}`);
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
      .replace(/\bc[’']/gi, 'c_');
    return TfidfSpace.removeNonWords(sAbbr);
  }

  async *alignLegacySutta(opts = {}) {
    const msg = 'd8r.alignLegacySutta:';
    const dbg = DBG.D8R_ALIGN_SUTTA;
    let { 
      sutta_uid, lang, author, 
      maxScanSize, minScanSize, minScore,
      tfidfSpace:ts,
    } = this;
    let { corpus } = ts;

    try {
      dbg && console.log(msg, '[1]addCorpusSutta', sutta_uid);
      await this.addCorpusSutta(sutta_uid);
      let scids = this.corpusIds();
      let scanner = new Scanner(this, scids);
      let { segCursor } = scanner;
      let sref = SuttaRef.create({sutta_uid, lang, author});
      dbg && console.log(msg, '[2]fetchLegacy', sref.toString());
      let legacyDoc = await LegacyDoc.fetchLegacy(sref);
      if (!(legacyDoc instanceof LegacyDoc)) {
        throw new Error(`${msg} legacyDoc?`);
      }
      let { lines } = legacyDoc;
      dbg && console.log(msg, '[3]lines', lines.length);
      let done = lines.length < 1;
      for (let iSrc = 0; !done; iSrc++, done = iSrc >= lines.length) {
        let text = lines[iSrc];
        let line = iSrc + 1;
        let scanRes = scanner.scanText(text);
        if (scanRes == null) {
          break;
        }
        yield Object.assign(scanRes, {line,text});
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
    let { tfidfSpace:ts, corpus } = this;
    return ts.tfidf(text);
  }

  docInfo(docId) {
    return this.corpus.getDocument(docId);
  }

  docVector(docId) {
    const msg = 'd8r.docVector:';
    let { tfidfSpace:ts } = this;
    let docInfo = this.docInfo(docId);
    if (docInfo == null) {
      throw new Error(`${msg} docId? ${docId}`);
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
    dbg > 1 && console.log(msg, `elapsed ${elapsed}s`);
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
        console.log(
          msg,
          `[1]seg[${i}]`,
          scid,
          `${info.nWords}w`,
          pli,
        );
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
      //`${sutta_uid}%20-dl%20${lang}%20-da%20${author}%20-ml1`,
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
