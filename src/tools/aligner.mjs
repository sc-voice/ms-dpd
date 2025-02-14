import { ScvMath, Text } from '@sc-voice/tools';
import { DBG } from '../defines.mjs';
const { Fraction } = ScvMath;
const {
  EbtDoc,
  LegacyDoc,
  SuttaCentralId,
  Unicode,
  WordMapTransformer,
  WordSpace,
} = Text;

const STATE_OK = 'ok';
const STATE_WARN = 'warn';
const STATE_ERROR = 'error';
const STATE_DONE = 'done';
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
  NO_COLOR,
} = Unicode.LINUX_COLOR;

let alignmentCtor = false;

class PaliTransformer {
  constructor(transformer) {
    let { wordMap } = transformer;
    this.transformer = transformer;

    let reList;
    let entries = Object.entries(wordMap);
    reList = entries.reduce((a, e) => {
      let [legacyText, paliText] = e;
      if (paliText) {
        a.set(paliText, new RegExp(`\\b${paliText}`, 'gi'));
      }
      return a;
    }, new Map());
    this.reList = reList;
  }

  get wordMap() {
    return this.transformer.wordMap;
  }

  transform(text) {
    const msg = 'P14r.transform';
    const dbg = DBG.PALI_TRANSFORMER;
    let { transformer } = this;
    dbg && console.log(msg, text);
    return transformer.transform(text);
  }

  normalize(text) {
    const msg = 'P14r.normalize';
    const dbg = DBG.PALI_TRANSFORMER;
    let { transformer } = this;
    dbg && console.log(msg, text);
    return transformer.normalize(text);
  }
}

export class DpdTransformer {
  constructor(opts = {}) {
    const msg = 'D12r.ctor:';
    let { dictionary } = opts;
    if (dictionary == null) {
      throw new Error(`${msg} dictionary?`);
    }

    this.dictionary = dictionary;
  }

  transform(text) {
    return text;
  }

  normalize(text) {
    return text;
  }
}

export class Aligner {
  constructor(opts = {}) {
    const msg = 'a4r.ctor:';
    let {
      alignMethod = 'alignPali',
      authorAligned, // author of segment aligned document
      authorLegacy, // author of legacy document
      dbgScid,
      groupDecay = 0.5, // group exponential decay
      groupSize = 1, // comparison group size
      lang, // 2-letter ISO language (en, fr, es, pt)
      maxScanSize, // maximum segments to scan for alignment
      minScanSize = 5, // minimum number of segments to scan
      minScore = 0.1, // minimum alignment score
      minWord,
      normalizeVector,
      scvEndpoint = 'https://www.api.sc-voice.net/scv',
      wordSpace,
    } = opts;
    if (wordSpace == null) {
      wordSpace = new WordSpace({
        lang,
        minWord,
        normalizeVector,
      });
    }
    if (alignMethod === 'alignPali') {
      wordSpace.transformer = new PaliTransformer(
        wordSpace.transformer,
      );
    }
    if (lang == null) {
      lang = wordSpace.lang;
    }

    Object.assign(this, {
      alignMethod,
      authorAligned,
      authorLegacy,
      dbgScid,
      groupSize,
      groupDecay,
      lang,
      minScore,
      minScanSize,
      maxScanSize,
      scvEndpoint,
      wordSpace,
    });
  }

