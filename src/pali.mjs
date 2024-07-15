import { INFLECTIONS } from '../data/inflections-ocbs.mjs';
import { DBG } from './defines.mjs';

export default class Pali {
  static #ENDINGS;
  static #ENDING_MAX_LEN;
  static #STEM_RE;
  static #OCBS_ALPHABET = [
    'a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o', 
    'ṃ', 'ṁ',
    'k', 'kh', 'g', 'gh', 
    'ṅ', 'c', 'ch', 'j', 'jh', 
    'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 
    'ṇ', 't', 'th', 'd', 'dh', 
    'n', 'p', 'ph', 'b', 'bh', 
    'm', 'y', 'r', 'l', 'ḷ', 'ḷh', 'v', 's', 'h',
  ];
  static #OCBS_CHAR_ORDER;
  static #ROMAN_ALPHABET = [
    'a', 'ā', 
    'b', //'bh', 
    'c', //'ch', 
    'd', //'dh', 
    'ḍ', //'ḍh', 
    'e', 
    'g', //'gh', 
    'h',
    'i', 'ī', 
    'j', //'jh', 
    'k', //'kh', 
    'l', 
    'ḷ', //'ḷh', 
    'm', 
    'ṁ',
    'ṃ',
    'n', 'ñ', 'ṅ', 'ṇ', 
    'o', 
    'p', //'ph', 
    'r', 
    's', 
    't', //'th', 
    'ṭ', //'ṭh', 
    'u', 'ū', 
    'v', 
    'y', 
  ];
  static #ROMAN_ORDER;
  static #INFLECTION_CASE = {
    NOM: {id:"nom", name:"nominative", use:"subject"},
    ACC: {id:"acc", name:"accusative", use:"object"},
    INSTR: {id:"ins", name:"instrumental", use:"by, with"},
    DAT: {id:"dat", name:"dative", use:"to, for"},
    ABL: {id:"abl", name:"ablative", use:"from"},
    GEN: {id:"gen", name:"genitive", use:"of"},
    LOC: {id:"loc", name:"locative", use:"in, at, on"},
    VOC: {id:"voc", name:"vocative", use:"(the)"},
  }

  constructor(opts={}) {
  }

  static get INFLECTIONS() {
    return INFLECTIONS;
  }

  static get ENDING_MAX_LEN() {
    if (Pali.#ENDING_MAX_LEN == null) {
      let maxLen = Pali.ENDINGS.reduce((a,e)=>Math.max(a, e.length), 0);
      Pali.#ENDING_MAX_LEN = maxLen; // ignore dash
    }
    return Pali.#ENDING_MAX_LEN;
  }

  static get OCBS_ALPHABET() {
    return Pali.#OCBS_ALPHABET;
  }

  static get OCBS_CHAR_ORDER() {
    if (Pali.#OCBS_CHAR_ORDER == null) {
      let alphabet = Pali.#OCBS_ALPHABET;
      Pali.#OCBS_CHAR_ORDER = Pali.#OCBS_ALPHABET.reduce((a,c,i)=>{
        a[c] = i;
        return a;
      }, {});
    }
    return Pali.#OCBS_CHAR_ORDER;
  }

  static get ROMAN_ORDER() {
    if (Pali.#ROMAN_ORDER == null) {
      let alphabet = ['-', ...Pali.#ROMAN_ALPHABET];
      Pali.#ROMAN_ORDER = alphabet.reduce((a,c,i)=>{
        a[c] = i;
        return a;
      }, {});
    }
    return Pali.#ROMAN_ORDER;
  }

  static compareStem(a, b) {
    const msg = "Pali.compareStem()";
    const dbg = 1;
    console.log(dbg, "DEPRECATD");
    let order = Pali.ROMAN_ORDER;
    let a0 = a.charAt(0);
    let b0 = b.charAt(0);
    let cmp = order[a0] - order[b0];
    if (cmp) {
      dbg && console.log(msg, '[1]', {cmp, a,b});
      return cmp;
    }

    let aStem = Pali.wordStem(a);
    let bStem = Pali.wordStem(b);
    cmp = Pali.compareRoman(aStem, bStem);
    if (cmp) {
      dbg && console.log(msg, '[2]', {cmp, a,b,aStem, bStem});
      return cmp;
    }

    cmp = Pali.compareRoman(a,b);
    dbg && console.log(msg, '[3]', {cmp, a,b});

    return cmp;
  }

  static compareOCBS(s1,s2) {
    let cmp = 0;
    let order = Pali.OCBS_CHAR_ORDER;

    for (let i=0; i<s1.length; i++) {
      let c1 = s1.charAt(i);
      let c2 = s2.charAt(i);
      cmp = order[c1] - order[c2];
      if (cmp) {
        return cmp;
      }
    }

    return cmp;
  }

  static compareRoman(s1,s2) {
    const msg = 'Pali.compareRoman()';
    let cmp = 0;
    let order = Pali.ROMAN_ORDER;

    for (let i=0; !cmp && i<s1.length; i++) {
      let c1 = s1.charAt(i);
      let c2 = s2.charAt(i);
      if (c1 == null) {
        cmp = -1;
      } if (c2 == null) {
        cmp = 1;
      } else {
        cmp = order[c1] - order[c2];
      }
      //console.log(msg, {cmp, c1, c2});
    }
    if (cmp == 0) {
      cmp = (s1.length < s2.length) ? -1 : cmp;
    }
    //console.log(msg, {s1,s2,cmp});

    return cmp;
  }

  static get ENDINGS() {
    if (Pali.#ENDINGS == null) {
      let endMap = Pali.INFLECTIONS.reduce((a,inf)=>{
        let { singular, plural } = inf;
        if (singular instanceof Array) {
          singular.forEach(s=>{a[s] = 1});
        } else {
          a[singular] = 1;
        }
        if (plural instanceof Array) {
          plural.forEach(s=>{a[s] = 1});
        } else {
          a[plural] = 1;
        }
        return a;
      }, {});
      delete endMap.undefined; // for '-----' entries
      delete endMap.null; // 
      Pali.#ENDINGS = Object.keys(endMap).sort(Pali.compareRoman);
    }
    return Pali.#ENDINGS;
  }

  static wordStem(word) {
    const msg = 'Pali.wordStem()';
    const dbg = DBG.PALI;
    if (Pali.#STEM_RE == null) {
      let rends = Pali.ENDINGS
        .map(e=>e.split('').reverse().join(''))
        .sort(Pali.compareRoman)
        .reverse();
      let pat = `^(${rends.join('|')})`;
      Pali.#STEM_RE = new RegExp(pat);
      dbg && console.log(msg, '[1]#STEM_RE', Pali.#STEM_RE);
    }
    let rw = word.split('').reverse().join('');
    return rw.replace(Pali.#STEM_RE, '').split('').reverse().join('');
  }

}
