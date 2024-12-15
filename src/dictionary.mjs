import { DBG } from './defines.mjs';
import Pali from "./pali.mjs";
import Inflection from "./inflection.mjs";

import { INDEX } from '../dpd/index.mjs';
import { DEF_PALI } from '../dpd/definition-pali.mjs';
 
const LANG_DEF = {}   // headword definitions
const LANG_ABBR = {}; // abbreviations
const DEF_KEYS = Object.keys(DEF_PALI);
const { VERBOSE_ROWS } = DBG;
var DICT_CREATE = false;

export default class Dictionary {
  static #DPD; // cache

  constructor(opts={}) {
    const msg = "Dictionary.constructor";
    if (!DICT_CREATE) {
      throw new Error(`${msg}: Use Dictionary.create()`);
    }

    Object.assign(this, opts);
  }

  static get LICENSE(){
    return "https://digitalpalidictionary.github.io/titlepage.html";
  }

  static get DEFINITION_KEYS() {
    return DEF_KEYS;
  }

  static dpdLink(ebtWord) {
    if (!ebtWord) {
      return {
        url: `https://www.dpdict.net/`,
      }
    }
    let dpdWord = ebtWord.toLowerCase()
      .replace(/ṁ/g, 'ṃ');
    return {
      url: `https://www.dpdict.net/?q=${dpdWord}`,
      ebtWord,
      dpdWord,
    };
  }

  static loadEN() {
    return import("@sc-voice/ms-dpd-en");
  }

  static loadPT() {
    return import("@sc-voice/ms-dpd-pt");
  }

  static async loadLanguage(lang = 'en') { // PRIVATE
    const msg = 'Dictionary.loadLanguage()';
    let dbg = DBG.LOADING;
    if (LANG_DEF[lang] == null) {
      let langModule;
      switch (lang) {
        case 'de':
          langModule = await import("@sc-voice/ms-dpd-de");
          break;
        case 'fr':
          langModule = await import("@sc-voice/ms-dpd-fr");
          break;
        case 'es':
          langModule = await import("@sc-voice/ms-dpd-es");
          break;
        case 'pt':
          langModule = await Dictionary.loadPT();
          break;
        case 'en':
        default: 
          langModule = await Dictionary.loadEN();
          break;
      }
      let { DEF_LANG, ABBREVIATIONS } = langModule;
      LANG_DEF[lang] = DEF_LANG;
      LANG_ABBR[lang] = ABBREVIATIONS;
      let defKeys = Object.keys(LANG_DEF[lang]);
      dbg && console.error(msg, `[1]${lang}-defKeys`, defKeys.length);
    }

    return LANG_DEF[lang];
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
        defLang,
        index=INDEX,
        verboseRows=DBG.VERBOSE_ROWS,
      } = opts;

      dbg && console.error(msg, '[2]opts', {lang, verboseRows});

      DICT_CREATE = true;
      let dict = new Dictionary({
        lang,
        index,
      });
      DICT_CREATE = false;

      dict.defLang = defLang || (await Dictionary.loadLanguage(lang));
      dbg && console.error(msg, '[1]DEF_KEYS', 
        DEF_KEYS.length, DEF_KEYS.slice(0, DBG.VERBOSE_ROWS));

