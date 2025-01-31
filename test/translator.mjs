import fs from 'node:fs';
import path from 'node:path';
import should from 'should';
const { dirname: __dirname } = import.meta;
import { Translate } from '@sc-voice/tools';
import { SuttaRef } from 'scv-esm/main.mjs';
import { Dictionary } from '../main.mjs';
import { Translator } from '../scripts/js/translator.mjs';
import { DBG } from '../src/defines.mjs';
const { DeepLAdapter } = Translate;
const EN_DEFS = {
  '4iU':
    '|thus; this; like this; similarly; in the same manner; just as; such|',
  '4iV': '|yes!; that is right!; correct!|',
  '2pI': '|I|',
  D7K: '|(gram) ma; verbal ending of the present tense 1st person plural|',
  D7N: '|(gram) letter m; 31st letter of the alphabet; nasal consonant|',
  DYr: '|moon|',
  DYs: '|(gram) √mā (measure)|',
  DpT: '|myself; me (object)|',
  DpU: '|by me|',
  DpV: '|to me; for me|',
  DpW: '|from me|',
  DpX: '|my; mine|',
  DpY: '|when I; since I|',
  GaX: '|heard|',
  GaY: '|learned|heard',
  GaZ: '|what is heard; something heard|heard',
  Gaa: '|learning; knowledge|heard',
  Gab: '|son|',
  Gb7: '|daughter|',
}
const PT_DEFS = {
  '4iU':
    '|thus; this; like this; similarly; in the same manner; just as; such-pt|',
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
  Gb7: '|daughter-pt|',
}

