
import { DBG } from './defines.mjs';
import { ABBREVIATIONS } from '../data/en/abbreviations.mjs';
import Table from './table.mjs';
import Pali from './pali.mjs';

import DPD_INFLECTIONS from '../data/dpd-inflections.mjs';

var INFLECTIONS;

export default class Inflection {
  constructor(opts={}) { 
    Object.assign(this, opts);
  }

  static get TABLE() {
    if (INFLECTIONS == null) {
      let tbl = new Table(DPD_INFLECTIONS);
      tbl.rows = tbl.rows.map(row=>new Inflection(row));
      INFLECTIONS = tbl;
    }
    return INFLECTIONS;
  }

  static titleOfId(id) {
    const msg = "Inflection.titleOfId()";
    const dbg = 0;
    let info = Inflection.attribute(id);
    let title = info.id
      ? info.name
      : Table.titleOfId(id);
    dbg && console.log(msg, {title, info});
    return Table.titleOfId(title);
  }

  static cellValue(s,id) {
    let info = Inflection.attribute(s);
    if (info.id == null) {
      return s;
    } 
    return info.name;
  }

  static attributeTable(opts) {
    let tblOpts = opts || {
      title: "Inflection.attributeTable()",
      titleOfId: Inflection.titleOfId,
    }
    return Table.fromRows(Inflection.#ATTRIBUTES, tblOpts);
  }

  static #compareString(a,b) {
    const msg = 'Inflectin.compareString()';
    const dbg = 0;
    if (a === b) {
      dbg && console.log(msg, '[1]===');
      return 0;
    } else if (a==null && b) {
      dbg && console.log(msg, '[2]aNull');
      return -1;
    } else if (a && b==null) {
      dbg && console.log(msg, '[3]bNull');
      return 1;
    }

    dbg && console.log(msg, '[4]compareRoman');
    return Pali.compareRoman(a, b);
  }

  static compare(a,b) {
    const msg = "Inflection.compare()";
    const dbg = 0;
    if (a === b) {
      dbg && console.log(msg, '[0]===');
      return 0;
    } else if (a==null && b) {
      dbg && console.log(msg, '[1]a:null');
      return -1;
    } else if (a && b==null) {
      dbg && console.log(msg, '[2]b:null');
      return 1;
    }
    let cmp;

    cmp = Inflection.#compareString(a.like, b.like);
    if (cmp) { 
      dbg && console.log(msg, '[3]like');
      return cmp;
    }

    cmp = Inflection.#compareString(a.type, b.type);
    if (cmp) { 
      dbg && console.log(msg, '[4]type');
      return cmp;
    }

    switch (a.type) {
      case undefined:
      case 'dcl': {
        let aGender = Inflection.attribute(a.gdr);
        let bGender = Inflection.attribute(b.gdr);
        cmp = aGender.order - bGender.order;
        if (cmp) { 
          dbg && console.log(msg, '[5]gdr');
          return cmp;
        }

        let aNumber = Inflection.attribute(a.nbr);
        let bNumber = Inflection.attribute(b.nbr);
        cmp = aNumber.order - bNumber.order;
        if (cmp) { 
          dbg && console.log(msg, '[6]nbr');
          return cmp;
        }

        let aCase = Inflection.attribute(a.case);
        let bCase = Inflection.attribute(b.case);
        cmp = aCase.order - bCase.order;
        if (cmp) { 
          dbg && console.log(msg, '[7]case');
          return cmp;
        }

        dbg && console.log(msg, '[8]dcl');
        return cmp;
      } break;
      default:
        dbg && console.log(msg, '[9]type?', a.type);
        break;
    }

    cmp = Inflection.#compareString(a.pat, b.pat);
    if (cmp) { 
      dbg && console.log(msg, '[10]pat');
      return cmp;
    }

    cmp = Inflection.#compareString(a.word, b.word);
    if (cmp) { 
      dbg && console.log(msg, '[11]word');
      return cmp;
    }

    return cmp;
  }

