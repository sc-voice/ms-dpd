import fs from 'node:fs';
import path from 'node:path';
const { dirname: __dirname } = import.meta;
import { ScvMath, Translate } from '@sc-voice/tools';
import { SuidMap, SuttaRef } from 'scv-esm/main.mjs';
import { Dictionary, HeadwordKey } from '../../main.mjs';
import { DBG } from '../../src/defines.mjs';
const { Fraction } = ScvMath;

const { DeepLAdapter } = Translate;

const DPD_PATH = path.join(__dirname, '../../dpd');
const AUTH_PATH = path.join(__dirname, '../../local/deepl.auth');
const AUTH_KEY = fs.readFileSync(AUTH_PATH).toString().trim();

export class Translator {
  static #create = false;

  constructor(opts = {}) {
    const msg = 't8r.ctor:';
    if (!Translator.#create) {
      throw new Error(`${msg} create?`);
    }
    Object.assign(this, opts);
  }

  static async create(opts = {}) {
    const msg = 't8r.create:';
    let {
      authKey = AUTH_KEY, // local/deepl.auth
      deeplAdapter, // DeepLAdapter
      dict, // Dictionary
      dstDefs, // dstLang definition map
      dstLang, // translation destination language
      srcDefs, // srcLang definition map
      srcLang = 'en', // DPD language (EN, RU)
      translateTexts, // function to translate String array
      forceRaw = false, // retranslate raw translated texts
    } = opts;
    if (translateTexts == null) {
      const dbg = DBG.TRANSLATE_TEXTS;
      if (deeplAdapter == null) {
        if (dstLang == null) {
          throw new Error(`${msg} dstLang?`);
        }
        dbg &&
          console.log(msg, '[1]deeplAdapter', { srcLang, dstLang });
        deeplAdapter = await DeepLAdapter.create({
          authKey,
          srcLang,
          dstLang,
        });
      }
      dbg && console.log(msg, '[2]translateTexts');
      translateTexts = async (texts) => {
        const msg = 't8r.translateTexts';
        let translation = await deeplAdapter.translate(texts);
        dbg &&
          console.log(msg, '[3]translation', { texts, translation });
        return translation;
      };
    }
    if (dict == null) {
      dict = await Dictionary.create();
    }
    if (srcDefs == null) {
      srcDefs = await Translator.loadDefinitions(srcLang);
    }
    if (dstDefs == null) {
      dstDefs = await Translator.loadDefinitions(dstLang);
    }
    Translator.#create = true;
    let instance = new Translator({
      srcLang,
      dstLang,
      srcDefs,
      dstDefs,
      dict,
      charsTranslated: new Fraction(0, 0, 'chars'),
      forceRaw,
    });
    let fCountChars = (texts) => {
      instance.charsTranslated.n += texts.reduce(
        (a, t) => a + t.length,
        0,
      );
      return translateTexts(texts);
    };
    instance.translateTexts = fCountChars;
    Object.defineProperty(instance, 'deeplAdapter', {
      value: deeplAdapter,
    });
    Translator.#create = false;
    return instance;
  }

  static async loadDefinitions(lang) {
    const msg = 't8r.loadDefinitions:';
    if (lang == null) {
      throw new Error(`${msg} lang?`);
    }
    let defPath = path.join(DPD_PATH, lang, `definition-${lang}.mjs`);
    let { DEF_LANG } = await import(defPath);
    return DEF_LANG;
  }

