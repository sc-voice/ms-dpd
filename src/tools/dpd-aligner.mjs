import { Text } from '@sc-voice/tools';
const { WordSpace } = Text;
import Dictionary from '../dictionary.mjs';
import { Aligner, Alignment, AlignmentStatus } from './aligner.mjs';
import { DBG } from '../defines.mjs';
let privateCreate;

export class DpdAligner extends Aligner {
  constructor(opts = {}) {
    const msg = 'd9r.ctor:';
    super(opts);
    if (!privateCreate) {
      throw new Error(`${msg} create?`);
    }
    let { msdpd } = opts;
    Object.assign(this, {
      msdpd,
    });
  }

  static async create(opts = {}) {
    const msg = 'a0r.create:';
    let {
      // Required
      authorLegacy, // author of legacy document
      lang, // 2-letter ISO language (en, fr, es, pt)

      // Optional
      dbgScid, // print out info for this SCID
      groupDecay = 0.5, // group exponential decay
      groupSize = 1, // comparison group size
      maxScanSize, // maximum segments to scan for alignment
      minScanSize = 5, // minimum number of segments to scan
      minScore = 0.1, // minimum alignment score
      normalizeVector,
      scvEndpoint = 'https://www.api.sc-voice.net/scv',
      wordSpace = WordSpace.createTfIdf(),
      msdpd,
    } = opts;
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    if (authorLegacy == null) {
      throw new Error(`${msg} authorLegacy?`);
    }
    if (msdpd == null) {
      msdpd = await Dictionary.create({ lang });
    }

    try {
      privateCreate = true;
      let aligner = new DpdAligner({
        alignMethod: 'alignPali',
        authorAligned: 'ms',
        authorLegacy,
        dbgScid,
        msdpd,
        groupDecay,
        groupSize,
        lang,
        maxScanSize,
        minScanSize,
        minScore,
        minWord: 1,
        normalizeVector,
        scvEndpoint,
        wordSpace,
      });
      return aligner;
    } catch (e) {
      console.error(`${msg} ${e.message}`);
      throw e;
    } finally {
      privateCreate = false;
    }
  } // create

  addCorpusSegment(seg) {
    const msg = 'd9r.addCorpusSegment:';
    const dbg = DBG.D9R_ADD_CORPUS_SEGMENT;
    let { scid, pli } = seg;
    let { wordSpace, msdpd } = this;
    let words = pli.split(' ');
    for (let j = 0; j < words.length; j++) {
      let entry = msdpd.entryOf(words[j]);
      if (entry) {
        let { definition } = entry;
        for (let i = 0; i < definition.length; i++) {
          let def = msdpd.parseDefinition(definition[i]);
          let { meaning, meaning_lit } = def;
          let text = [scid, meaning, meaning_lit].join(' ').trim();
          let res = wordSpace.addDocument(text);
          dbg && console.log(msg, res, text);
        }
      }
    }
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
