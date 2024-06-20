import { DBG } from './defines.mjs';
import { default as Compress } from "./compress.mjs";

export default class Dictionary {
  static #create = false;

  constructor(opts={}) {
    if (!Dictionary.#create) {
      throw new Error(`Use Dictionary.create()`);
    }

    Object.assign(this, opts);
  }

  static async create(opts={}) {
    const msg = 'Dictionary.#loadDpd()';
    const dbg = DBG.DICTIONARY;
    try {
      let { 
        lang='en',
        dpd,
        dpdTexts,
      } = opts;
      Dictionary.#create = true;
      if (dpd == null) {
        let dpdPath = '../data/en/dpd.mjs';
        let dpdImport = await import(dpdPath);
        dpd = dpdImport.DPD;
        let keys = Object.keys(dpd);
        dbg && console.log(msg, '[2]loaded', {
          metadata: dpd?.__metadata, 
          keys: keys.length,
        });
      }
      if (dpdTexts == null) {
        let textPath = '../data/en/dpd-text.mjs';
        let textImport = await import(textPath);
        dpdTexts = textImport.TEXTS;
        dbg && console.log(msg, '[3]dpdTexts', dpdTexts.length); 
      }
      let lzs = new Compress();
      let dict = new Dictionary({
        lang,
        dpd,
        dpdTexts,
        lzs,
      });

      return dict;
    } catch (e) {
      throw e;
    } finally {
      Dictionary.#create = false;
    }
  }

  async entryOf(word) {
    let { lzs, dpd, dpdTexts } = this;
    word = word.toLowerCase();
    let json = dpd[word];
    if (json == null) {
      return null;
    }
    //let json = await lzs.lzwDecompress(entry);
    //json = entry;
    let result = JSON.parse(json);
    let { d } = result;
    let definition = d.map(code=>dpdTexts[code]);
    return {
      definition,
    }
  }

  async lookup(word) {
    let wlen = word.length;
    let stem = word.substring(0,wlen-1);
    let suffix1 = word.substring(wlen-1);
    let suffix2 = word.substring(wlen-2);
    //console.log({wlen, stem, suffix1, suffix2});
    let entry = await this.entryOf(word);
    if (entry == null) {
      return null;
    }
    return {
      key: word,
      definition: entry.definition,
    }
  }
}