describe('translator', () => {
  it('default constructor', () => {
    let eCaught;
    try {
      let trans = new Translator();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/create\?/);
  });
  it('create', async () => {
    const msg = 'tt8r.custom-ctor';
    let dstLang = 'fr';
    let trans = await Translator.create({ dstLang });
    should(trans.dstLang).equal(dstLang);
    should(typeof trans.translateTexts).equal('function');
    should(trans.srcDefs['4iV']).match(/yes!/);
    should(trans.dstDefs['4iV']).match(/Oui/);
    should(trans.forceRaw).equal(false);
    if (DBG.DEEPL_LIVE_API) {
      console.log(msg, 'DEEPL_LIVE_API ($$$)');
      let res = await trans.translateTexts(['so i have heard']);
      should.deepEqual(res, ["C'est ce que j'ai entendu dire"]);
    }

    // dstDefs can be provided by caller
    let dstDefs = {};
    let forceRaw = true;
    let trans2 = await Translator.create(
      { dstLang, dstDefs, forceRaw});
    should(trans2.forceRaw).equal(true);
    should(trans2.dstDefs).equal(dstDefs);
  });
  it('translateTexts', async () => {
    const msg = 'tt8r.custom-ctor';
    let dstLang = 'fr';
    let translateTexts = (texts) =>
      texts.map((t) => `${t}-translated`);
    let trans = await Translator.create({ dstLang, translateTexts });
    should.deepEqual(trans.translateTexts(['a', 'b']), [
      'a-translated',
      'b-translated',
    ]);
  });
  it('loadDefinitions', async () => {
    const msg = 'tt8r.loadDefinitions:';
    let enDefs = await Translator.loadDefinitions('en');
    should(enDefs['4iV']).match(/.*; correct!../);
  });
  it('translateWordDefs() raw', async () => {
    const msg = 'tt8r.translateWordDefs-raw:';
    let dstLang = 'fr';
    let srcDefs = {
      '4iU': '|u-raw1|u-lit1', // src changed
      '4iV': '|v-raw0|v-lit0', // src unchanged
    };
    let dstDefs = {
      '4iU': '|u-raw0-t1|u-lit0-t1', // old translation t1
      '4iV': '|v-raw0|v-lit0', // never translated
    };
    let translateTexts = (texts) =>
      texts.map((t) => (t ? `${t}-t2` : t));
    let trans = await Translator.create({
      translateTexts,
      srcDefs,
      dstLang,
      dstDefs,
    });
    let paliWord = 'evaṁ';
    should(trans.charsTranslated.toString()).equal('0/0 chars');
    let translated = await trans.translateWordDefs(paliWord);
    should(trans.charsTranslated.toString()).equal('12/24 chars');

    // Translate only once!
    await trans.translateWordDefs(paliWord, translated);
    should(trans.charsTranslated.toString()).equal('12/48 chars');

    should.deepEqual(translated, {
      '4iV': '|v-raw0-t2|v-lit0-t2',
    });
  });
  it('translateWordDefs() forceRaw', async () => {
    const msg = 'tt8r.translateWordDefs-raw:';
    let forceRaw = true;
    let dstLang = 'fr';
    let srcDefs = {
      '4iU': '|u-raw1|u-lit1', // src changed
      '4iV': '|v-raw0|v-lit0', // src unchanged
    };
    let dstDefs = {
      '4iU': '|u-raw0-t1|u-lit0-t1', // old translation t1
      '4iV': '|v-raw0|v-lit0', // never translated
    };
    let translateTexts = (texts) =>
      texts.map((t) => (t ? `${t}-t2` : t));
    let trans = await Translator.create({
      translateTexts,
      srcDefs,
      dstLang,
      dstDefs,
      forceRaw,
    });
    let paliWord = 'evaṁ';
    should(trans.charsTranslated.toString()).equal('0/0 chars');
    let translated = await trans.translateWordDefs(paliWord);
    should(trans.charsTranslated.toString()).equal('24/24 chars');

    // Translate only once!
    await trans.translateWordDefs(paliWord, translated);
    should(trans.charsTranslated.toString()).equal('24/48 chars');

    should.deepEqual(translated, {
      '4iU': '|u-raw1-t2|u-lit1-t2',
      '4iV': '|v-raw0-t2|v-lit0-t2',
    });
  });
  it('translateWordDefs() cooked', async () => {
    const msg = 'tt8r.translateWordDefs-cooked:';
    let translated = {};
    let dstLang = 'fr';
    let srcDefs = {
      //'4iU': 'u-cooked0|u-raw0|u-lit0', // src original
      '4iU': 'u-cooked1|u-raw1|u-lit1', // src changed
      '4iV': 'v-cooked0|v-raw0|v-lit0', // src unchanged
    };
    let dstDefs = {
      '4iU': 'u-cooked0-t1|u-raw0-t1|u-lit0-t1', // old translation t1
      '4iV': 'v-cooked0|v-raw0|v-lit0', // untranslated
    };
    let translateTexts = (texts) =>
      texts.map((t) => (t ? `${t}-t2` : t));
    let trans = await Translator.create({
      translateTexts,
      srcDefs,
      dstLang,
      dstDefs,
    });
    let paliWord = 'evaṁ';
    await trans.translateWordDefs(paliWord, translated);
    should.deepEqual(translated, {
      '4iV': '|v-cooked0-t2|v-lit0-t2',
    });
  });
  it('translateWordDefs() deepl', async () => {
    const msg = 'tt8r.translateWordDefs-deepl:';
    let translated = {};
    let dstLang = 'pt';
    let dstDefs = {}; //force translation
    let trans = await Translator.create({ dstLang, dstDefs });
    let paliWord = 'evaṁ';
    if (DBG.DEEPL_TEST_API) {
      await trans.translateWordDefs(paliWord, translated);
      should.deepEqual(translated, {
        '4iU':
          '|assim; este; como este; similarmente; da mesma maneira; tal como; tal|',
        '4iV': '|sim!; é isso mesmo!; correto!|',
      });
      console.log(msg, { paliWord, translated });
    } else {
      console.log(msg, '!DEEPL_TEST_API');
    }
  });
  it('translateTextDefs() mock', async () => {
    const msg = 'tt8r.translateTextDefs:';
    let translated = {};
    let paliText = 'Evaṁ me sutaṁ.';
    let srcDefs = Object.assign({}, EN_DEFS);
    let dstDefs = Object.assign({}, EN_DEFS);
    let dstLang = 'pt';
    let translateTexts = // mock translation
      (texts) => texts.map((t) => (t ? `${t}-pt` : t));
    let trans = await Translator.create({
      translateTexts,
      dstLang,
      dstDefs,
      srcDefs,
    });
    await trans.translateTextDefs(paliText, translated);
    //console.log(msg, {translated});
    should.deepEqual(translated, PT_DEFS);
  });
  it('translateTextDefs() cooked', async () => {
    const msg = 'tt8r.translateTextDefs:';
    let translated = {};
    let paliText = 'Evaṁ me sutaṁ.';
    let dstLang = 'pt';
    let translateTexts = // mock translation
      (texts) => texts.map((t) => (t ? `${t}-pt` : t));
    let trans = await Translator.create({
      translateTexts,
      dstLang,
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
      Gb7: '|daughter-pt|',
    });
  });
  it('translateSuttaRef() mn8:1.1', async () => {
    const msg = 'tt8r.translateSuttaRef-mn8:1.1';
    const dbg = 0;
    let sref = SuttaRef.create('mn8:1.1');
    let forceRaw = true;
    let dstLang = 'fr';
    let translateTexts = // mock translation
      (texts) => texts.map((t) => (t ? `${t}-fr` : t));
    let trans = await Translator.create({ 
      dstLang, translateTexts, forceRaw });
    let translated = await trans.translateSuttaRef(sref);
    should(trans.charsTranslated.toString()).equal('302/400 chars');
    should(translated['GaX']).equal('|heard-fr|');
    dbg && console.log(msg, translated);
  });
  it('TESTTESTtranslateSuttaRef() mn8:12.0', async () => {
    const msg = 'tt8r.translateSuttaRef-mn8:12.0';
    const dbg = 0;
    let sref = SuttaRef.create('mn8:12.0');
    let forceRaw = true;
    let dstLang = 'fr';
    let cbScid = [];
    let onTranslated = (scid) => cbScid.push(scid);
    let translateTexts = // mock translation
      (texts) => texts.map((t) => (t ? `${t}-fr` : t));
    let trans = await Translator.create({ 
      dstLang, translateTexts, forceRaw });
    let translatedDefs = {};
    let transOpts = { translatedDefs, onTranslated }
    await trans.translateSuttaRef(sref, transOpts);
    should(trans.charsTranslated.toString()).equal('34/34 chars');
    should.deepEqual(cbScid, [sref.scid]);
    dbg && console.log(msg, translatedDefs);
    should(translatedDefs['FvT']).match(/erasing-fr/);
  });
  it('TESTTESTtranslateSuttaRef() pli-tv-pvr2.14', async () => {
    const msg = 'tt8r.translateSuttaRef-pli-tv-pvr2.14:';
    const dbg = 0;
    let sref1 = SuttaRef.create('pli-tv-pvr2.14:1.1');
    let dstLang = 'fr';
    let createTranslator = (n) =>
      (texts) => texts.map((t) => (t ? `${t}-fr${n}` : t));
    let trans1 = await Translator.create({ 
      dstLang, 
      translateTexts: createTranslator(1),
    });
    let translatedDefs = await trans1.translateSuttaRef(sref1);
    should(trans1.charsTranslated.toString()).equal('669/1046 chars');
    should(translatedDefs['o8']).equal('|container-fr1|');
    dbg && console.log(msg, translatedDefs);

    let trans2 = await Translator.create({ 
      dstLang, 
      translateTexts: createTranslator(2),
    });
    await trans2.translateSuttaRef(sref1, {translatedDefs});
    should(translatedDefs['o8']).equal('|container-fr1|');
    should(translatedDefs['35T']).equal(undefined); // not in sref1
    should(trans2.charsTranslated.toString()).equal('0/1046 chars');

    let srefAll = SuttaRef.create('pli-tv-pvr2.14');
    await trans2.translateSuttaRef(srefAll, {translatedDefs});
    should(translatedDefs['o8']).equal('|container-fr1|'); // !forceRaw
    dbg && console.log(translatedDefs);
    should(translatedDefs['35T']).match(/wrongdoing-fr2/);
    should(trans2.charsTranslated.toString()).equal('487/4754 chars');
  });
  it('writeDefinitions()', async () => {
    const msg = 'tt8r.writeDefinitions:';
    const dbg = 0;
    let dstLang = 'fr';
    let trans = await Translator.create({ dstLang });
    let { dstDefs } = trans;
    let key = '90U';
    let defPath = `dpd/${dstLang}/definition-${dstLang}.mjs`;
    let testPath = `/tmp/dpd-test/${defPath}`;
    dbg && console.log(msg, { key, defPath }, dstDefs[key]);
    if (fs.existsSync(testPath)) {
      fs.rmSync(testPath);
    }
    await trans.writeDefinitions(testPath, dstDefs);
    let actual = fs.readFileSync(testPath).toString();
    let expPath = path.join(__dirname, '..', defPath);
    should(fs.existsSync(expPath)).equal(true);
    let expected = fs.readFileSync(expPath).toString();
    should(actual.substring(0, 200)).equal(
      expected.substring(0, 200),
    );
    should(actual.substring(actual.length - 200)).equal(
      expected.substring(expected.length - 200),
    );
    should(actual.trim()).equal(expected.trim());
  });
  it('definitionPath()', async () => {
    const msg = 'tt8r.definitionPath:';
    let dstLang = 'fr';
    let trans = await Translator.create({ dstLang });
    let frPath = trans.definitionPath();
    should(fs.existsSync(frPath)).equal(true);
    should(frPath).match(/dpd\/fr\/definition-fr.mjs/);

    let ptPath = trans.definitionPath('pt');
    should(fs.existsSync(ptPath)).equal(true);
    should(ptPath).match(/dpd\/pt\/definition-pt.mjs/);
  });
});
