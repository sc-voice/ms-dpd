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
      translateTexts,
      authKey = AUTH_KEY,
      srcLang = 'en',
      dstLang,
      dstDefs,
      srcDefs,
      dict,
    } = opts;
    let deeplAdapter;
    if (translateTexts == null) {
      if (deeplAdapter == null) {
        if (dstLang == null) {
          throw new Error(`${msg} dstLang?`);
        }
        deeplAdapter = await 
          DeepLAdapter.create({ authKey, srcLang, dstLang });
      }
      translateTexts = async (texts) => {
        return deeplAdapter.translate(texts);
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

  async translateWordDefs(paliWord) {
    const msg = 't8r.translateWordDefs:';
    let { translateTexts, dict, srcDefs, dstDefs } = this;
    let { word, keys } = dict.wordDefinitionKeys(paliWord);
    let translated = {};
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let srcVal = srcDefs[key];
      let dstVal = dstDefs[key];
      if (srcVal == dstVal || dstVal.charAt(0) === '|') {
        let transVal = translateTexts(srcVal.split('|'));
        if (transVal) {
          let [ cooked, raw, lit ] = transVal;
          translated[key] = `|${cooked || raw}|${lit}`;
        }
      }
    }

    return translated;
  }
}
