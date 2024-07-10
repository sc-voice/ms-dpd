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

  static isAccented(word) {
    return !/^[a-z]+$/i.test(word);
  }

  static unaccentedPattern(pattern) {
    return pattern
      .replace(/a/iug, '(a|ā)')
      .replace(/i/iug, '(i|ī)')
      .replace(/u/iug, '(u|ū)')
      .replace(/m/iug, '(m|ṁ|ṃ)')
      .replace(/d/iug, '(d|ḍ)')
      .replace(/n/iug, '(n|ṅ|ñ|ṇ)')
      .replace(/l/iug, '(l|ḷ)')
      .replace(/t/iug, '(t|ṭ)')
      ;
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

  wordsWithPrefix(prefix, opts={}) {
    const msg = "Dictionary.autocompleteWords()";
    let { dpd } = this;
    let { 
      limit=0,
      strict=false,
    } = opts;
    let keys = Object.keys(dpd);
    let matching;
    let matchLen = prefix.length+1;
    if (strict) {
      matching = keys.filter(word=>word.startsWith(prefix));
    } else if (Dictionary.isAccented(prefix)) {
      let re = new RegExp(`^${prefix}`, 'i');
      let map = keys.reduce((a,word)=>{
        if (re.test(word)) {
          let key = word.length > matchLen
            ? word.slice(0, matchLen)+"\u2026"
            : word;
          a[key] = 1;
        }
        return a;
      }, {});
      matching = Object.keys(map);
    } else {
      let pat = Dictionary.unaccentedPattern(prefix);
      let re = new RegExp(`^${pat}`, 'i');
      let map = keys.reduce((a,word)=>{
        if (re.test(word)) {
          let key = word.length > matchLen
            ? word.slice(0, matchLen)+"\u2026"
            : word;
          a[key] = 1;
        }
        return a;
      }, {});
      matching = Object.keys(map);
    }
    return limit 
      ? matching.slice(0,limit) 
      : matching;
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
    const dbg = DBG.FIND_WORDS;
    let { dpd, dpdTexts } = this;
    let re = defPat instanceof RegExp 
      ? defPat 
      : new RegExp(`\\b${defPat}`, 'i');
    dbg && console.log(msg, '[1]re', re);
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

  findDefinition(pattern) {
    const msg = "Dictionary.findDefinition()";
    const dbg = DBG.FIND_DEFINITION;
    let result;
    let rows = this.findWords(pattern);
    let data = rows.reduce((a,row)=>{
      dbg && console.log(msg, '[1]', row);
      let { definition, words } = row;
      let parsed = this.parseDefinition(definition);
      words.forEach(word=>{
        let resultRow = Object.assign({}, parsed, {word});
        dbg && console.log(msg, '[2]', resultRow);
        a.push(resultRow);
      });
      return a;
    }, []);

    if (data.length) {
      result = { data, pattern, method: 'definition', };
      dbg && console.log(msg, '[3]result', result);
    } else {
      dbg && console.log(msg, '[4]data?', {pattern});
    }

    return result;
  }

  find(pattern, opts={}) {
    const msg = "Dictionary,find()";
    const dbg = DBG.FIND;
    let { dpd } = this;
    let {
      method,
    } = opts;
    let result;
    if (!result && (!method || method==='entry')) {
      let entry = this.entryOf(pattern);
      if (entry) {
        let data = entry.definition.map(def=>{
          let parsed = this.parseDefinition(def);
          let row = Object.assign(parsed, {word: pattern});
          return row;
        });
        result = { data, pattern, method: 'entry', }
      }
    } 
    if (!result && (!method || method==='unaccented')) {
      let rpattern = Dictionary.unaccentedPattern(pattern);
      let re = new RegExp(`^${rpattern}\$`);
      let data = Object.keys(dpd).reduce((a,word)=>{
        if (re.test(word)) {
          let entry = this.entryOf(word);
          entry && entry.definition.forEach(def=>{
            let parsed = this.parseDefinition(def);
            let row = Object.assign(parsed, {word: entry.word});
            a.push(row);
          });
        }
        return a;
      }, []);
      if (data.length) {
        result = { data, pattern:rpattern, method: 'unaccented', };
      }
    }
    if (!result && (!method || method==='definition')) {
      result = this.findDefinition(pattern);
    }
    
    if (dbg) {
      if (result) {
        result.data.forEach(row=>console.log(msg, '[1]',
          row.word,
          row.construction,
          row.type, 
          row.meaning, 
          row.literal, 
        ));
      } else {
        console.log(msg, "result?", {pattern, method});
      }
    }

    return result;
  }
}
