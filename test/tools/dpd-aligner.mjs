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
let SREF = 'mn8/fr/wijayaratna';

describe('dpd-aligner', () => {
  before(async () => {
    const msg = 'td8r.before:';
    let dbg = DBG.TD8R_BEFORE;
    let msStart = Date.now();
    TEST_ALIGNER = await DpdAligner.createSuttaAligner(SREF);
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
  it('TESTTESTcreate', () => {
    let author = 'wijayaratna';
    let lang = 'fr';
    let da = TEST_ALIGNER;
    should(da.tfidfSpace).instanceOf(TfidfSpace);
    should(da.author).equal(author);
    should(da.lang).equal(lang);
    should(da.minScanSize).equal(5);
    should(da.maxScanSize).equal(40);
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
  it('addCorpusSutta()', async () => {
    const msg = 'td8r.addCorpusSutta:';
    const dbg = 1;
    let suid = 'mn8';
    let lang = 'fr';
    let da = await DpdAligner.createSuttaAligner(SREF);
    should(da.corpusIds().length).equal(0);
    await da.addCorpusSutta(suid);
    let scids = da.corpusIds();
    should(scids.length).equal(170);
    should.deepEqual(scids.slice(0,3), 
      ['mn8:0.1', 'mn8:0.2', 'mn8:1.1']);
    should(scids.at(-1)).equal('mn8:17.10');
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
    should(wordDocCount[mostUsed]).equal(160);

    if (DBG.D8R_WRITE_CORPUS_MN8) {
      let { corpus } = da.tfidfSpace;
      let pathOut = path.join(__dirname, '../../local/mn8-corpus.json');
      fs.writeFileSync(pathOut, JSON.stringify(corpus, null, 1));
    }

    let { tfidfSpace:ts } = da;
    let mn8Mohan = await da.fetchMLDoc('mn8/fr/wijayaratna');
    let mohanA = mn8Mohan.segMap['mn8:1.2'];
    let mohanB = mn8Mohan.segMap['mn8:2.1'];
    let vMohanA = da.queryVector(mohanA.fr);
    let vMohanB = da.queryVector(mohanB.fr);
    let v1_1 = da.docVector('mn8:1.1');
    let v1_2 = da.docVector('mn8:1.2');
    let v2_1 = da.docVector('mn8:2.1');

    console.log(v1_1.toString({precision:3}));

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
  it('TESTTESTalignLegacySutta()', async()=>{
    const msg = 'td8r.alignLegacySutta:';
    const dbg = 1;
    let suid = 'mn8';
    let lang = 'fr';
    let da = await DpdAligner.createSuttaAligner(SREF);
    let a8t = await da.alignLegacySutta(suid);

    let res1 = await a8t.next();
    let r1v = res1.value;
    should(res1.done).equal(false);
    should(r1v.line).equal(1);
    should(r1v.text).equal('8. Le déracinement');
    dbg && console.log(msg, '[1]scan', r1v.toString());

    let res2 = await a8t.next();
    let r2v = res2.value;
    should(res2.done).equal(false);
    should(r2v.line).equal(2);
    should(r2v.text).equal([
      '<span class=\'evam\'>Ainsi ai-je entendu :</span>',
      'une fois le Bienheureux séjournait dans le parc d’Anāthapiṇḍika,',
      'au bois de Jeta, près de la ville de Sāvatthi.',
    ].join(' '));
    dbg && console.log(msg, '[2]scan', r2v.toString());
  });
});
