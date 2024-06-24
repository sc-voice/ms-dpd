export default class Pali {
  static #OCBS_ALPHABET = [
    'a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o', 'ṃ',
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
    'b', 'bh', 
    'c', 'ch', 
    'd', 'dh', 
    'ḍ', 'ḍh', 
    'e', 
    'g', 'gh', 
    'h',
    'i', 'ī', 
    'j', 'jh', 
    'k', 'kh', 
    'l', 
    'ḷ', 'ḷh', 
    'm', 
    'ṃ',
    'n', 'ñ', 'ṅ', 'ṇ', 
    'o', 
    'p', 'ph', 
    'r', 
    's', 
    't', 'th', 'ṭ', 'ṭh', 
    'u', 'ū', 
    'v', 
    'y', 
  ];
  static #ROMAN_ORDER;
  static #CASE = {
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
      let alphabet = Pali.#OCBS_ALPHABET;
      Pali.#ROMAN_ORDER = Pali.#ROMAN_ALPHABET.reduce((a,c,i)=>{
        a[c] = i;
        return a;
      }, {});
    }
    return Pali.#ROMAN_ORDER;
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

    return cmp;
  }

  reverse(s) {
    let chars = s.split('').reverse();
    return chars.join('');
  }
}
