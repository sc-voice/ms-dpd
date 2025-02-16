import { Text } from '@sc-voice/tools';
const { WordVector, TfidfSpace } = Text;
import { SuttaRef } from 'scv-esm/main.mjs';
import { DBG } from '../defines.mjs';
import Dictionary from '../dictionary.mjs';
import { Aligner, Alignment, AlignmentStatus } from './aligner.mjs';
let privateCreate;

export class DpdAligner {
  constructor(opts = {}) { const msg = 'd8r.ctor:';
    if (!privateCreate) {
      throw new Error(`${msg} create?`);
    }
    Object.assign(this, opts);
  }

  static async create(opts = {}) {
    const msg = 'd0r.create:';
    const dbg = DBG.D84_CREATE;
    let {
      // Required
      authorLegacy, // author of legacy document
      lang, // 2-letter ISO language (en, fr, es, pt)

      // Optional
      //dbgScid, // print out info for this SCID
      //groupDecay = 0.5, // group exponential decay
      //groupSize = 1, // comparison group size
      //maxScanSize, // maximum segments to scan for alignment
      //minScanSize = 5, // minimum number of segments to scan
      //minScore = 0.1, // minimum alignment score
      //normalizeVector,
      tfidfSpace,
    } = opts;
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    if (authorLegacy == null) {
      throw new Error(`${msg} authorLegacy?`);
    }
    if (tfidfSpace == null) {
      let normalizeText;
      // normalizeText = DpdAligner.normalizeFR_DEPRECATED;
      tfidfSpace = new TfidfSpace({lang, normalizeText});
    }
    let msdpd;
    if (msdpd == null) {
      const msStart = Date.now();
      msdpd = await Dictionary.create({ lang });
      let elapsed = ((Date.now()-msStart)/1000).toFixed(3);
      dbg && console.log(msg, `elapsed ${elapsed}s`);
    }

    try {
      privateCreate = true;
      let aligner = new DpdAligner({
        //alignMethod: 'alignPali',
        //authorAligned: 'ms',
        authorLegacy,
        //dbgScid,
        msdpd,
        //groupDecay,
        //groupSize,
        lang,
        //maxScanSize,
        //minScanSize,
        //minScore,
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
      privateCreate = false;
    }
  } // create

  // move this back to @sc-voice/tools/text TfidfSpace when stable
  static normalizeFR_DEPRECATED(s) { 
    let sAbbr = s.toLowerCase()
      .replace(/\bd[’']/gi, 'de ')
      .replace(/\bl[’']/gi, 'le ')
      .replace(/\bs[’']/gi, 's_')
      .replace(/\bj[’']/gi, 'j_')
      .replace(/\bm[’']/gi, 'm_')
      .replace(/\bn[’']/gi, 'n_')
      .replace(/\bc[’']/gi, 'c_')
    return TfidfSpace.removeNonWords(sAbbr);
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
        definition.reduce((a,d)=>{
          let def = msdpd.parseDefinition(d);
          let { meaning, meaning_lit } = def;
          let text = [
            meaning, 
            meaning_lit,
          ].join(' ').trim();
          dbg && console.log(msg, {text, def});
          let v = tfidfSpace.bowOfText(text);
          a.increment(v);
          return a;
        }, bow);
      }
    }
    let elapsed = ((Date.now() - msStart)/1000).toFixed(3);
    dbg>1 && console.log(msg, `elapsed ${elapsed}s`);
    return bow;
  } // bowOfSegment

  async addCorpusSutta(suid) {
    const msg = 'd8r.addCorpusSutta:';
    const dbg = DBG.D8R_ADD_CORPUS_SUTTA;
    let { tfidfSpace, } = this;
    let { corpus } = tfidfSpace;
    let mld = await this.fetchMLDoc(suid);
    let { segMap } = mld;
    let scids = Object.keys(segMap);
    scids.forEach((scid,i)=>{
      let seg = segMap[scid];
      let { pli } = seg;
      let bow = this.bowOfSegment(seg);
      let info = tfidfSpace.addCorpusDocument(scid, bow);
      info.pli = pli;
      dbg && console.log(msg, `[1]seg[${i}]`, scid, 
        `${info.nWords}w`, pli);
    });

    return this;
  }

  async fetchMLDoc(sref) {
    const msg = 'd8r.fetchMLDoc:';
    const dbg = DBG.D8R_FETCH_MLDOC;
    let { sutta_uid, lang, author }  = SuttaRef.create(sref);
    let { scvEndpoint } = this;
    let url = [
      scvEndpoint,
      'search',
      [ 
        [sutta_uid,lang,author].join('%2F'), 
        '-da', author, 
        '-ml1'
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
}
