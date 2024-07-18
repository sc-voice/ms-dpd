
import { DBG } from './defines.mjs';
import { ABBREVIATIONS } from '../data/en/abbreviations.mjs';
import { DPD } from '../data/en/dpd.mjs';
import { DPD_TEXTS } from '../data/en/dpd-text.mjs';
import Pali from './pali.mjs';

export default class Inflection {
  constructor(opts={}) {
    Inflection.#KEYS.forEach(k=>{
      this[k] = opts[k] || null;
    });
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

    return cmp;
  }

  static attribute(idOrName) {
    switch (idOrName) {
      case 'gdr':
      case 'gender': return {type:'attribute',
        id:'gdr', order:1, name:'gender', use:'masc/fem/nt'};
      case 'nbr':
      case 'number': return {type:'attribute',
        id:'nbr', order:1, name:'number', use:'sg/pl'};
      case 'case':
      case 'inflection_case':
      case 'case': return {type:'attribute',
        id:'case', order:2, name:'inflection_case', 
        use:'nom/acc/instr/dat/abl/gen/loc/voc'
      };
        
      case 'sg':
      case 'single': return {type:'number', 
        id:'sg', order:1, name:'singular', use:"I, you, he/it/she"};
      case 'pl':
      case 'plural': return {type:'number', 
        id:'pl', order:2, name:'plural', use:"we/they"};

      case 'nt':
      case 'neuter': return { type:'gender', 
        id: 'nt', name:'neuter', order:0, use:'it'
      };
      case 'masc': 
      case 'masculine': return { type:'gender', 
        id: 'masc', name:'masculine', order:1, use:'he'
      };
      case 'fem':
      case 'feminine': return { type:'gender', 
        id: 'fem', name:'feminine', order:2, use:'she'
      };

      case 'nom': 
      case 'nominative': return {type:'case', 
        id:'nom', order:1, name:"nominative", use:"subject"};
      case 'acc':
      case 'accusative': return {type:'case', 
        id:'acc', order:2, name:"accusative", use:"object"};
      case 'instr':
      case 'instrumental': return {type:'case', 
        id:'instr', order:3, name:"instrumental", use:"by, with"};
      case 'dat':
      case 'dative': return {type:'case', 
        id:'dat', order:4, name:"dative", use:"to, for"};
      case 'abl':
      case 'ablative': return {type:'case', 
        id:'abl', order:5, name:"ablative", use:"from"};
      case 'gen':
      case 'genitive': return {type:'case', 
        id:'gen', order:6, name:"genitive", use:"of"};
      case 'loc':
      case 'locative': return {type:'case', 
        id:'loc', order:7, name:"locative", use:"in, at, on"};
      case 'voc':
      case 'vocative': return {type:'case', 
        id:'voc', order:8, name:"vocative", use:"(the)"};
    }
    return {
      type:'unknown', id:null, order:-1, name:'unknown', use:'unknown'
    };
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
}
