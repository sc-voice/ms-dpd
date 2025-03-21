import { DBG } from './defines.mjs';

// DEPRECATED
import { OCBS_INFLECTIONS } from './ocbs-inflections.mjs';

export default class Pali {
  static get INFLECTIONS() {
    // DEPRECATED
    return OCBS_INFLECTIONS;
  }
  static #ENDINGS;
  static #ENDING_MAX_LEN;
  static #STEM_RE;
  static #OCBS_ALPHABET = [
    'a',
    'ā',
    'i',
    'ī',
    'u',
    'ū',
    'e',
    'o',
    'ṃ',
    'ṁ',
    'k',
    'kh',
    'g',
    'gh',
    'ṅ',
    'c',
    'ch',
    'j',
    'jh',
    'ñ',
    'ṭ',
    'ṭh',
    'ḍ',
    'ḍh',
    'ṇ',
    't',
    'th',
    'd',
    'dh',
    'n',
    'p',
    'ph',
    'b',
    'bh',
    'm',
    'y',
    'r',
    'l',
    'ḷ',
    'ḷh',
    'v',
    's',
    'h',
  ];
  static #OCBS_CHAR_ORDER;
  static #ROMAN_ALPHABET = [
    'a',
    'ā',
    'b', //'bh',
    'c', //'ch',
    'd', //'dh',
    'ḍ', //'ḍh',
    'e',
    'g', //'gh',
    'h',
    'i',
    'ī',
    'j', //'jh',
    'k', //'kh',
    'l',
    'ḷ', //'ḷh',
    'm',
    'ṁ',
    'ṃ',
    'n',
    'ñ',
    'ṅ',
    'ṇ',
    'o',
    'p', //'ph',
    'r',
    's',
    't', //'th',
    'ṭ', //'ṭh',
    'u',
    'ū',
    'v',
    'y',
  ];
  static #ROMAN_ORDER;

  constructor(opts = {}) {}

  static get ENDING_MAX_LEN() {
    if (Pali.#ENDING_MAX_LEN == null) {
      let maxLen = Pali.ENDINGS.reduce(
        (a, e) => Math.max(a, e.length),
        0,
      );
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
      Pali.#OCBS_CHAR_ORDER = Pali.#OCBS_ALPHABET.reduce(
        (a, c, i) => {
          a[c] = i;
          return a;
        },
        {},
      );
    }
    return Pali.#OCBS_CHAR_ORDER;
  }

  static get ROMAN_ORDER() {
    if (Pali.#ROMAN_ORDER == null) {
      let alphabet = ['-', ...Pali.#ROMAN_ALPHABET];
      Pali.#ROMAN_ORDER = alphabet.reduce((a, c, i) => {
        a[c] = i;
        return a;
      }, {});
    }
    return Pali.#ROMAN_ORDER;
  }

  static compareOCBS(s1, s2) {
    let cmp = 0;
    let order = Pali.OCBS_CHAR_ORDER;

    for (let i = 0; i < s1.length; i++) {
      let c1 = s1.charAt(i);
      let c2 = s2.charAt(i);
      cmp = order[c1] - order[c2];
      if (cmp) {
        return cmp;
      }
    }

    return cmp;
  }

  static compareRoman(s1, s2) {
    const msg = 'Pali.compareRoman()';
    const dbg = 0;
    let cmp = 0;
    let order = Pali.ROMAN_ORDER;

    if (s1 === s2) {
      dbg && console.log(msg, '[1]===');
      return 0;
    }
    if (s1 && s2 == null) {
      dbg && console.log(msg, '[2]s2Null');
      return 1;
    }
    if (s1 == null && s2) {
      dbg && console.log(msg, '[3]s1Null');
      return -1;
    }

    for (let i = 0; !cmp && i < s1.length; i++) {
      let c1 = s1.charAt(i);
      let c2 = s2.charAt(i);
      if (c1 == null) {
        dbg && console.log(msg, '[4]c1Null');
        cmp = -1;
      }
      if (c2 == null) {
        dbg && console.log(msg, '[5]c2Null');
        cmp = 1;
      } else {
        cmp = order[c1] - order[c2];
        dbg && console.log(msg, '[6]cmp', cmp);
      }
      //console.log(msg, {cmp, c1, c2});
    }
    if (cmp == 0) {
      cmp = s1.length < s2.length ? -1 : cmp;
      dbg && console.log(msg, '[7]cmp', cmp);
    }

    return cmp;
  }

  static get ENDINGS() {
    if (Pali.#ENDINGS == null) {
      let endMap = Pali.INFLECTIONS.reduce((a, inf) => {
        let { singular, plural } = inf;
        if (singular instanceof Array) {
          singular.forEach((s) => {
            a[s] = 1;
          });
        } else {
          a[singular] = 1;
        }
        if (plural instanceof Array) {
          plural.forEach((s) => {
            a[s] = 1;
          });
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
}