      return dict;
    } catch (e) {
      throw e;
    }
  }

  get lang() {
    return this._lang;
  }

  set lang(lang) {
    const msg = "Dictionary.lang";
    const dbg = DBG.LANG;
    if (lang != this._lang) {
        Dictionary.loadLanguage(lang).then(defLang=>{
          this.defLang = defLang;
          this._lang = lang;
          dbg && console.log(msg, '[1]', this._lang);
        });
    } else {
      dbg && console.log(msg, '[2]', this._lang);
    }
  }

  definitionOfKey(key) { // PRIVATE
    const msg = "Dictionary.definitionOfKey";
    let { defLang } = this;
    return [
      defLang[key],
      DEF_PALI[key],
      key,
    ].join('|');
  }

  abbreviationInfo(abbr) {
    const msg = "Dictionary.abbreviationInfo";
    const dbg = DBG.ABBREVIATION_INFO;
    let { lang } = this;
    let abbrLang = LANG_ABBR[lang];
    dbg && console.log(msg, '[1]LANG_ABBR', Object.keys(LANG_ABBR));
    return abbrLang && abbrLang[abbr] || {
      abbreviation: abbr,
      meaning: `(${lang}?)`,
    };
  }

  entryOf(aWord) {
    const msg = "Dictionary.entryOf()";
    const dbg = DBG.ENTRY_OF;
    const RE_PUNCT = /[-!?(),.:;…—– ‘’"'“”]/g;
    let { index, defLang, } = this;
    let wordParts = aWord.split(RE_PUNCT);
    let word = wordParts.filter(w=>!!w)[0].toLowerCase();
    let indexEntry = index[word];
    if (indexEntry == null) {
      dbg && console.error(msg, `[1]${word}?`);
      return undefined;
    }
    dbg && console.error(msg, `[2]${word}`, indexEntry, wordParts);
    let definition = indexEntry.split(',').map(key=>{
      return this.definitionOfKey(key);
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

  wordStem(word) {
    const msg = 'Dictionary.wordStem';
    let dbg = DBG.WORD_STEM;
    let entry = this.entryOf(word);
    let stem = word;
    if (entry == null) {
      return undefined; // Not in Mahāsańghīti
    }
    let { definition } = entry;
    let stemMap = definition.reduce((a,def)=>{
      let { stem } = this.parseDefinition(def);
      a[stem] = (a[stem] || 0) + 1;
      return a;
    }, {});
    let keys = Object.keys(stemMap).sort((a,b)=>{
      return stemMap[b] - stemMap[a]; // descending
    });

    stem = keys.length && keys[0];
    dbg && console.log(msg, '[1]stemMap', stemMap, stem);

    return stem;
  }

  relatedEntries(word, opts={}) {
    const msg = "Dictionary.relatedEntries()";
    const dbg = DBG.RELATED_ENTRIES;
    let { index } = this;
    let { 
      overlap: minOverlap=0.1,
    } = opts;
    let stem = this.wordStem(word);
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
        definition:this.definitionOfKey(key),
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
        pattern, pos, construction, stem, lemma_1, key
      ] = d.split('|');
      let result = JSON.parse(JSON.stringify({
        key,
        meaning_1, meaning_2, meaning_lit, 
        pattern, pos, construction, 
        type: pos,
        meaning: meaning_1 || meaning_2,
        literal: meaning_lit,
        stem,
        lemma_1,
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
          let row = Object.assign(parsed, {word: entry.word});
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
    let likeKeys = Object.keys(likeMap);
    dbg && console.error(tblResult.format({
      title:`${msg} tblResult ${word} group by:${likeKeys}`}));
    return tblResult;
  }
  
  deconstruct(word) { // TBD
    let output = [
    ]
    
    return {
      word,
      output,
    }
  }

  hyphenate(word, opts={}) {
    const msg = "Dictionary.hyphenate";
    const dbg = DBG.HYPHENATE;
    let parts = this.hyphenatePlain(word, opts);
    if (parts == null) {
      let entry = this.entryOf(word);
      if (entry) {
        parts = [word];
      }
    }

    return parts;
  }

  hyphenatePlain(word, opts={}) {
    const msg = "Dictionary.hyphenatePlain";
    const dbg = 1 || DBG.HYPHENATE;
    let parts;
    let wl = word.length;
    let {
      minLength=5, // minimum length of word parts
    } = opts;
    for (let pl=Math.floor(wl/2); !parts && minLength<=pl; pl--) {
      let left = word.substring(0,pl);
      let right = word.substring(pl);
      let eLeft = this.entryOf(left);
      let eRight = this.entryOf(right);
      let lparts = eLeft && 
        ( this.hyphenatePlain(left, opts) || [left] );
      let rparts = lparts && 
        ( this.hyphenatePlain(right, opts) || eRight && [right] );

      if (lparts && rparts) {
        parts = [ ...lparts, ...rparts ];
        dbg && console.log(msg, '[1]both', word, parts);
      } else if (lparts) {
        dbg && console.log(msg, '[1.1]left', left, right+'?');
      } else if (rparts) {
        dbg && console.log(msg, '[1.2]right', left+'?', right);
      } else {
        dbg>1 && console.log(msg, '[1.3]skip', left, right);
      }
    }

    return parts;
  }
}
