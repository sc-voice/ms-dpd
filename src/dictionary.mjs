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

  entryOf(word) {
    const msg = "Dictionary.entryOf()";
    const dbg = DBG.ENTRY_OF;
    let { lzs, dpd, dpdTexts } = this;
    word = word.toLowerCase();
    let entry = dpd[word];
    if (entry == null) {
      return null;
    }

    if (typeof entry === 'string') {
      let result = JSON.parse(entry);
      let { d } = result;
      let definition = d.map(code=>dpdTexts[code]);
      entry = {
        definition, 
      }
      dpd[word] = entry;
      //dbg && console.log(msg, '[1]word');
    } else {
      //dbg && console.log(msg, '[2]word');
    }

    return entry
  }

  lookup(word) {
    let wlen = word.length;
    let stem = word.substring(0,wlen-1);
    let suffix1 = word.substring(wlen-1);
    let suffix2 = word.substring(wlen-2);
    //console.log({wlen, stem, suffix1, suffix2});
    let entry = this.entryOf(word);
    if (entry == null) {
      return null;
    }
    return {
      key: word,
      definition: entry.definition,
    }
  }

}
