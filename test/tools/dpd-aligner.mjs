import fs from 'node:fs';
import path from 'node:path';
import { Text } from '@sc-voice/tools';
import should from 'should';
const { WordVector, TfidfSpace } = Text;
import { Dictionary } from '../../main.mjs';
import { DBG } from '../../src/defines.mjs';
import { Tools } from '../../src/tools/main.mjs';
const { DpdAligner } = Tools;

let TEST_ALIGNER;

describe('dpd-aligner', () => {
  before(async () => {
    const msg = 'td8r.before:';
    let dbg = DBG.TD8R_BEFORE;
    let msStart = Date.now();
    TEST_ALIGNER = await DpdAligner.create({
      lang: 'fr',
      authorLegacy: 'wijayaratna',
    });
    let elapsed = ((Date.now() - msStart) / 1000).toFixed(3);
    dbg && console.log(msg, `${elapsed}s`);
  });
  it('default ctor', () => {
    let eCaught;
    try {
      let pa = new DpdAligner();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/create\?/);
  });
  it('TESTTESTcreate', () => {
    let authorLegacy = 'wijayaratna';
    let lang = 'fr';
    let pa = TEST_ALIGNER;
    should(pa.tfidfSpace).instanceOf(TfidfSpace);
    should(pa.authorLegacy).equal(authorLegacy);
    should(pa.lang).equal(lang);
    let { msdpd, tfidfSpace } = pa;
    should(tfidfSpace).instanceOf(TfidfSpace);
    should(msdpd).instanceOf(Dictionary);
  });
  it('fetchMLDoc', async () => {
    const msg = 'tp9r.fetchMLDoc:';
    let pa = TEST_ALIGNER;
    let mn8 = await pa.fetchMLDoc('mn8');
    should(mn8.author_uid).equal('ms');
    should(mn8.lang).equal('pli');
    let seg1_1 = mn8.segMap['mn8:1.1'];
    should(seg1_1.pli).equal('Evaṁ me sutaṁ—');
  });
  it('TESTTESTbowOfSegment', () => {
    const msg = 'tp9r.bowOfSegment:';
    const dbg = 0;
    let pa = TEST_ALIGNER;
    should(pa).instanceOf(DpdAligner);
    let seg = { scid: 'mn8:1.1', pli: 'Evaṁ me sutaṁ—' };
    let bow = pa.bowOfSegment(seg);
    should(bow).properties({
      entendu: 6, // relevant word
      le: 1, // noise word
      fils: 1, // irrelevant but from sutaṁ definition
      '(gramme)': 1, // a "meta" word providing dpd context
    });
    dbg && console.log(msg, bow);
  });
  it('normalizeFR', () => {
    let nfr = TfidfSpace.normalizeFR;
    should(nfr("d'entendu")).equal('de entendu');
  });
  it('TESTTESTbowOfText()', () => {
    let pa = TEST_ALIGNER;
    let text = "j'ai entendu que c'est vrai";
    let bow = pa.bowOfText(text);
    should.deepEqual(bow, new WordVector({
      entendu: 1,
      j_ai: 1,
      c_est: 1,
      que: 1,
      vrai: 1,
    }));
  });
});
