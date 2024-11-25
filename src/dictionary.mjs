import { DBG } from './defines.mjs';
import Pali from "./pali.mjs";
import Inflection from "./inflection.mjs";

import { ABBREVIATIONS } from '../data/en/abbreviations.mjs';
import { INDEX } from '../data/index.mjs';
import { DEF_PALI } from '../data/definition-pali.mjs';
 
const DEF = {} // definitions
const DEF_KEYS = Object.keys(DEF_PALI);
const { VERBOSE_ROWS } = DBG;

export default class Dictionary {
  static #CREATE = false;
  static #DPD; // cache

  constructor(opts={}) {
    if (!Dictionary.#CREATE) {
      throw new Error(`Use Dictionary.create()`);
    }

    Object.assign(this, opts);
  }

  static get LICENSE(){
    return "https://digitalpalidictionary.github.io/titlepage.html";
  }

  static get ABBREVIATIONS() {
    return ABBREVIATIONS;
  }

  static get DEFINITION_KEYS() {
    return DEF_KEYS;
  }

  static async definitions(lang = 'en') {
    const msg = 'Dictionary.definitions()';
    let dbg = DBG.LOADING;
    if (DEF[lang] == null) {
      let fname = `../data/${lang}/definition-${lang}.mjs`;
      let { DEF_LANG } = await import(fname);
      DEF[lang] = DEF_LANG;
      console.error(msg, '[1]loading', fname); 
      dbg && console.error(msg, '[1.1]', Object.keys(DEF[lang]).length);
    }

    return DEF[lang];
  }

  static isAccented(word) {
    return !/^[a-z]+$/i.test(word);
  }

  static prefixOf(...strings) {
    const msg = 'Dictionary.prefixOf()';
    strings = strings.flat();

    let prefix = strings.reduce((a,s)=>{
      while (a && !s.startsWith(a)) {
        a = a.substring(0, a.length-1);
      }
      return a;
    }, strings[0] || '');

    return prefix;
  }

  static normalizePattern(pattern) {
    pattern = pattern.toLowerCase();
    pattern = pattern.replace(/[^a-zA-zāḍīḷṁṃṅñṇṭū]/, '');
    return pattern;
  }

  static unaccentedPattern(pattern) {
    return this.normalizePattern(pattern)
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
        defLang=await Dictionary.definitions(lang),
        index=INDEX,
        verboseRows=DBG.VERBOSE_ROWS,
      } = opts;
      Dictionary.#CREATE = true;

      dbg && console.error(msg, '[1]DEF_KEYS', DEF_KEYS.length, DEF_KEYS.slice(0, DBG.VERBOSE_ROWS));

      let dict = new Dictionary({
        lang,
        index,
        defLang,
      });

