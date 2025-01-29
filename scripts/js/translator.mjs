import fs from 'node:fs';
import path from 'node:path';
const { dirname:__dirname } = import.meta;
import { Translate } from '@sc-voice/tools';
import { DBG } from '../../src/defines.mjs';
import { Dictionary } from '../../main.mjs';

const {
  DeepLAdapter,
} = Translate;

const DPD_PATH = path.join(__dirname, '../../dpd');
const AUTH_PATH = path.join(__dirname, '../../local/deepl.auth');
const AUTH_KEY = fs.readFileSync(AUTH_PATH).toString().trim();

export class Translator {
  static #create = false;

  constructor(opts={}) {
    const msg = 't8r.ctor:';
    if (!Translator.#create) {
      throw new Error(`${msg} create?`);
    }
    Object.assign(this, opts);
  }

  static async create(opts={}) {
    const msg = 't8r.create:';
    let {
      deeplAdapter,
      translateTexts,
      authKey = AUTH_KEY,
      srcLang = 'en',
      dstLang,
      dstDefs,
      srcDefs,
      dict,
    } = opts;
    if (translateTexts == null) {
      const dbg = DBG.TRANSLATE_TEXTS;
      if (deeplAdapter == null) {
        if (dstLang == null) {
          throw new Error(`${msg} dstLang?`);
        }
        dbg && console.log(msg, '[1]deeplAdapter', {srcLang, dstLang});
        deeplAdapter = await 
          DeepLAdapter.create({ authKey, srcLang, dstLang });
      }
      dbg && console.log(msg, '[2]translateTexts');
      translateTexts = async (texts) => {
        const msg = 't8r.translateTexts';
        let translated = await deeplAdapter.translate(texts);
        dbg && console.log(msg, '[3]translated', {texts, translated});
        return translated;
      }
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
      translateTexts,
      srcDefs,
      dstDefs,
      dict,
    });
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

  async translateWordDefs(paliWord, translated={}) {
    const msg = 't8r.translateWordDefs:';
    const dbg = DBG.TRANSLATE_WORD_DEFS;
    let { translateTexts, dict, srcDefs, dstDefs } = this;
    let { word, keys } = dict.wordDefinitionKeys(paliWord);
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let srcVal = srcDefs[key] || '||';
      let dstVal = dstDefs[key] || '||';
      let unchanged = srcVal === dstVal;
      let isCooked = dstVal.charAt(0) !== '|'; 
      if (unchanged || !isCooked) {
        let [ meaning_1, meaning_raw, meaning_lit ] = srcVal.split('|');
        let cooked = meaning_1 && await translateTexts([meaning_1]);
        let raw = !cooked && meaning_raw && 
          await translateTexts([meaning_raw]);
        let lit = meaning_lit && await translateTexts([meaning_lit]);
        dbg && console.log(msg, '[1]translate', 
          {srcVal, dstVal, cooked, raw, lit});
        translated[key] = `|${cooked[0] || raw[0]}|${lit&&lit[0]}`;
      } else {
        dbg && console.log(msg, '[2]!translate', 
          {unchanged, isCooked, srcVal, dstVal});
      }
    }

    return translated;
  }

  async translateTextDefs(paliText, translated={}) {
    const msg = 't8r.translateTextDefs:';
    const dbg = DBG.TRANSLATE_TEXT_DEFS;
    let text = Dictionary.normalizePattern(paliText);
    let words = text.split(/ +/);
    dbg && console.log(msg, words);
    for (let i = 0; i < words.length; i++) {
      let word = words[i];
      await this.translateWordDefs(word, translated);
    }
  }
}