  static #parseDpdInfDatum(row, opts={}) {
    const msg = `#parseDpdInfDatum()`;
    let {
      pattern,
      inflections,
      like,
    } = opts;
    const dbg = 0;
    const dbgv = 0;
    let dbgmsg;
    let dbgvmsg;
    let rowType = row.c1[0];
    let keys = Object.keys(row);
    switch (rowType) {
      case undefined:
      case '': 
        rowType = 'title'; 
        dbgv && console.log(msg, 
          `${pattern} ["${row[0]}", "${row[1]}",...]`);
        break;
      case 'nom':
      case 'acc':
      case 'instr':
      case 'dat':
      case 'abl':
      case 'gen':
      case 'loc':
      case 'voc': {
        rowType = 'declension';
        for (let i=2; i<keys.length; i+=2) {
          let suffixes = row[`c${i}`];
          suffixes.forEach((sfx,j)=>{
            let key = row[`c${i+1}`];
            if ((key instanceof Array) && key.length===1) {
              key = key[0];
            }
            let keyParts = key.split(' ');
            let info = keyParts.reduce((a,kp)=>{
              let kpi = Inflection.attribute(kp);
              if (kpi) {
                let attr = Inflection.attribute(kpi?.type);
                if (attr) {
                  a[attr.id] = kp;
                }
              }
              return a;
            }, {
              type:'dcl',
              gdr:undefined,
              nbr:undefined,
              case:undefined,
              [Inflection.attribute('suffix').id]:sfx, 
              pat:pattern, 
              like, 
            });
            inflections.push(new Inflection(info));
            dbg && console.log(msg, '[1]info', JSON.stringify(info));
          }); // suffixes
        }
      } break;
      case 'in comps':
        break;
      default:
        dbgv && console.log(msg,
          `...${pattern} [${row[0]}, ${row[1]}, ...] IGNORED`);
        break;
    }

    return this;
  }

  static parseDpdInflection(dpdInf, inflections=[]) {
    const msg = "Inflection.parseDpdInflection()";
    let dbg = 0;
    dpdInf = dpdInf.replace(/ṃ/g, 'ṁ');
    let [ pattern, like, data ] = dpdInf.split('|');
    
    let dpdData = JSON.parse(data);
    dbg && console.log(msg, '[1]parse', {pattern, like, data});
    let headers = dpdData.reduce((a,row,i)=>{
      for (let i=a.length; i<row.length; i++) {
        a.push({id:`c${i+1}`});
      }
      return a;
    }, []);
    dpdData.forEach(row=>{
      row.forEach((c,i)=>{
        if (c?.length === 1) {
          if (!c[0]) {
            row[i] = null;
          }
        }
      });
    });
    let srcTable = Table.fromArray2(dpdData, {
      headers,
      title: `srcTable pattern:${pattern} like:${like}`,
      titleOfId: Inflection.titleOfId,
    });

    srcTable.rows.forEach((row, iRow) => {
      dbg && console.log(msg, `[2]row${iRow}`, row);
      Inflection.#parseDpdInfDatum(row, {
        pattern, like, inflections
      });
    });

    return { pattern, like, srcTable, inflections}
  }

  static attribute(idOrName) {
    let attrs = Inflection.#ATTRIBUTES.filter(attr=>{
      return attr.id===idOrName || attr.name===idOrName; 
    });
    return attrs[0] || {
      type:'unknown', id:null, order:-1, name:'unknown', use:'unknown'
    }
  }

  static xfind(filter=(inf=>true)) {
    const msg = "Inflection.find()";
    const dbg = 0;
    console.log(msg, "DEPRECATED. Use Inflection.select");
    let infTable = Inflection.TABLE.filter(filter);
    if (dbg) {
      infTable.title = `${msg} [1]infTable`;
      infTable.caption = filter.toString();
      console.log(infTable.format());
    }
    return infTable.rows;
  }

  static select(filter=(inf=>true)) {
    const msg = "Inflection.select()";
    const dbg = 0;
    let infTable = Inflection.TABLE.filter(filter);
    if (dbg) {
      infTable.title = `${msg} [1]infTable`;
      infTable.caption = filter.toString();
      console.log(infTable.format());
    }

    dbg && console.log(msg, '[1]rows', infTable.rows.length);
    return infTable;
  }

  static union(...args) {
    const msg = "Inflection.union()";
    let agg = args.flat().reduce((a,inf,i)=>{
      if (!(inf instanceof Inflection)) {
        throw new Error(`${msg} Inflection[${i}]? ${inf}`);
      }
      let agg = Inflection.#KEYS.forEach(k=>{
        let akv = a[k];
        let ikv = inf[k];
        if (akv instanceof Array) {
          if (ikv instanceof Array) {
            let map = {};
            akv = [...akv, ...ikv].sort().filter(v=>{
              if (map[v]) {
                return false;
              }
              map[v] = true;
              return true;
            });
            a[k] = akv.length > 1 ? akv : (akv[0] || null);
          } else if (akv.indexOf(ikv) < 0) {
            if (ikv) {
              akv.push(ikv);
              a[k] = akv.sort();
            }
          } else {
            // ignore existing value
          }
        } else if (ikv != null) {
          if (akv == null) {
            a[k] = ikv;
          } else if (akv !== ikv) {
            a[k] = akv < ikv
              ? [akv, ikv].flat()
              : [ikv, akv].flat();
          }
        }
      });
      return a;
    }, {})
    return new Inflection(agg);
  }

  get isEmpty() {
    return Inflection.#KEYS.reduce((a,k)=>(a && this[k]==null), true);
  }

  union(...args) {
    return Inflection.union(this, ...args);
  }

  matchesWord(word, opts={}) {
    const msg = 'Inflection.matchesWord()';
    const dbg = 0;

    if (word && this.sfx && !word.endsWith(this.sfx)) {
      dbg && console.log(msg, '[1]word', word);
      return false;
    }
    if (opts.nbr && opts.nbr!==this.nbr ) {
      dbg && console.log(msg, '[2]nbr');
      return false;
    }
    if (opts.gdr && opts.gdr!==this.gdr ) {
      dbg && console.log(msg, '[3]gdr');
      return false;
    }
    if (opts.case && opts.case!==this.case ) {
      dbg && console.log(msg, '[4]case');
      return false;
    }
    let { stem  } = opts;
    if (stem) {
      if (!word || this.sfx==null ||
        word.length!==stem.length+this.sfx.length) {
        dbg && console.log(msg, '[5]stem');
        return false;
      }
    }

      dbg && console.log(msg, '[5]==');
    return true;
  }