      return dict;
    } catch (e) {
      throw e;
    } finally {
      Dictionary.#CREATE = false;
    }
  }

  #definitionOfKey(key) {
    const msg = "Dictionary.#definitionLine";
    let { defLang } = this;
    return [
      defLang[key],
      DEF_PALI[key],
      key,
    ].join('|');
  }

  entryOf(word) {
    const msg = "Dictionary.entryOf()";
    const dbg = DBG.ENTRY_OF;
    let { index, defLang, } = this;
    word = word.toLowerCase();
    let indexEntry = index[word];
    dbg && console.error(msg, `[1]${word}`, indexEntry);
    if (indexEntry == null) {
      return null;
    }
    let definition = indexEntry.split(',').map(key=>{
      return this.#definitionOfKey(key);
    });
    return Object.assign({word}, {definition});
  }

  wordsWithPrefix(prefix, opts={}) {
    const msg = "Dictionary.wordsWithPrefix()";
    let dbg = DBG.WORDS_WITH_PREFIX;
    let { index } = this;
    let { 
      limit=0,
      strict=false,
    } = opts;
    let keys = Object.keys(index);
    let matching;
    let matchLen = prefix.length+1;
    if (strict) {
      matching = keys.filter(word=>word.startsWith(prefix));
      dbg && console.error(msg, '[1]matching', matching.length);
    } else if (Dictionary.isAccented(prefix)) {
      let normPrefix = Dictionary.normalizePattern(prefix);
      let re = new RegExp(`^${normPrefix}`, 'i');
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
      dbg && console.error(msg, '[2]matching', matching.length);
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
      dbg && console.error(msg, '[3]matching', matching.length);
    }
    limit && (matching.slice(0,limit));
    matching =  matching.sort((a,b)=>{
      let cmp = a.length - b.length;
      return cmp || Pali.compareRoman(a,b);
    });

    dbg && console.error(msg, '[4]matching', 
      matching.slice(0,DBG.VERBOSE_ROWS));

    return matching;
  }

  relatedEntries(word, opts={}) {
    const msg = "Dictionary.relatedEntries()";
    const dbg = DBG.RELATED_ENTRIES;
    let { index } = this;
    let { 
      overlap: minOverlap=0.1,
    } = opts;
    let stem = Pali.wordStem(word);
    let keys = Object.keys(index)
    let maxLen = word.length + Pali.ENDING_MAX_LEN;
    let stemKeys = keys.filter(k=>{
      return k.startsWith(stem) && k.length<=maxLen;
    });
    dbg && console.error(msg, '[1]', {word, stemKeys});
    let entry = this.entryOf(word);
    if (entry == null) {
      return undefined;
    }
    let { definition } = entry;
    let map = {};
    definition.forEach(line=>(map[line]=true));
    let overlapBasis = definition.length || 1;

    let entries = stemKeys.reduce((entries,key)=>{
      let entry = this.entryOf(key);
      let intersection = entry.definition.reduce((aDef,line)=>{
        if (map[line] != null) {
          aDef++;
        }
        return aDef;
      }, 0);
      let overlap = intersection/overlapBasis;
      if ( minOverlap <= overlap ) {
        let decoratedEntry = Object.assign({overlap}, entry);
        entries.push(decoratedEntry);
      }

      return entries;
    }, []);
    dbg && console.error(msg, '[2]', entries.map(e=>e.word));

    return entries;
  }

  findWords(defPat) {
    const msg="Dictionary.findWords()";
    const dbg = DBG.FIND_WORDS;
    let { index, defLang } = this;
    let re = defPat instanceof RegExp 
      ? defPat 
      : new RegExp(`\\b${defPat}`, 'i');
    dbg && console.error(msg, '[1]re', re);
    let idMatch = DEF_KEYS.reduce((a,key,i)=>{
      let text = defLang[key];
      if (dbg && i<VERBOSE_ROWS) {
        console.error(msg, '[1.1]', {key, text});
      }
      if (re.test(text)) {
        a[key] = text;
      }
      return a;
    }, {});
    dbg && console.error(msg, '[2]idMatch', idMatch);
    let dpdEntries = Object.entries(index);
    let defWords = dpdEntries.reduce((a,entry,i) =>{
      let [ word, info ] = entry;
      info = info.split(',');
      info.forEach(line=>{
        if (idMatch[line]) {
          let i = line - 2;
          let defText = defLang[i];
          let words = a[line] || [];
          words.push(word);
          a[line] = words;
        }
      });
      return a;
    }, {});
    dbg && console.error(msg, '[3]defWords', defWords);
    let matches = Object.entries(defWords).map(entry=>{
      let [key, words] = entry;
      return {
        definition:this.#definitionOfKey(key),
        words,
      }
    });
    dbg && console.error(msg, '[4]matches', matches);
    return matches;
  }

  parseDefinition(d) {
    const msg = 'Dictionary.parseDefinition()';
    if (d == null) {
      throw new Error(`${msg} d?`);
    }
    if (d instanceof Array) {
      return d.map(line=>this.parseDefinition(line));
    }
    if (typeof d === 'string') {
      let [ 
        meaning_1, meaning_2, meaning_lit, 
        pattern, pos, construction, stem, key
      ] = d.split('|');
      let result = JSON.parse(JSON.stringify({
        key,
        meaning_1, meaning_2, meaning_lit, 
        pattern, pos, construction, 
        type: pos,
        meaning: meaning_1 || meaning_2,
        literal: meaning_lit,
        stem,
      }));
      return result;
    }

    return undefined; 
  }

  findDefinition(pattern) {
    const msg = "Dictionary.findDefinition()";
    const dbg = DBG.FIND_DEFINITION;
    let result;
    let rows = this.findWords(pattern);
    dbg && console.error(msg, '[1]pattern', pattern, rows.length);
    let data = rows.reduce((a,row)=>{
      dbg>1 && console.error(msg, '[1.1]', row);
      let { definition, words } = row;
      let parsed = this.parseDefinition(definition);
      words.forEach(word=>{
        let resultRow = Object.assign({}, parsed, {word});
        dbg>1 && console.error(msg, '[1.2]', resultRow);
        a.push(resultRow);
      });
      return a;
    }, []);

    if (data.length) {
      result = { data, pattern, method: 'definition', };
      dbg && console.error(msg, '[2]result', result);
    }

    return result;
  }

  findAltAnusvara(pattern, opts) {
    let msg = 'Dictionary.findAltAnusvara:';
    const dbg = DBG.FIND;
    let altPat = pattern.replace(/n’ti/, 'ṁ');
    let res;
    if (altPat !== pattern) {
      res = this.findMethod(altPat, opts);
      dbg && console.error(msg, '[1]', altPat, !!res);
    }

    return res;
  }

  find(pattern, opts={}) {
    let res = this.findMethod(pattern, opts);

    if (res == null) { // try anusvara rule
      res = this.findAltAnusvara(pattern, opts);
    }

    return res;
  }

  findMethod(pattern, opts={}) {
    const msg = "Dictionary.findMethod()";
    const dbg = DBG.FIND || DBG.FIND_METHOD;
    let { index } = this;
    let {
      method,
    } = opts;
    if (typeof pattern === 'string') {
      let words = pattern.split(' ').filter(w=>{
        if (w.startsWith("-")) {
          switch (w) {
            case "-mu": 
              method = "unaccented";
              break;
            case "-me":
              method = "entry";
              break;
            case "-md":
              method = "definition";
              break;
          }
          return false;
        }
        return true;
      });
      pattern = words.join(' ');
    }
    dbg && console.error(msg, '[1]pattern', pattern);

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
      dbg && result && console.error(msg, '[2]result', result);
    } 
    if (!result && (!method || method==='unaccented')) {
      let rpattern = Dictionary.unaccentedPattern(pattern);
      let re = new RegExp(`^${rpattern}\$`);
      let data = Object.keys(index).reduce((a,word)=>{
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
      dbg && result && console.error(msg, '[3]result', result);
    }
    if (!result && (!method || method==='definition')) {
      result = this.findDefinition(pattern);
      dbg && result && console.error(msg, '[4]result', result);
    }
    
    if (dbg) {
      if (result) {
        result.data.forEach(row=>console.error(msg, '[4]',
          row.word,
          row.construction,
          row.type, 
          row.meaning, 
          row.literal, 
        ));
      } else {
        console.error(msg, "result?", {pattern, method});
      }
    }

    return result;
  }

  wordInflections(word, opts={}) { 
    const msg = 'Dictionary.wordInflections()';
    const dbg = DBG.WORD_INFLECTIONS;
    const dbgv = dbg && DBG.VERBOSE;
    let {
      overlap=0.5,
      nbr,
    } = opts;
    let {
      index,
    } = this;
    let entry = this.find(word);
    let entries = this.relatedEntries(word, {overlap});
    let stem = Dictionary.prefixOf(entries.map(e=>e.word));
    let w = word;
    dbg && console.error(msg);
    dbg & console.error(entries.map(e=>e.word).join('\n'));

    let tblMatch = Inflection.TABLE.filter(inf=>{
      for (let ie=0; ie<entries.length; ie++) {
        let e = entries[ie];
        if (inf.matchesWord(e.word, {stem, nbr})) {
          return true;
        }
      }
      return false;
    });
    let title = `${msg} ${word} matching inflections`;
    dbgv && console.error(tblMatch.format({title}));

    let tblLike = tblMatch.groupBy(['like'], [
      {id:'id', aggregate:'count'},
    ]);
    title = `${word} grouped by like`;
    dbgv && console.error(tblLike.format({title}));
    //return tblMatch;

    let likeMap = tblLike.rows.reduce((a,row)=>{
      a[row.like] = true;
      return a;
    }, {});
    let { like } = tblLike.rows[0] || {};
    let tblLikeOnly =  Inflection.TABLE.filter(inf=>{
      let match =  likeMap[inf.like];
      if (match) {
        let word = stem + inf.sfx;
        match = !!index[word];
      }
      return match;
    });

    let tblResult = tblLikeOnly;
    tblResult.rows = tblResult.rows.map(row=>
      new Inflection(Object.assign({word:stem+row.sfx}, row)));
    tblResult.addHeader({id:'word'});
    tblResult.sort(Inflection.compare);
    dbg && console.error(tblResult.format({
      title:`${msg} tblResult ${word} group by:${Object.keys(likeMap)}`}));
    return tblResult;
  }
}