  async translateWordDefs(paliWord, translatedDefs = {}) {
    const msg = 't8r.translateWordDefs:';
    const dbg = DBG.TRANSLATE_WORD_DEFS;
    const VERT_BARS  = 2;
    let { 
      forceRaw, translateTexts, dict, srcDefs, dstDefs 
    } = this;
    let { word, keys } = dict.wordDefinitionKeys(paliWord);
    if (keys == null) {
      dbg && console.log(msg, '[1]!definition', paliWord);
      return translatedDefs;
    }
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let srcVal = srcDefs[key] || '||';
      let dstVal = dstDefs[key] || '||';
      let same = srcVal === dstVal;
      let isCooked = dstVal.charAt(0) !== '|';
      this.charsTranslated.d += srcVal.length - VERT_BARS;
      let skip = translatedDefs[key] || 
        !same && !forceRaw ||
        !same && isCooked;
      if (skip) {
        dbg && console.log(msg, '[1]skip', key, dstVal);
        continue;
      }

      let [meaning_1, meaning_raw, meaning_lit] = srcVal.split('|');
      let cooked = meaning_1 && (await translateTexts([meaning_1]));
      let raw =
        !cooked &&
        meaning_raw &&
        (await translateTexts([meaning_raw]));
      let lit =
        meaning_lit && (await translateTexts([meaning_lit]));
      dbg &&
        console.log(msg, '[1]translate', {
          srcVal,
          dstVal,
          cooked,
          raw,
          lit,
        });
      translatedDefs[key] = `|${cooked[0] || raw[0]}|${lit && lit[0]}`;
    }

    return translatedDefs;
  } // translateWordDefs

  async translateTextDefs(paliText, translatedDefs = {}) {
    const msg = 't8r.translateTextDefs:';
    const dbg = DBG.TRANSLATE_TEXT_DEFS;
    let text = Dictionary.normalizePattern(paliText);
    let words = text.trim().split(/ +/);
    dbg && console.log(msg, words);
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      await this.translateWordDefs(word, translatedDefs);
    }
  }

  async translateSuttaRef(sref, translatedDefs = {}) {
    const msg = 't8r.translateSuttaRef:';
    const dbg = DBG.TRANSLATE_SUTTA_REF;
    let { sutta_uid, segnum, scid } = sref;
    if (sutta_uid == null) {
      throw new Error(`${msg} sref.sutta_uid? ${sref}`);
    }
    let pliPath = [
      'local/ebt-data/root/pli/ms',
      SuidMap[sutta_uid]?.['root/pli/ms'],
      `${sutta_uid}_root-pli-ms.json`,
    ].join('/');
    if (!fs.existsSync(pliPath)) {
      throw new Error(`${msg} pliPath? ${pliPath}`);
    }
    let segMap = JSON.parse(fs.readFileSync(pliPath));
    let scids = segnum ? [scid] : Object.keys(segMap);
    dbg > 1 && console.log(msg, '[1]pliPath', pliPath);

    for (let i = 0; i < scids.length; i++) {
      let scid = scids[i];
      let pli = segMap[scid];
      await this.translateTextDefs(pli, translatedDefs);
      console.log(msg, `[2]${scid}`, this.charsTranslated.toString());
      dbg > 1 &&
        console.log(msg, '[2]translateTextDefs', { scid, pli });
    }
    dbg &&
      console.log(
        msg,
        '[3]translated',
        this.charsTranslated.toString(),
        sref.toString(),
      );
    dbg > 1 &&
      console.log(msg, '[3.1]translatedDefs', translatedDefs);
    return translatedDefs;
  }

  definitionPath(lang = this.dstLang) {
    const msg = 't84.definitionPath';
    let fname = `definition-${lang}.mjs`;
    return path.join(__dirname, '../../dpd', lang, fname);
  }

  async writeDefinitions(fpath, map) {
    const msg = 't84.writeDefinitions';
    let dbg = DBG.WRITE_DEFINITIONS;
    let decl = 'export const DEF_LANG=';
    let hwKeys = Object.keys(map).sort((a, b) => {
      let an = HeadwordKey.toNumber(a);
      let bn = HeadwordKey.toNumber(b);
      return an - bn;
    });
    let iLast = hwKeys.length - 1;
    let aOut = [
      decl + '{',
      ...hwKeys.map((key, i) => {
        let v = JSON.stringify(map[key]);
        let sep = i < iLast ? ',' : '';
        return ` "${key}": ${v}${sep}`;
      }),
      '}\n',
    ];
    let dirName = path.dirname(fpath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    await fs.promises.writeFile(fpath, aOut.join('\n'));
    dbg && console.error(msg, `[1]${aOut.length}`, fpath);
  }
}
