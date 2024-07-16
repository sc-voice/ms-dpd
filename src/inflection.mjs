
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
            akv.push(ikv);
            a[k] = akv.sort();
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

  union(...args) {
    return Inflection.union(this, ...args);
  }

  matchesWord(word, opts={singular:true, plural:true}) {
    let { singular, plural } = opts;
    let endings = [];
    singular && endings.push(this.singular);
    plural && endings.push(this.plural);
    return endings
      .flat()
      .reduce((a,end)=>(a || word.endsWith(end)), false);
  }

//////////////// PRIVATE ////////////////////
  static #KEYS = [
    "id",
    "type",
    "group",
    "gender",
    "infCase",
    "singular",
    "plural",
  ];

  static #ALL = Pali.INFLECTIONS.map(inf=>new Inflection(inf));
}
