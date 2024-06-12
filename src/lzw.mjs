const LZW_BITS = 8; // one byte
const MAX_CODE = Math.pow(2, LZW_BITS);
export default class Lzw {
  constructor(opts={}) {
    let {
      dict
    } = opts;
    Object.assign(this, {
      dict,
      encoder: new TextEncoder(),
      decoder: new TextDecoder(),
    });
  }
  
  base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m=>m.codePointAt(0));
  }

  bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
  }

  lzw_encode(s) {
    const msg = `Lzw.lzw_encode()`;
    let { encoder, dict } = this;
    dict = Object.assign({}, dict);

    var data = (s + "").split("");
    var out = [];
    var curChar;
    var phrase = data[0];
    let phraseCode = phrase.charCodeAt(0);
    var code = MAX_CODE;
    for (var i=1; i<data.length; i++) {
        curChar=data[i];
        let newPhrase = phrase + curChar;
        if (dict[newPhrase] != null) {
          phrase = newPhrase;
          phraseCode = phrase.charCodeAt(0);
        } else {
          let outCode = phrase.length > 1 
            ? dict[phrase] 
            : phraseCode;
          console.log(msg, {outCode, code, newPhrase});
          if (outCode >= MAX_CODE) {
            let emsg = `${msg} outCode(${outCode}) > MAX_CODE`;
            console.log(emsg);
            //throw new Error(emsg);
          }
          out.push(outCode);
          dict[newPhrase] = code;
          code++;
          phrase = curChar;
          phraseCode = phrase.charCodeAt(0);
        }
    }
    let outCode = phrase.length > 1 
      ? dict[phrase] 
      : phraseCode;
    if (outCode >= MAX_CODE) {
      let emsg = `${msg} outCode(${outCode}) > MAX_CODE`;
      //throw new Error(emsg);
    }
    console.log({outCode});
    out.push(outCode);
    for (var i=0; i<out.length; i++) {
      out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
  }

  lzw_decode(s) {
    const msg = `Lzw.lzw_decode()`;
    let { decoder, dict } = this;
    dict = Object.assign({}, dict);

    var data = (s + "").split("");
    var curChar = data[0];
    var oldPhrase = curChar;
    var out = [curChar];
    var code = MAX_CODE;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var curCode = data[i].charCodeAt(0);
        if (curCode < MAX_CODE) {
            phrase = data[i];
        }
        else {
           phrase = dict[curCode] 
            ? dict[curCode] 
            : (oldPhrase + curChar);
        }
        out.push(phrase);
        curChar = phrase.charAt(0);
        dict[code] = oldPhrase + curChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
  }

  encode(s) {
    const msg = `Lzw.encode()`;
    let { encoder, dict } = this;
    dict = Object.assign({}, dict);

    let bytes = encoder.encode(s);
    console.log(msg, bytes);

    /*
    var data = (bytes + "").split("");
    var out = [];
    var curChar;
    var phrase = data[0];
    let phraseCode = phrase.charCodeAt(0);
    var code = MAX_CODE;
    for (var i=1; i<data.length; i++) {
        curChar=data[i];
        let newPhrase = phrase + curChar;
        if (dict[newPhrase] != null) {
          phrase = newPhrase;
          phraseCode = phrase.charCodeAt(0);
        } else {
          let outCode = phrase.length > 1 
            ? dict[phrase] 
            : phraseCode;
          console.log(msg, {outCode, code, newPhrase});
          if (outCode >= MAX_CODE) {
            let emsg = `${msg} outCode(${outCode}) > MAX_CODE`;
            console.log(emsg);
            //throw new Error(emsg);
          }
          out.push(outCode);
          dict[newPhrase] = code;
          code++;
          phrase = curChar;
          phraseCode = phrase.charCodeAt(0);
        }
    }
    let outCode = phrase.length > 1 
      ? dict[phrase] 
      : phraseCode;
    if (outCode >= MAX_CODE) {
      let emsg = `${msg} outCode(${outCode}) > MAX_CODE`;
      //throw new Error(emsg);
    }
    console.log({outCode});
    out.push(outCode);
    for (var i=0; i<out.length; i++) {
      out[i] = String.fromCharCode(out[i]);
    }
    return out.join("");
    */

    return this.bytesToBase64(bytes);
  }

  decode(s) {
    const msg = `Lzw.decode()`;
    let { decoder, dict } = this;
    dict = Object.assign({}, dict);

    let bytes = this.base64ToBytes(s);

    /*
    var data = (s + "").split("");
    var curChar = data[0];
    var oldPhrase = curChar;
    var out = [curChar];
    var code = MAX_CODE;
    var phrase;
    for (var i=1; i<data.length; i++) {
        var curCode = data[i].charCodeAt(0);
        if (curCode < MAX_CODE) {
            phrase = data[i];
        }
        else {
           phrase = dict[curCode] 
            ? dict[curCode] 
            : (oldPhrase + curChar);
        }
        out.push(phrase);
        curChar = phrase.charAt(0);
        dict[code] = oldPhrase + curChar;
        code++;
        oldPhrase = phrase;
    }
    return out.join("");
    */

    return decoder.decode(this.base64ToBytes(s));
  }
}
