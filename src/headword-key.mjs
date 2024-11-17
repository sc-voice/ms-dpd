import { DBG } from './defines.mjs';
 
const SYMBOLS = 
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const RADIX = SYMBOLS.length;
let VALUES = SYMBOLS.split('').reduce((a,s,i)=>{
  a[s] = i;
  return a;
}, {});

export default class HeadwordKey {

  static get SYMBOLS() { return SYMBOLS };

  static fromNumber(num) {
    const msg = 'HeadwordKey.fromNumber';

    num = Number(num);
    if (isNaN(num)) {
      throw new Error(`${msg} NaN ${num}`);
    }
    if (num < 0) {
      throw new Error(`${msg} <0 ${num}`);
    }
    if (!num) {
      return '0';
    }

    var s = '';
    for (let n=num; n >= 1;) {
      let iSym = n - (RADIX * Math.floor(n / RADIX));
      s = SYMBOLS.at(iSym) + s;
      n = Math.floor(n / RADIX);
    }
    return s;
  }

  static toNumber(key) {
    const msg = 'HeadwordKey.toNumber';

    if (typeof key !== 'string') {
      throw new Error(`${msg} key? ${key}`);
    }

    let n = 0;
    let place = 1;
    for (let i=key.length-1; i>=0; i--) {
      let c = key[i];
      let v = VALUES[c];
      if (v === undefined) {
        throw new Error(`${msg} invalid ${key}`);
      }
      n += v * place;
      place = place * RADIX
    }

    return n;
  }
}
