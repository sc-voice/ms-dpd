import { DBG } from './defines.mjs';
import { default as Pali } from "./pali.mjs";

import { DPD } from '../data/en/dpd.mjs';
import { DPD_TEXTS } from '../data/en/dpd-text.mjs';


export default class Dictionary {
  static #CREATE = false;
  static #DPD; // cache

  constructor(opts={}) {
    if (!Dictionary.#CREATE) {
      throw new Error(`Use Dictionary.create()`);
    }

    Object.assign(this, opts);
  }

  static async create(opts={}) {
    const msg = 'Dictionary.create()';
    const dbg = DBG.DICTIONARY_CREATE;
    try {
      let { 
        lang='en',
        dpd=Dictionary.#DPD,
        dpdTexts,
      } = opts;
      Dictionary.#CREATE = true;
      if (dpd == null) {
        let keys = Object.keys(DPD);
        dpd = keys.reduce((a,word)=>{
          let rawEntry = DPD[word];
          a[word] = typeof rawEntry === 'string'
            ? JSON.parse(rawEntry) 
            : rawEntry;
          return a;
        }, DPD); // overwrite imported DPD;
        Dictionary.#DPD = dpd;
        dbg && console.log(msg, '[1]DPD', {
          metadata: dpd?.__metadata, 
          keys: keys.length,
        });
      } else {
        dbg && console.log(msg, '[2]dpd');
      }
      if (dpdTexts == null) {
        dpdTexts = DPD_TEXTS;
        dbg && console.log(msg, '[3]dpdTexts', dpdTexts.length); 
      }
      let dict = new Dictionary({
        lang,
        dpd,
        dpdTexts,
      });

      return dict;
    } catch (e) {
      throw e;
    } finally {
      Dictionary.#CREATE = false;
    }
  }

  entryOf(word) {
    const msg = "Dictionary.entryOf()";
    const dbg = DBG.ENTRY_OF;
    let { dpd, dpdTexts } = this;
    word = word.toLowerCase();
    let rawEntry = dpd[word];
    if (rawEntry == null) {
      return null;
    }
    let { d } = rawEntry;
    let definition = d.map(id=>dpdTexts[id]);
    return Object.assign({word}, {definition});
  }

  relatedEntries(word, opts={}) {
    const msg = "Dictionary.relatedEntries()";
    let { dpd } = this;
    let { 
      overlapThreshold=0,
    } = opts;
    let stem = Pali.wordStem(word);
    let keys = Object.keys(dpd)
    let maxLen = word.length + Pali.ENDING_MAX_LEN;
    let stemKeys = keys.filter(k=>{
      return k.startsWith(stem) && k.length<=maxLen;
    });
    let entry = this.entryOf(word);
    if (entry == null) {
      return undefined;
    }
    let { definition } = entry;
    let map = {};
    definition.forEach(line=>map[line]=true);
    let overlapBasis = definition.length;

    let entries = stemKeys.reduce((entries,key)=>{
      let entry = this.entryOf(key);
      let intersection = entry.definition.reduce((aDef,line)=>{
        if (map[line] != null) {
          aDef++;
        }
        return aDef;
      }, 0);
      let overlap = intersection/overlapBasis;
      if (overlap>overlapThreshold) {
        let decoratedEntry = Object.assign({overlap}, entry);
        entries.push(decoratedEntry);
      }

      return entries;
    }, []);

    return entries;
  }

  findWords(defPat) {
    const msg="Dictionary.findWords()";
    const dbg = DBG.DEFINED_ENTRIES;
    let { dpd, dpdTexts } = this;
    let re = defPat instanceof RegExp ? defPat : new RegExp(defPat);
    let textMap = {};
    let dpdKeys = Object.keys(dpd);
    let idMatch = dpdTexts.reduce((a,text,i)=>{
      if (re.test(text)) {
        a[i] = text;
        textMap[text] = i;
      }
      return a;
    }, {});
    let dpdEntries = Object.entries(dpd);
    let defWords = dpdEntries.reduce((a,entry,i) =>{
      let [ word, info ] = entry;
      (info.d instanceof Array) && info.d.forEach(id=>{
        if (idMatch[id]) {
          let defText = dpdTexts[id];
          let words = a[id] || [];
          words.push(word);
          a[id] = words;
        }
      });
      return a;
    }, {});
    let matches = Object.entries(defWords).map(entry=>{
      let [id, words] = entry;
      let d = dpdTexts[id];
      return {
        definition:d,
        words,
      }
    });
    dbg && console.log(msg, matches);
    return matches;
  }

  parseDefinition(d='type?|meaning?|literal?|construction?') {
    if (d instanceof Array) {
      return d.map(line=>this.parseDefinition(line));
    }
    if (typeof d === 'string') {
      let [ type, meaning, literal, construction ] = d.split('|');
      return { type, meaning, literal, construction };
    }

    return undefined; 
  }

}
