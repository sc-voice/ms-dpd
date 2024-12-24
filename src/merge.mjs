import { DBG } from './defines.mjs';

const dbg = DBG.MERGE;

export class Patch {
  constructor(opts={}) {
    this.add = opts.add || {};
    this.delete = opts.delete || {};
  }

  static fromString(sPatch) {
    const msg = "Patch.fromString:";
    const dbg = DBG.PARSE_PATCH || DBG.MERGE>1;
    if (typeof sPatch !== 'string') {
      throw new Error(`${msg} sPatch:string?`);
    }
    let lines = sPatch.split('\n');
    let deleted = lines.filter(line=> /^[+-] /m.test(line));
      
    let patch = lines.reduce((a,line)=>{
      let [ na0, key, na1, change, na3 ] = line.split('"');
      if (/^- /.test(line)) {
        a.delete[key] = change;
      }
      if (/^\+ /.test(line)) {
        a.add[key] = change;
      }
      return a;
    }, new Patch());
    dbg && console.log(msg, patch);
    return patch;
  }
}

export class Merge {
  constructor(opts={}) {
    let {
      srcBase,  // EN base
      srcPatch, // git diff COMMIT -- EN_DEFINITIONS
    } = opts;
    if (srcBase == null) {
      throw new Error(`${msg} srcBase?`);
    }
    this.baseKeys = Object.keys(srcBase);
    this.srcBase = srcBase;
    this.srcPatch = srcPatch;
  }

  // restore missing base items
  patchBase(dst) {
    const msg = "Merge.patchBase:";
    const dbg = DBG.MERGE;
    let { srcBase, baseKeys } = this;
    baseKeys.forEach(key=>{
      if (dst[key] == null) {
        let value = srcBase[key];
        dst[key] = value;
        console.log(msg, `[1]+${key}`, value);
      }
    }, {});

    return dst;
  }

  patch(dstBase, srcPatch=this.srcPatch) {
    const msg = "Merge.patch:";
    const dbg = DBG.MERGE;
    const { srcBase, baseKeys } = this;

    let dst = Object.assign({}, dstBase);
    dst = this.patchBase(dst);
    let delKeys =  Object.keys(srcPatch.delete);
    let addKeys =  Object.keys(srcPatch.add);
    console.log({delKeys, addKeys});

    let conflicts = {};
    delKeys.forEach(key=>{
      let valDstHead = dst[key];
      let valSrcBase = srcBase[key];
      let valSrcNew = srcPatch.add[key];

      if (valDstHead !== valSrcBase) {
        conflicts[key] = {
          dst: valDstHead,
          src: valSrcNew,
        }
      } else if (valSrcNew) { 
        dst[key] = valSrcNew;
      } else {
        delete dst[key];
      }
    });
    addKeys.forEach(key=>{
      let valDstHead = dst[key];
      let valSrcNew = srcPatch.add[key];
      if (valDstHead == null) {
        dst[key] = valSrcNew;
      }
    });


    return {
      conflicts,
      dst
    };
  }
}
