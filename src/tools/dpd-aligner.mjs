import { Text } from '@sc-voice/tools';
const { WordVector, TfidfSpace } = Text;
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
      documents = [],
      scvEndpoint = 'https://www.api.sc-voice.net/scv',
      tfidfSpace,
      msdpd,
    } = opts;
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    if (authorLegacy == null) {
      throw new Error(`${msg} authorLegacy?`);
    }
    if (msdpd == null) {
      const msStart = Date.now();
      msdpd = await Dictionary.create({ lang });
      let elapsed = ((Date.now()-msStart)/1000).toFixed(3);
      dbg && console.log(msg, `elapsed ${elapsed}s`);
    }
    if (tfidfSpace == null) {
      let normalizeText = DpdAligner.normalizeFR_TBD;
      tfidfSpace = new TfidfSpace({lang, normalizeText});
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
        scvEndpoint,
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
  static normalizeFR_TBD(s) { 
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
    let words = pli.split(' ');
    let bow = new WordVector();
    let msStart = Date.now();
    for (let j = 0; j < words.length; j++) {
      let entry = msdpd.entryOf(words[j]);
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
  }

  async addDocumentDefinitions(suid) {
    let mld = await this.fetchMLDoc(suid);
    let { segMap } = mld;
    let scids = Object.keys(segMap);
  }

  async fetchMLDoc(suid, lang = 'pli', author = 'ms') {
    const msg = 'Aligner.fetchMLDoc:';
    let { scvEndpoint } = this;
    let url = [
      scvEndpoint,
      'search',
      `${suid}%20-da%20${author}%20-ml1`,
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
}
