import fs from 'node:fs';
import path from 'node:path';
const { dirname: __dirname } = import.meta;
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
      let da = new DpdAligner();
    } catch (e) {
      eCaught = e;
    }
    should(eCaught.message).match(/create\?/);
  });
  it('create', () => {
    let authorLegacy = 'wijayaratna';
    let lang = 'fr';
    let da = TEST_ALIGNER;
    should(da.tfidfSpace).instanceOf(TfidfSpace);
    should(da.authorLegacy).equal(authorLegacy);
    should(da.lang).equal(lang);
    let { msdpd, tfidfSpace } = da;
    should(tfidfSpace).instanceOf(TfidfSpace);
    should(msdpd).instanceOf(Dictionary);
  });
  it('fetchMLDoc', async () => {
    const msg = 'tp9r.fetchMLDoc:';
    let da = TEST_ALIGNER;
    let mn8 = await da.fetchMLDoc('mn8');
    should(mn8.author_uid).equal('ms');
    should(mn8.lang).equal('pli');
    let seg1_1 = mn8.segMap['mn8:1.1'];
    should(seg1_1.pli).equal('Evaṁ me sutaṁ—');
  });
  it('bowOfSegment', () => {
    const msg = 'tp9r.bowOfSegment:';
    const dbg = 0;
    let da = TEST_ALIGNER;
    should(da).instanceOf(DpdAligner);
    let seg = { scid: 'mn8:1.1', pli: 'Evaṁ me sutaṁ—' };
    let bow = da.bowOfSegment(seg);
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
  it('bowOfText()', () => {
    let da = TEST_ALIGNER;
    let text = "j'ai entendu que c'est vrai";
    let bow = da.bowOfText(text);
    should.deepEqual(
      bow,
      new WordVector({
        entendu: 1,
        j_ai: 1,
        c_est: 1,
        que: 1,
        vrai: 1,
      }),
    );
  });
  it('TESTTESTaddCorpusSutta()', async () => {
    const msg = 'td8r.addCorpusSutta:';
    const dbg = 0;
    let suid = 'mn8';
    let lang = 'fr';
    let authorLegacy = 'wijayaratna';
    let da = await DpdAligner.create({ lang, authorLegacy });
    await da.addCorpusSutta(suid);
    let { wordDocCount } = da.tfidfSpace.corpus;
    let words = Object.keys(wordDocCount);
    words.sort((a, b) => wordDocCount[a] - wordDocCount[b]);

    // Least distinctive words in MN8 corpus of MSDPD/FR definitions
    should.deepEqual(words.slice(words.length - 5), [
      '(pour)',
      'est',
      'le',
      'un',
      'de',
    ]);
    let mostUsed = words.at(-1);
    should(wordDocCount[mostUsed]).equal(159);

    if (DBG.D8R_WRITE_CORPUS_MN8) {
      let { corpus } = da.tfidfSpace;
      let pathOut = path.join(__dirname, '../../local/mn8-corpus.json');
      fs.writeFileSync(pathOut, JSON.stringify(corpus, null, 1));
    }

    let { tfidfSpace:ts } = da;
    let mn8Mohan = await da.fetchMLDoc('mn8/fr/wijayaratna');
    let scid = 'mn8:1.2';
    let mohanA = mn8Mohan.segMap['mn8:1.2'];
    let mohanB = mn8Mohan.segMap['mn8:2.1'];
    let vMohanA = ts.tfidf(mohanA.fr);
    let vMohanB = ts.tfidf(mohanB.fr);
    let docInfo1_1 = ts.corpus.getDocument('mn8:1.1');
    let v1_1 = ts.tfidfOfBow(docInfo1_1.bow);
    let docInfo1_2 = ts.corpus.getDocument('mn8:1.2');
    let v1_2 = ts.tfidfOfBow(docInfo1_2.bow);
    let docInfo2_1 = ts.corpus.getDocument('mn8:2.1');
    let v2_1 = ts.tfidfOfBow(docInfo2_1.bow);

    // Match vMohanA
    let sim1_1A = v1_1.similar(vMohanA);
    let sim1_2A = v1_2.similar(vMohanA);
    let sim2_1A = v2_1.similar(vMohanA);
    // Match vMohanB
    let sim1_1B = v1_1.similar(vMohanB);
    let sim1_2B = v1_2.similar(vMohanB);
    let sim2_1B = v2_1.similar(vMohanB);
    dbg && console.log(msg, {
      mohanA, mohanA:mohanA.fr,
      sim1_1A, sim1_2A, sim2_1A,
      mohanB, mohanB:mohanB.fr,
      sim1_1B, sim1_2B, sim2_1B,
    });

    // Mohan first line should align with mn8:1.1
    should(sim1_1A).above(sim1_2A).above(sim2_1A);
    // Mohan second line should align with mn8:2.1
    should(sim2_1B).above(sim1_2B).above(sim1_1B);
  });
});