//////////////// PRIVATE ////////////////////
  static #KEYS = [
    "id",
    "pat",
    "like",
    "type",
    "sfx",
    "gdr",
    "case",
    "nbr",
  ];

  static #ATTRIBUTE_UNKNOWN = 
    {type:'attribute', id:null, order:0, name:'unknown', 
      use:'unknown inflection attribute'};
  static #ATTRIBUTES = [
    Inflection.#ATTRIBUTE_UNKNOWN,
    {type:'attribute', id:'attr', order:0, name:'attribute', 
      use:'inflection attribute'},
    {type:'attribute', id:'like', order:1, name:'like', use:'Pali word'},
    {type:'attribute', id:'type', order:2, name:'type', 
      use:'dcl/cnj/...'},
    {type:'attribute', id:'pat', order:3, name:'pattern', 
      use:'search parameters'},
    {type:'attribute', id:'gdr', order:4, name:'gender', 
      use:'masc/fem/nt'},
    {type:'attribute', id:'nbr', order:5, name:'number', use:'sg/pl'},
    {type:'attribute', id:'case', order:6, name:'case', 
      use:'nom/acc/instr/dat/abl/gen/loc/voc'},
    {type:'attribute', id:'sfx', order:7, name:'suffix', use:"-a/-o"},

    {type:'number', id:'sg', order:1, name:'singular', 
      use:"I, you, he/it/she"},
    {type:'number', id:'pl', order:2, name:'plural', use:"we/they"},


    {type:'type', id:'dcl', order:1, name:'declension', 
      use:"noun/nouns"},
    {type:'type', id:'cnj', order:2, name:'conjugation', 
      use:"hear/heard"},

    {type:'gdr', id: 'nt', name:'neuter', order:0, use:'it'},
    {type:'gdr', id: 'masc', name:'masculine', order:1, use:'he'},
    {type:'gdr', id: 'fem', name:'feminine', order:2, use:'she'},
    {type:'gdr', id:'x', name:'(no gender)', order:3, use:'I, you'},

    {type:'case', id:'nom', order:1, name:"nominative", use:"subject"},
    {type:'case', id:'acc', order:2, name:"accusative", use:"object"},
    {type:'case', id:'instr', order:3, name:"instrumental", 
      use:"by, with"},
    {type:'case', id:'dat', order:4, name:"dative", use:"to, for"},
    {type:'case', id:'abl', order:5, name:"ablative", use:"from"},
    {type:'case', id:'gen', order:6, name:"genitive", use:"of"},
    {type:'case', id:'loc', order:7, name:"locative", use:"in, at, on"},
    {type:'case', id:'voc', order:8, name:"vocative", use:"(the)"},
  ];
}
