import { default as LZString } from 'lz-string';

export default class Compress {
  constructor(opts={}) {
    let {
      dict
    } = opts;
    Object.assign(this, {
      dict,
    });
  }
    
  // Javascript string to LZW unicode16 string
  async lzwCompress(s) { 
    return LZString.compress(s);
  }

  // LZW unicode16 string to Javascript string
  async lzwDecompress(s16) {
    return LZString.decompress(s16);
  }
  
}