  async fetchMLDoc(scid) {
    const msg = 'Aligner.fetchMLDoc:';
    let { lang, scvEndpoint, authorAligned } = this;
    let url = [
      scvEndpoint,
      'search',
      `${scid}%20-da%20${authorAligned}%20-ml1`,
      lang,
    ].join('/');
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

  createAlignment(opts = {}) {
    const msg = 'A7t.createAlignment:';
    const dbg = DBG.CREATE_ALIGNMENT;
    let {
      dbgScid = this.dbgScid,
      legacyDoc,
      mlDoc,
      minScore = this.minScore,
      minScanSize = this.minScanSize,
      maxScanSize = this.maxScanSize,
      scidsExp,
    } = opts;
    let { lang } = this;
    if (!(legacyDoc instanceof LegacyDoc)) {
      throw new Error(`${msg} legacyDoc?`);
    }
    if (mlDoc == null) {
      throw new Error(`${msg} mlDoc?`);
    }

    let { author, author_uid, lines, footer } = legacyDoc;
    let nLines = lines.length;
    let lineCursor = new Fraction(0, nLines, 'lines');
    let scids = Object.keys(mlDoc.segMap);
    let nSegs = scids.length;
    scids.sort(SuttaCentralId.compareLow);
    let segCursor = new Fraction(0, nSegs, 'segs');
    if (nSegs < nLines) {
      throw new Error(`${msg} nSegs:${nSegs} < nLines:${nLines}?`);
    }
    if (maxScanSize == null) {
      maxScanSize = Math.ceil(Math.max(1, (nSegs - nLines) * 0.8));
    }
    if (minScanSize < 1) {
      throw new Error(`${msg} minScanSize? ${minScanSize} `);
    }

    let { sutta_uid: suid, docAuthor, bilaraPaths } = mlDoc;
    let bilaraPath = bilaraPaths.reduce((a, p) => {
      if (p.includes(docAuthor)) {
        a = p.replaceAll(docAuthor, author_uid);
      }
      return a;
    });
    let docOpts = {
      suid,
      lang,
      author,
      author_uid,
      bilaraPath,
      footer,
    };

    const optsAlignment = {
      aligner: this,
      dbgScid,
      ebtDoc: EbtDoc.create(docOpts),
      legacyDoc,
      lineCursor,
      mlDoc,
      minScore,
      minScanSize,
      maxScanSize,
      scids,
      scidsExp,
      segCursor,
      vMLDoc: this.mlDocVectors(mlDoc),
    };
    alignmentCtor = true;
    let alignment = new Alignment(optsAlignment);
    alignmentCtor = false;

    return alignment;
  }

  mlDocVectors(mld) {
    const msg = 'Aligner.mlDocVectors';
    const dbg = DBG.ML_DOC_VECTORS;
    let { alignMethod, groupDecay, groupSize, wordSpace } = this;
    let { wordMap } = wordSpace.transformer;
    let { segMap, lang } = mld;
    let segs = Object.entries(segMap);
    let iLastSeg = segs.length - 1;
    let reList;

    if (alignMethod === 'alignPali') {
      let entries = Object.entries(wordMap);
      reList = entries.reduce((a, e) => {
        let [legacyText, paliText] = e;
        if (paliText) {
          a.set(paliText, new RegExp(`\\b${paliText}`, 'gi'));
        }
        return a;
      }, new Map());
    }

    let vectorMap = {};
    let segGroup = [];
    for (let i = segs.length; i-- > 0; ) {
      let [scid, seg] = segs[i];
      let vGroup = new WordSpace.Vector();

      let { pli } = seg;
      let segData = seg[lang] || '';
      switch (alignMethod) {
        case 'alignPali':
          {
            // for aligning Pali, we add all Pali words that
            // occur in the Pali for a segment to the
            // vector input text
            let pliWords = [];
            reList.forEach((re, paliText, map) => {
              let nMatch = pli.match(re)?.length || 0;
              if (nMatch) {
                for (let i = 0; i < nMatch; i++) {
                  pliWords.push(paliText);
                }
              }
            });
            if (pliWords.length) {
              segData += ' ' + pliWords.join(' ');
              dbg === scid &&
                console.log(msg, 'segData', scid, segData);
            }
          }
          break;
        case 'DPD':
          break;
      }
      segGroup.unshift(segData);
      if (segGroup.length > groupSize) {
        segGroup.pop();
      }
      let scale = 1;
      vGroup = segGroup.reduce((a, seg, i) => {
        let vScale = wordSpace.string2Vector(segData, scale);
        scale *= groupDecay;
        return a.add(vScale);
      }, vGroup);
      vectorMap[scid] = vGroup;
    }
    return vectorMap;
  }
}

export class Alignment {
  constructor(opts = {}) {
    const msg = 'A7t.ctor:';
    if (!alignmentCtor) {
      throw new Error(`${msg} createAlignment()?`);
    }

    Object.assign(this, opts);

    Object.defineProperty(this, 'lang', {
      get: () => this.aligner.lang,
    });
    Object.defineProperty(this, 'state', {
      get: () => this.status.state,
    });
    Object.defineProperty(this, 'wordSpace', {
      get: () => this.aligner.wordSpace,
    });
    Object.defineProperty(this, 'status', {
      get: () => {
        let { legacyDoc, history } = this;
        if (history.length === 0) {
          let { uid, lang, author_uid } = legacyDoc;
          let text = `${uid}/${lang}/${author_uid} unaligned`;
          return new AlignmentStatus(this, { text });
        }
        return history.at(-1);
      },
    });

    this.history = [];
    let { legacyDoc } = this;
  }

  pushStatus(opts) {
    let status = new AlignmentStatus(this, opts);
    this.history.push(status);
    return status;
  }

