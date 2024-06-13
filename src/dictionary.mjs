import { DBG } from './defines.mjs';
import { default as Compress } from "./compress.mjs"

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
      } = opts;
      Dictionary.#create = true;
      if (dpd == null) {
        let dpdPath = `../data/dpd-${lang}.mjs`;
        dbg && console.log(msg, '[1]loading', dpdPath);
        let dpdImport = await import(dpdPath);
        dpd = dpdImport.DPD;
        let keys = Object.keys(dpd);
        dbg && console.log(msg, '[2]loaded', {
          metadata: dpd?.__metadata, 
          keys: keys.length,
        });
      }
      let lzs = new Compress();
      let dict = new Dictionary({
        lang,
        dpd,
        lzs,
      });

      return dict;
    } catch (e) {
      throw e;
    } finally {
      Dictionary.#create = false;
    }
  }

  async lookup(word) {
    let { lzs, dpd } = this;
    word = word.toLowerCase();
    let entry = dpd[word];
    if (entry == null) {
      return null;
    }
    let json = await lzs.lzwDecompress(entry);
    return JSON.parse(json);
  }
}
