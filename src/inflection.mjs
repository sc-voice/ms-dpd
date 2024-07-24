
import { DBG } from './defines.mjs';
import { ABBREVIATIONS } from '../data/en/abbreviations.mjs';
import { DPD } from '../data/en/dpd.mjs';
import { DPD_TEXTS } from '../data/en/dpd-text.mjs';
import Pali from './pali.mjs';
import Table from './table.mjs';

export default class Inflection {
  constructor(opts={}) { 
    Object.assign(this, opts);
  }

  static attributes(opts) {
    let tblOpts = opts || {
      title: "Inflection.attributes()",
    }
    return Table.fromRows(Inflection.#ATTRIBUTES, tblOpts);
  }

  static compare(a,b) {
    if (a === b) {
      return 0;
    } else if (a==null && b) {
      return -1;
    } else if (a && b==null) {
      return 1;
    }
    let cmp;

    let aGender = Inflection.attribute(a.gender);
    let bGender = Inflection.attribute(b.gender);
    cmp = aGender.order - bGender.order;
    if (cmp) { return cmp; }

    let aCase = Inflection.attribute(a.case);
    let bCase = Inflection.attribute(b.case);
    cmp = aCase.order - bCase.order;
    if (cmp) { return cmp; }

    let aNumber = Inflection.attribute(a.nbr);
    let bNumber = Inflection.attribute(b.nbr);
    cmp = aNumber.order - bNumber.order;

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
    let group;
    let keys = Object.keys(row);
    switch (rowType) {
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
          let data = row[`c${i}`];
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
            pat:pattern, 
            like, 
            infl:'dcl',
            suffix:data, 
          });
          inflections.push(new Inflection(info));
          dbg && console.log(msg, '[1]info', JSON.stringify(info));
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

  static parseDpdInflectionTemplate(dpdInf, opts={}) {
    const msg = "Inflection.parseDpdInflectionTemplate()";
    let dbg = 0;
    let {
      filterCase,
      verbose,
      textOut,
    } = opts;
    let [ pattern, like, data ] = dpdInf.split('|');
    
    let srcRows = JSON.parse(data);
    let group;
    let inflections = [];
    let lastRow = srcRows.at(-1);
    //let in_comps = lastRow[0][0];
    //let comps = lastRow[1].join(',');
    dbg && console.log(msg, {pattern, like, comps});
    let showSrc = !!textOut;
    let headers = srcRows.reduce((a,row,i)=>{
      for (let i=a.length; i<row.length; i++) {
        a.push({id:`c${i+1}`});
      }
      return a;
    }, []);
    srcRows.forEach(row=>{
      row.forEach((c,i)=>{
        if (c?.length === 1) {
          if (!c[0]) {
            row[i] = null;
          }
        }
      });
    });
    let srcTable = Table.fromArray2(srcRows, {
      headers,
      title: `srcTable pattern:${pattern} like:${like}`,
    });

    srcTable.rows.forEach((row, iRow) => {
      dbg && console.log(msg, row);
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

  static find(filter=(inf=>true)) {
    let inflections = Inflection.#ALL.reduce((a,inf)=>{
      inf = new Inflection(inf);
      if (filter(inf)) {
        a.push(new Inflection(inf));
      }
      return a;
    }, []);
    return inflections;
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
    const dbg = DBG.MATCHES_WORD;
    let { stem, singular, plural, gender } = opts;
    if (singular == null && plural==null) {
      singular = true;
      plural = true;
    }
    let endings = [];
    singular && endings.push(this.singular);
    plural && endings.push(this.plural);
    endings = endings.flat().filter(end=>!!end);;
    if (stem) {
      let endLen = word.length - stem.length;
      dbg && console.log(msg, {stem, endings});
      endings = endings.filter(end=>end && (end.length === endLen));
    }

    return endings
      .reduce((a,end)=>(a || word.endsWith(end)), false);
  }

//////////////// PRIVATE ////////////////////
  static #KEYS = [
    "id",
    "type",
    "group",
    "gender",
    "case",
    "singular",
    "plural",
  ];

  static #ALL = Pali.INFLECTIONS.map(inf=>new Inflection(inf));
  
  static #ATTRIBUTE_UNKNOWN = 
    {type:'attribute', id:null, order:0, name:'unknown', 
      use:'unknown inflection attribute'};
  static #ATTRIBUTES = [
    Inflection.#ATTRIBUTE_UNKNOWN,
    {type:'attribute', id:'attr', order:1, name:'attribute', 
      use:'inflection attribute'},
    {type:'attribute', id:'gdr', order:2, name:'gender', 
      use:'masc/fem/nt'},
    {type:'attribute', id:'nbr', order:3, name:'number', use:'sg/pl'},
    {type:'attribute', id:'case', order:4, name:'inflection_case', 
      use:'nom/acc/instr/dat/abl/gen/loc/voc'},
    {type:'attribute', id:'infl', order:5, name:'inflection', 
      use:'inflection group'},
    {type:'attribute', id:'pat', order:7, name:'pattern', 
      use:'search parameters'},

    {type:'number', id:'sg', order:1, name:'singular', 
      use:"I, you, he/it/she"},
    {type:'number', id:'pl', order:2, name:'plural', use:"we/they"},

    {type:'inflection', id:'dcl', order:1, name:'declension', 
      use:"noun/nouns"},
    {type:'inflection', id:'cnj', order:2, name:'conjugation', 
      use:"hear/heard"},

    {type:'gender', id: 'nt', name:'neuter', order:0, use:'it'},
    {type:'gender', id: 'masc', name:'masculine', order:1, use:'he'},
    {type:'gender', id: 'fem', name:'feminine', order:2, use:'she'},
    {type:'gender', id:'x', name:'(no gender)', order:3, use:'I, you'},

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