  alignLine(legacyText, opts = {}) {
    const msg = 'A7t.alignLine:';
    const dbg = DBG.ALIGN_LINE;
    if (typeof opts !== 'object') {
      throw new Error(`${msg} opts?`);
    }
    let { dbgScid = this.dbgScid } = opts;
    // biome-ignore format:
    let { ebtDoc, legacyDoc, lineCursor, maxScanSize, minScanSize,
      minScore, mlDoc, scids, segCursor, vMLDoc, wordSpace,
    } = this;
    let vLegacy = wordSpace.string2Vector(legacyText);
    let scoreMax = 0;
    let segMap = mlDoc.segMap;
    let scoreId;
    let scanning = (i) =>
      i < maxScanSize && (i < minScanSize || scoreMax < minScore);
    for (let i = 0; scanning(i); i++) {
      let scid = scids[segCursor.numerator + i];
      if (scid == null) {
        console.log(error, '[1]scid?', segCursor.toString());
        break;
      }
      let vSeg = vMLDoc[scid];
      if (vSeg == null) {
        throw new Error(`${msg}scid[${scid}]? ${vMLDoc.length}`);
      }
      let score = vLegacy.similar(vSeg);
      if (minScanSize <= i) {
        // Scan exceeded minScanSize. We might be lost.
        // Or maybe we got lucky and translator omitted many segments.
        // For example, MN8 42 segments are skipped for Môhan
        if (score) {
          let percent = (score * 100).toFixed(0);
          let linePos = `line ${lineCursor.n + 1}`;
          this.pushStatus({
            state: STATE_WARN,
            text: `SCAN+${i}`,
            score,
            scid,
            legacyText,
          });
          dbg && console.log(msg, this.status.summary);
        }
      }
      // biome-ignore format:
      if (dbg > 1 && scid === dbgScid) {
        let seg = mlDoc?.segMap[scid] || {};
        let intersection = vLegacy.intersect(vSeg).toString();
        let { pli } = seg;
        console.log(msg, 'dbgScid', {
          legacyText, vLegacy: vLegacy.toString(),
          seg, vSeg: vSeg.toString(),
          score, intersection,
        });
      }
      if (scoreMax < score) {
        scoreMax = score;
        scoreId = scid;
        if (dbg > 1 && dbgScid) {
          let cmp = SuttaCentralId.compareLow(scoreId, dbgScid);
          let intersection = vLegacy.intersect(vSeg).toString();
          // biome-ignore format:
          if (cmp <= 0) {
            console.log(msg, `scoreMax-${dbgScid}`, 
              { scoreId, scoreMax, intersection, });
          } else {
            let segExp = segMap && segMap[dbgScid];
            console.log( msg, `scoreMax-${dbgScid}-MISMATCH?`,
              segCursor.toString(),
              lineCursor.toString(),
              { scoreId, segExp, legacyText, scoreMax, intersection},
            );
          }
        }
      }
    } // for

    let vSeg = vMLDoc[scoreId];
    let intersection = vLegacy.intersect(vSeg);

    if (scoreId == null || scoreMax < minScore) {
      let iEnd =
        Math.min(scids.length, segCursor.numerator + maxScanSize) - 1;
      let lastId = scids[iEnd];
      let scanned = iEnd - segCursor.numerator + 1;
      // biome-ignore format:
      this.pushStatus({
        state: STATE_ERROR,
        text: `${maxScanSize} UNMATCHED`,
        legacyText,
        score: scoreMax,
        scid: scoreId,
        intersection,
        vLegacy,
        vSeg,
      });
      dbg && console.log(msg, this.status.summary);
      return undefined;
    }

    // STATE_OK: Current line matches current segment
    ebtDoc.segMap[scoreId] = legacyText;

    lineCursor.increment();
    let iFound = scids.indexOf(scoreId);
    if (iFound >= 0) {
      segCursor.numerator = iFound + 1;
    } else {
      dbg &&
        console.error(msg, `${ERROR} iFound?`, {
          lineCursor,
          scoreId,
        });
    }
    let status = this.pushStatus({
      score: scoreMax,
      scid: scoreId,
      intersection,
      legacyText,
      vLegacy,
      vSeg,
      iLine: lineCursor.n,
    });
    dbg && console.log(msg, status.summary);
    if (lineCursor.value === 1) {
      let { uid, lang, author_uid } = this.legacyDoc;
      let lineCur = lineCursor.toString();
      status = this.pushStatus({
        state: STATE_DONE,
        text: `${uid}/${lang}/${author_uid} aligned ${lineCur}`,
        context: lineCursor.toString(),
      });
      dbg && console.log(msg, this.status.summary);
    }

    return status;
  } // alignLine

