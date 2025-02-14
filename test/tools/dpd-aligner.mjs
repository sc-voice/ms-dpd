import fs from 'node:fs';
import path from 'node:path';
import { Text } from '@sc-voice/tools';
import should from 'should';
const { TfidfSpace } = Text;
import { Dictionary } from '../../main.mjs';
import { Tools } from '../../src/tools/main.mjs';
const { DpdAligner } = Tools;

let TEST_ALIGNER;

describe('TESTTESTdpd-aligner', () => {
  before(async () => {
    TEST_ALIGNER = await DpdAligner.create({
      lang: 'fr',
      authorLegacy: 'wijayaratna',
    });
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
  it('create', async () => {
    let authorLegacy = 'wijayaratna';
    let lang = 'fr';
    let pa = await DpdAligner.create({ lang, authorLegacy });
    should(pa.tfidfSpace).instanceOf(TfidfSpace);
    should(pa.authorLegacy).equal(authorLegacy);
    should(pa.lang).equal(lang);
    let { msdpd, tfidfSpace } = pa;
    should(tfidfSpace).instanceOf(TfidfSpace);
    should(tfidfSpace.normalizeText).equal(TfidfSpace.normalizeFR);
    should(msdpd).instanceOf(Dictionary);
  });
  it('fetchMLDoc', async () => {
    const msg = 'tp9r.fetchMLDoc:';
    let authorLegacy = 'wijayaratna';
    let lang = 'fr';
    let pa = await DpdAligner.create({ lang, authorLegacy });
    let mn8 = await pa.fetchMLDoc('mn8');
    should(mn8.author_uid).equal('ms');
    should(mn8.lang).equal('pli');
    let seg1_1 = mn8.segMap['mn8:1.1'];
    should(seg1_1.pli).equal('Evaṁ me sutaṁ—');
    //console.log(msg, seg1_1);
  });
  it('addCorpusSegment', () => {
    const msg = 'tp9r.addCorpusSegment:';
    let pa = TEST_ALIGNER;
    should(pa).instanceOf(DpdAligner);
    let seg = { scid: 'mn8:1.1', pli: 'Evaṁ me sutaṁ—' };
    pa.addCorpusSegment(seg);
  });
  it('normalizeFR', () => {
    let nfr = TfidfSpace.normalizeFR;
    should(nfr("d'entendu")).equal('de entendu');
  });
});
