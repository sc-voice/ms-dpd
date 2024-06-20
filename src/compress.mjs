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

  async linesCompress(lines) {
    let prevLine = null;
    return lines.reduce((a,line)=>{
      if (prevLine) {
        let i = 0;
        for (; i<line.length; i++) {
          if (prevLine.charAt(i) !== line.charAt(i)) {
            break;
          }
        }
        prevLine = line;
        line = `${i}|${prevLine.substring(i)}`;
      } else {
        prevLine = line;
      }
      a.push(line);
      return a;
    }, []);
  }

  async linesDecompress(lines) {
    const msg = 'Compress.linesDecompress()';
    let prevLine;
    return lines.reduce((a,lc)=>{
      let parts = lc.split('|');
      switch (parts.length) {
        case 1:
          prevLine = lines[0];
          break;
        case 2: {
          let i = Number(parts[0]);
          lc = prevLine.substring(0, i) + parts[1];
          prevLine = lc;
        } break;
        default:
          throw new Error(`${msg} invalid input line: ${lc}`);
          break;
      }
      a.push(lc);
      return a;
    }, []);
  }
  
}
