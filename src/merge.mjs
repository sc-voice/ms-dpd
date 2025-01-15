import { DBG } from './defines.mjs';
import { default as HeadwordKey } from './headword-key.mjs';

const dbg = DBG.MERGE;

export class Patch {
  constructor(opts={}) {
    this.add = opts.add || {};
    this.delete = opts.delete || {};
  }

  static from(arg) {
    const msg = 'Patch.from:';
    if (typeof arg === 'string') {
      return Patch.fromString(arg);
    }

    if (arg instanceof Patch) {
      return arg;
    }

    throw new Error(`${msg} string or Patch? (${arg})`);
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
    this.srcPatch = Patch.from(srcPatch);
  }

  // restore missing head items
  patchHead(dst, srcPatch) {
    const msg = "Merge.patchHead:";
    const dbg = DBG.MERGE;
    let { srcBase, baseKeys } = this;
    let added = [];
    baseKeys.forEach(key=>{
      if (dst[key]==null && srcPatch.delete[key]==null) {
        let value = srcBase[key];
        dst[key] = value;
        dbg && console.log(msg, `[1]+${key}`, value);
        added.push[key];
      }
    }, {});

    return { dst, added };
  }

  patch(dstBase, srcPatch=this.srcPatch) {
    const msg = "Merge.patch:";
    const dbg = DBG.MERGE;
    const { srcBase, baseKeys } = this;

    let dst = Object.assign({}, dstBase);
    let delKeys =  Object.keys(srcPatch.delete);
    let addKeys =  Object.keys(srcPatch.add);
    dbg && console.log({delKeys, addKeys});
    let ignored = 0;

    let conflicts = {};
    let updated = {};
    let result = {
      conflicts,
      deleted:[], 
      added:[],
      dst,
    };
    result = delKeys.reduce((a,key)=>{
      let valDstHead = dst[key];
      let valSrcBase = srcBase[key];
      let valSrcNew = srcPatch.add[key];

      if (valDstHead === valSrcNew) {
        if (valSrcNew == null) { // really a delete
          ignored++; // already patched
          dbg>1 && console.log(msg, '[1]ignore', key, valDstHead);
        }
      } else if (valDstHead !== valSrcBase) {
        let conf = {
          dstHead: valDstHead,
          srcNew: valSrcNew,
          srcBase: valSrcBase,
        }
        dbg>1 && console.log(msg, '[2]conflict', key, conf);
        conflicts[key] = conf;
      } else if (valSrcNew) { 
        dst[key] = valSrcNew;
        updated[key] = true;
        dbg && console.log(msg, '[3]update', key);
      } else {
        delete dst[key];
        a.deleted.push(key);
        dbg && console.log(msg, '[4]delete', key);
      }
      return a;
    }, result);
    addKeys.forEach(key=>{
      let valDstHead = dst[key];
      let valSrcNew = srcPatch.add[key];
      if (valDstHead == null) {
        dst[key] = valSrcNew;
        result.added.push(key);
        dbg && console.log(msg, '[5]add', key);
      } else if (valDstHead === valSrcNew) {
        if (!updated[key]) {
          ignored++;
          dbg>1 && console.log(msg, '[6]ignore', key, valDstHead);
        }
      } else if (conflicts[key]==null) {
        conflicts[key] = {
          dst: valDstHead,
          src: valSrcNew,
        }
        // unexpected conflict should never happen
        console.log(msg, '[7]CONFLICT?', key, {
          valDstHead, valSrcNew});
      }
    });
    let { added } = this.patchHead(dst, srcPatch);

    result.added = [...result.added, ...added ];
    result.ignored = ignored;
    result.updated = Object.keys(updated);
    result.changed = 
      result.added.length + 
      result.deleted.length + 
      result.updated.length;

    return result;
  }
}
