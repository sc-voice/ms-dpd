import fs from 'node:fs';
import path from 'node:path';
const { dirname: __dirname } = import.meta;
import { Text } from '@sc-voice/tools';
import should from 'should';
const { Unicode, WordVector, TfidfSpace } = Text;
import { Dictionary } from '../../main.mjs';
import { DBG } from '../../src/defines.mjs';
import { Tools } from '../../src/tools/main.mjs';
const { 
  AlignmentItem, AlignmentGroup, AlignableItems, DpdAligner 
} = Tools;

let TEST_ALIGNER;
let SREF = 'mn8/fr/wijayaratna';
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');

function mn8MohanApiCache(url) {
  const msg = 'tl8c.mn8MohanApiCache:';
  return {
    ok: true,
    json: async () => {
      let fname = 'mn8-fr-wijayaratna-scapi.json';
      let fpath = path.join(TEST_DATA, fname);
      let json = JSON.parse(fs.readFileSync(fpath));
      return json;
    },
  }
}


const {
  CHECKMARK,
  GREEN_CHECKBOX,
  RED_X,
} = Unicode;
const {
  BLACK,
  WHITE,
  RED,
  GREEN,
  BLUE,
  CYAN,
  MAGENTA,
  YELLOW,
  BRIGHT_BLACK,
  BRIGHT_WHITE,
  BRIGHT_RED,
  BRIGHT_GREEN,
  BRIGHT_BLUE,
  BRIGHT_CYAN,
  BRIGHT_MAGENTA,
  BRIGHT_YELLOW,
  NO_COLOR,
} = Unicode.LINUX_COLOR;

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
  it('create', () => {
    let author = 'wijayaratna';
    let lang = 'fr';
    let da = TEST_ALIGNER;
    should(da.tfidfSpace).instanceOf(TfidfSpace);
    should(da.author).equal(author);
    should(da.lang).equal(lang);
    should(da.minScanSize).equal(4);
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
    return; // TBD
    const msg = 'td8r.alignLegacySutta:';
    const dbg = 0;
    let suid = 'mn8';
    let lang = 'fr';
    let da = await DpdAligner.createSuttaAligner(SREF);
    let a8t = await da.alignLegacySutta({
      cache:mn8MohanApiCache,
    });

    let results = [];
    let scidExpected = [
      'mn8:0.2', 'mn8:1.1', 'mn8:2.1', 
      'mn8:3.1', // ideally mn8:3.1
      'mn8:3.4', // ideally mn8:3.4
      'mn8:4.1', // ideally mn:4.1
      'mn8:4.4', // or mn:5.1
      "mn8:5.3", // ideally 6.1
      'mn8:7.1', 'mn8:8.1', 
      'mn8:9.1', 'mn8:10.1', 'mn8:11.1', 'mn8:12.2', 'mn8:12.3', 
      'mn8:12.4', 'mn8:12.5', 'mn8:12.6', 'mn8:12.7', 'mn8:12.8', 
      'mn8:12.9', 'mn8:12.10', 'mn8:12.11', 'mn8:12.12', 'mn8:12.13',
      'mn8:12.14', 'mn8:12.15', 'mn8:12.16', 'mn8:12.17', 'mn8:12.18',
      'mn8:12.19', 'mn8:12.20', 'mn8:12.21', 'mn8:12.22', 'mn8:12.23',
      'mn8:12.24', 'mn8:12.25', 'mn8:12.26', 'mn8:12.27', 'mn8:12.28', 
      'mn8:12.29', 'mn8:12.30', 'mn8:12.31', 'mn8:12.32', 'mn8:12.33', 
      'mn8:12.34', 'mn8:12.35', 'mn8:12.36', 'mn8:12.37', 'mn8:12.38', 
      'mn8:12.39', 'mn8:12.40', 'mn8:12.41', 'mn8:12.42', 'mn8:12.43',
      'mn8:12.44', 'mn8:12.45', 'mn8:13.4', 'mn8:14.1', 'mn8:14.3',
      'mn8:14.5', 'mn8:15.1', 'mn8:15.2', 'mn8:16.3', 'mn8:16.5',
      'mn8:17.2', 'mn8:17.5', 'mn8:17.6',
    ];
    for (let i=0; i < scidExpected.length; i++) {
      let scid = scidExpected[i];
      let res = await a8t.next();
      results.push(res);
      let { done, value } = res;
      dbg && console.log(msg, '[3]scid', value.scid, 
        value.scid == scid 
          ? 'OK' 
          : `${RED}EXPECTED:${scid}`,
        value.docInfo.pli, NO_COLOR);
      dbg>1 && console.log(msg, 'vText', value.vText.toString());
      should(done).equal(false);
      should(value.line).equal(i+1);
      should(value.scid).equal(scid);
    }

    let r0v = res[0].value;
    should(res1.done).equal(false);
    should(r0v.scid).equal('mn8:0.2');
    should(r0v.line).equal(1);
    should(r0v.text).equal('8. Le déracinement');
    dbg && console.log(msg, '[1]scan', r1v.toString());

    let r1v = res[1].value;
    should(res2.done).equal(false);
    should(r1v.line).equal(2);
    should(r1v.scid).equal('mn8:1.1');
    should(r1v.text).equal([
      '<span class=\'evam\'>Ainsi ai-je entendu :</span>',
      'une fois le Bienheureux séjournait dans le parc d’Anāthapiṇḍika,',
      'au bois de Jeta, près de la ville de Sāvatthi.',
    ].join(' '));
    dbg && console.log(msg, '[2]scan', r1v.toString());

  });
  it("AlignableItems.fromLines()", () => {
    const msg = 'u11s.fromLines:';
    let lines = [
      'once upon a time', // bow0
      'a cat went walking',
      'a cat went jogging',
      'a cat went running',
      'the middle',
      'a dog went walking',
      'a dog went jogging',
      'a dog went running',
      'the end',
    ];
    let da = TEST_ALIGNER; 
    let ut = AlignableItems.fromLines(lines, da);
    let bow0 = new WordVector({a:1, once:1, time: 1, upon: 1});
    let bow1 = new WordVector({a:1, cat:1, walking: 1, went: 1});
    let bowG1 = new WordVector({a:1, went:1});
    should.deepEqual(Object.keys(ut.groups), 
      ['G1', 'G2-4_6-8', 'G5', 'G9']);
    should.deepEqual(ut.groups['G1'], new AlignmentGroup({
      id: 'G1',
      itemIds: [1],
      bow: bow0,
    }));
    should.deepEqual(ut.groups['G2-4_6-8'], new AlignmentGroup({
      id: 'G2-4_6-8',
      itemIds: [2,3,4,6,7,8],
      bow: bowG1,
      gScore: 0.75,
    }));
    should(ut.groups['G9']).properties({
      id: 'G9',
      itemIds: [9],
    });
    should.deepEqual(ut.items.map(g=>g.text), lines);
    should.deepEqual(ut.items.map((g,i)=>g.id),[1,2,3,4,5,6,7,8,9]);
    should.deepEqual(ut.items.map((g)=>g.groupId),[
      'G1',
      'G2-4_6-8', 'G2-4_6-8', 'G2-4_6-8', 
      'G5',
      'G2-4_6-8', 'G2-4_6-8', 'G2-4_6-8', 
      'G9',
    ]);
    should(ut.groups['G1'].bow.toString())
      .equal('a:1,once:1,time:1,upon:1');
    should(ut.groups['G2-4_6-8'].bow.toString())
      .equal('a:1,went:1');
    should(ut.groups['G9'].bow.toString())
      .equal('end:1,the:1');
    should.deepEqual(ut.items[0], new AlignmentItem({
      id: 1,
      bow: bow0,
      groupId: 'G1',
      text: lines[0],
      pScore: 0,
    }));
    should.deepEqual(ut.items[1], new AlignmentItem({
      id: 2,
      bow: bow1,
      groupId: 'G2-4_6-8',
      text: lines[1],
      pScore: 0.25,
    }));
    let bow2 = new WordVector({a:1, cat:1, jogging: 1, went: 1});
    should.deepEqual(ut.items[2], new AlignmentItem({
      id: 3,
      bow: bow2,
      groupId: 'G2-4_6-8',
      text: lines[2],
      pScore: 0.75,
    }));
    let bow3 = new WordVector({a:1, cat:1, running: 1, went: 1});
    should.deepEqual(ut.items[3], new AlignmentItem({
      id: 4,
      bow: bow3,
      groupId: 'G2-4_6-8',
      text: lines[3],
      pScore: 0.75,
    }));
    let bow4 = new WordVector({the:1, middle:1});
    should.deepEqual(ut.items[4], new AlignmentItem({
      id: 5,
      bow: bow4,
      groupId: 'G5',
      text: lines[4],
      pScore: 0,
    }));
  });
  it("rangedString()", () => {
    let items1 = [ 35, 36, 39, 40, 42 ];
    should(AlignmentGroup.rangedString(items1)).equal('35-36_39-40_42');
    let items2 = [2,3,4,6,7,8];
    should(AlignmentGroup.rangedString(items2)).equal('2-4_6-8');
  });
});