  alignAll() {
    const msg = 'A7t.alignAll:';
    let dbg = DBG.ALIGN_ALL;
    //biome-ignore format:
    let {
      aligner, ebtDoc, legacyDoc, lineCursor, maxScanSize, minScanSize,
      mlDoc, scidsExp, segCursor, vMLDoc,
    } = this;
    let { lang, alignMethod, wordSpace } = aligner;
    let { segMap } = mlDoc;
    let scids = Object.keys(segMap);
    scids.sort(SuttaCentralId.compareLow);
    let { lines } = legacyDoc;
    let rPrev;
    let iEnd = lines.length - 1;

    while (lineCursor.difference < 0) {
      let line = lines[lineCursor.numerator];
      let curScid = scids[segCursor.numerator];
      let dbgScid = scidsExp?.[lineCursor.numerator];
      let r = this.alignLine(line, { dbgScid });
      rPrev = r;
      // biome-ignore format:
      if (r == null) {
        let { vSeg, vLegacy, intersection } = this.status;
        dbg && console.log(msg, 'UNMATCHED', 
          lineCursor.toString(),
          segCursor.toString(),
          { curScid, line, minScanSize, maxScanSize, vSeg, vLegacy, intersection },
        );
        return null;
      }
    }

    return ebtDoc;
  } // alignAll
} // class Alignment

export class AlignmentStatus {
  constructor(alignment, opts = {}) {
    let { lineCursor, segCursor } = alignment;
    let {
      text,
      scid,
      state = STATE_OK,
      score,
      intersection,
      legacyText,
      vLegacy,
      vSeg,
      iLine = lineCursor.n + 1,
    } = opts;

    Object.assign(this, {
      iLine,
      intersection: intersection?.toString(),
      legacyText,
      lineCursor: lineCursor && new Fraction(lineCursor),
      text,
      scid,
      score,
      segCursor: segCursor && new Fraction(segCursor),
      state,
      vLegacy: vLegacy?.toString(),
      vSeg: vSeg?.toString(),
    });

    Object.defineProperty(this, 'alignment', {
      value: alignment,
    });
    Object.defineProperty(this, 'scorePercent', {
      get: () =>
        this.score == null
          ? '--%'
          : `${(100 * this.score)?.toFixed(0)}%`,
    });
    Object.defineProperty(this, 'lineCur', {
      get: () => this?.lineCursor?.toString(),
    });
    Object.defineProperty(this, 'segCur', {
      get: () => this?.segCursor?.toString(),
    });
  }

  static get STATE_ERROR() {
    return STATE_ERROR;
  }
  static get STATE_DONE() {
    return STATE_DONE;
  }
  static get STATE_OK() {
    return STATE_OK;
  }
  static get STATE_WARN() {
    return STATE_WARN;
  }

  get summary() {
    let {
      alignment,
      state,
      text,
      scid,
      scorePercent,
      lineCur,
      lineCursor,
      segCur,
      segCursor,
      score,
      legacyText = '',
      iLine,
    } = this;

    let status = [];
    let symbol;
    let color = NO_COLOR;
    let context = legacyText ? `${iLine}:` + legacyText : '';
    let { minScore } = alignment;
    let CTX_LEN = 25;
    switch (state) {
      case STATE_ERROR:
        symbol = RED_X;
        color = RED;
        break;
      case STATE_WARN:
        color = YELLOW;
        symbol = WARNING + ' ';
        context = context.substring(0, CTX_LEN) + ELLIPSIS;
        break;
      case STATE_DONE:
        symbol = CHECKMARK + ' ';
        color = WHITE;
        break;
      case STATE_OK:
        symbol = CHECKMARK;
        context = context.substring(0, CTX_LEN) + ELLIPSIS;
        color = NO_COLOR;
        break;
      default:
        symbol = RED_X;
        text = `UNKNOWN STATE ${state}`;
        color = RED;
        break;
    }
    status.push(color + symbol);
    status.push(text);
    if (score) {
      status.push(scid);
      status.push(`segs[${segCursor.n}]`);
      status.push(
        score < minScore
          ? RED + LEFT_ARROW + scorePercent + RIGHT_ARROW + color
          : GREEN + LEFT_ARROW + scorePercent + RIGHT_ARROW + color,
      );
    }
    context && status.push(context + NO_COLOR);

    return status.join(' ');
  }
} // AlignmentStatus
