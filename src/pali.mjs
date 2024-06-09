export default class Pali {
  static #OCBS_ALPHABET = [
    'a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o', 
    'k', 'kh', 'g', 'gh', 
    'ṅ', 'c', 'ch', 'j', 'jh', 
    'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 
    'ṇ', 't', 'th', 'd', 'dh', 
    'n', 'p', 'ph', 'b', 'bh', 
    'm', 'y', 'r', 'l', 'ḷ', 'ḷh', 'v', 's', 'h',
  ];
  static #OCBS_CHAR_ORDER;

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

  compareOCBS(s1,s2) {
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
}
