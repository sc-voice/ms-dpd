import should from "should";
//import fs from 'node:fs';
//import path from 'node:path';
//const { dirname:__dirname } = import.meta;
import { Translator } from "../scripts/js/translator.mjs";
import { DBG } from '../src/defines.mjs';
import { 
  Dictionary,
} from '../main.mjs';
import { Translate } from '@sc-voice/tools';
const {
  DeepLAdapter,
} = Translate;


describe("translator", function () {
  it("default constructor", () => {
    let eCaught;
    try {
      let trans = new Translator();
    } catch(e) { eCaught = e; }
    should(eCaught.message).match(/create\?/);
  });
  it("create", async ()=>{
    const msg = 'td8r.custom-ctor';
    let dstLang = 'fr';
    let trans = await Translator.create({dstLang});
    should(typeof trans.translateTexts).equal('function');
    should(trans.srcDefs['4iV']).match(/yes!/);
    should(trans.dstDefs['4iV']).match(/Oui/);
    if (DBG.DEEPL_LIVE_API) {
      console.log(msg, 'DEEPL_LIVE_API ($$$)');
      let res = await trans.translateTexts(['so i have heard']);
      should.deepEqual(res, ["C'est ce que j'ai entendu dire"]);
    }

    // dstDefs can be provided by caller
    let dstDefs = {};
    let trans2 = await Translator.create({dstLang, dstDefs});
    should(trans2.dstDefs).equal(dstDefs);
  });
  it("translateTexts", async ()=>{
    const msg = 'td8r.custom-ctor';
    let dstLang = 'fr';
    let translateTexts = (texts)=>texts.map(t=>`${t}-translated`);
    let trans = await Translator.create({dstLang, translateTexts});
    should.deepEqual(
      trans.translateTexts(['a','b']), 
      [ 'a-translated', 'b-translated' ],
    );
  });
  it('loadDefinitions', async ()=>{
    const msg = 'td8r.loadDefinitions:';
    let enDefs = await Translator.loadDefinitions('en');
    should(enDefs['4iV']).match(/.*; correct!../);
  });
  it('translateWordDefs() raw', async()=>{
    const msg = 'tt8r.translateWordDefs-raw:';
    let dstLang = 'fr';
    let srcDefs = {
      '4iU': '|u-raw1|u-lit1', // src changed
      '4iV': '|v-raw0|v-lit0', // src unchanged
    }
    let dstDefs = {
      '4iU': '|u-raw0-t1|u-lit0-t1', // old translation t1
      '4iV': '|v-raw0|v-lit0', // never translated
    };
    let translateTexts = 
      (texts)=>texts.map(t=>t?`${t}-t2`:t);
    let trans = await Translator.create({
      translateTexts, srcDefs, dstLang, dstDefs,
    });
    let paliWord = 'evaṁ';
    let translated = await trans.translateWordDefs(paliWord);
    should.deepEqual(translated, {
      '4iU': '|u-raw1-t2|u-lit1-t2',
      '4iV': '|v-raw0-t2|v-lit0-t2',
    });
  });
  it('translateWordDefs() cooked', async()=>{
    const msg = 'tt8r.translateWordDefs-cooked:';
    let translated = {};
    let dstLang = 'fr';
    let srcDefs = {
    //'4iU': 'u-cooked0|u-raw0|u-lit0', // src original
      '4iU': 'u-cooked1|u-raw1|u-lit1', // src changed
      '4iV': 'v-cooked0|v-raw0|v-lit0', // src unchanged
    }
    let dstDefs = {
      '4iU': 'u-cooked0-t1|u-raw0-t1|u-lit0-t1', // old translation t1
      '4iV': 'v-cooked0|v-raw0|v-lit0', // untranslated
    };
    let translateTexts = 
      (texts)=>texts.map(t=>t?`${t}-t2`:t);
    let trans = await Translator.create({
      translateTexts, srcDefs, dstLang, dstDefs,
    });
    let paliWord = 'evaṁ';
    await trans.translateWordDefs(paliWord, translated);
    should.deepEqual(translated, {
      '4iV': '|v-cooked0-t2|v-lit0-t2',
    });
  });
  it('translateWordDefs() deepl', async()=>{
    const msg = 'tt8r.translateWordDefs-deepl:';
    let translated = {};
    let dstLang = 'pt';
    let dstDefs = {}; //force translation
    let trans = await Translator.create({ dstLang, dstDefs });
    let paliWord = 'evaṁ';
    if (DBG.DEEPL_TEST_API) {
      await trans.translateWordDefs(paliWord, translated);
      should.deepEqual(translated, {
        '4iU': '|assim; este; como este; similarmente; da mesma maneira; tal como; tal|',
        '4iV': '|sim!; é isso mesmo!; correto!|',
      });
      console.log(msg, {paliWord, translated});
    } else {
      console.log(msg, '!DEEPL_TEST_API');
    }
  });
  it('TESTTESTtranslateTextDefs() mock', async()=>{
    const msg = 'tt8r.translateTextDefs:';
    let translated = {};
    let paliText = 'Evaṁ me sutaṁ.';
    let dstDefs = {};
    let dstLang = 'pt';
    let translateTexts = // mock translation 
      (texts)=>texts.map(t=>t?`${t}-pt`:t);
    let trans = await Translator.create({
      translateTexts, dstLang, dstDefs,
    });
    await trans.translateTextDefs(paliText, translated);
    //console.log(msg, {translated});
    should.deepEqual(translated, {
      '4iU': '|thus; this; like this; similarly; in the same manner; just as; such-pt|',
      '4iV': '|yes!; that is right!; correct!-pt|',
      '2pI': '|I-pt|', 
      D7K: '|(gram) ma; verbal ending of the present tense 1st person plural-pt|', 
      D7N: '|(gram) letter m; 31st letter of the alphabet; nasal consonant-pt|',  
      DYr: '|moon-pt|',
      DYs: '|(gram) √mā (measure)-pt|',
      DpT: '|myself; me (object)-pt|',
      DpU: '|by me-pt|',
      DpV: '|to me; for me-pt|',
      DpW: '|from me-pt|',
      DpX: '|my; mine-pt|',
      DpY: '|when I; since I-pt|',
      GaX: '|heard-pt|',
      GaY: '|learned-pt|heard-pt',
      GaZ: '|what is heard; something heard-pt|heard-pt',
      Gaa: '|learning; knowledge-pt|heard-pt',
      Gab: '|son-pt|',
      Gb7: '|daughter-pt|'
    });
  });
  it('TESTTESTtranslateTextDefs() cooked', async()=>{
    const msg = 'tt8r.translateTextDefs:';
    let translated = {};
    let paliText = 'Evaṁ me sutaṁ.';
    let dstLang = 'pt';
    let translateTexts = // mock translation 
      (texts)=>texts.map(t=>t?`${t}-pt`:t);
    let trans = await Translator.create({
      translateTexts, dstLang, 
    });
    await trans.translateTextDefs(paliText, translated);
    //console.log(msg, {translated});
    should.deepEqual(translated, {
      //'4iU': '|thus; this; like this; similarly; in the same manner; just as; such-pt|',
      //'4iV': '|yes!; that is right!; correct!-pt|',
      '2pI': '|I-pt|', 
      D7K: '|(gram) ma; verbal ending of the present tense 1st person plural-pt|', 
      D7N: '|(gram) letter m; 31st letter of the alphabet; nasal consonant-pt|',  
      DYr: '|moon-pt|',
      DYs: '|(gram) √mā (measure)-pt|',
      DpT: '|myself; me (object)-pt|',
      DpU: '|by me-pt|',
      DpV: '|to me; for me-pt|',
      DpW: '|from me-pt|',
      DpX: '|my; mine-pt|',
      DpY: '|when I; since I-pt|',
      GaX: '|heard-pt|',
      GaY: '|learned-pt|heard-pt',
      GaZ: '|what is heard; something heard-pt|heard-pt',
      Gaa: '|learning; knowledge-pt|heard-pt',
      Gab: '|son-pt|',
      Gb7: '|daughter-pt|'
    });
  });
});
