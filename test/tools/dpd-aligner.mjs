import fs from 'node:fs';
import path from 'node:path';
const { dirname: __dirname } = import.meta;
import { ScvMath, Text } from '@sc-voice/tools';
import should from 'should';
const { Unicode, WordVector, TfidfSpace } = Text;
const { Interval } = ScvMath;
import { Dictionary } from '../../main.mjs';
import { DBG } from '../../src/defines.mjs';
import { Tools } from '../../src/tools/main.mjs';
const { AlignmentItem, AlignmentGroup, Alignable, DpdAligner } =
  Tools;

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
  };
}


const { CHECKMARK, GREEN_CHECKBOX, RED_X } = Unicode;
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
  it('addReferenceSutta()', async () => {
    const msg = 'td8r.addReferenceSutta:';
    const dbg = 1;
    let suid = 'mn8';
    let lang = 'fr';
    let da = await DpdAligner.createSuttaAligner(SREF);
    function dpdVector(docId) {
      const msg = 'td8r.dpdVector:';
      let { tfidfSpace: ts } = da;
      let docInfo = da.corpus.getDocument(docId);
      if (docInfo == null) {
        throw new Error(`${msg} docId? ${docId}`);
      }
      let { bow } = docInfo;
      return ts.tfidfOfBow(bow);
    }

    should(da.scids()).equal(undefined);
    let alignableRef = await da.addReferenceSutta(suid);
    should(alignableRef).equal(da.alignableRef, 'alignableRef?');
    let scids = da.scids();
    should.deepEqual(
      scids,
      da.alignableRef.items.map((item) => item.ref),
    );
    should(scids.length).equal(170);
    should.deepEqual(scids.slice(0, 3), [
      'mn8:0.1',
      'mn8:0.2',
      'mn8:1.1',
    ]);
    should(scids.at(-1)).equal('mn8:17.10');
    let { wordDocCount } = da.tfidfSpace.corpus;
    let words = Object.keys(wordDocCount);
    words.sort((a, b) => wordDocCount[a] - wordDocCount[b]);

    // Least distinctive words in MN8 corpus of MSDPD/FR definitions
    should.deepEqual(words.slice(words.length - 5), 
      [ '(pour)', 'est', 'le', 'un', 'de', ]);
    let mostUsed = words.at(-1);
    should(wordDocCount[mostUsed]).equal(160);

    if (DBG.D8R_WRITE_CORPUS_MN8) {
      let { corpus } = da.tfidfSpace;
      let pathOut = path.join(
        __dirname,
        '../../local/mn8-corpus.json',
      );
      fs.writeFileSync(pathOut, JSON.stringify(corpus, null, 1));
    }

    let { tfidfSpace: ts } = da;
    let mn8Mohan = await da.fetchMLDoc('mn8/fr/wijayaratna');
    let mohanA = mn8Mohan.segMap['mn8:1.2'];
    let mohanB = mn8Mohan.segMap['mn8:2.1'];
    let vMohanA = da.queryVector(mohanA.fr);
    let vMohanB = da.queryVector(mohanB.fr);
    let v1_1 = dpdVector('mn8:1.1');
    let v1_2 = dpdVector('mn8:1.2');
    let v2_1 = dpdVector('mn8:2.1');

    // Match vMohanA
    let sim1_1A = v1_1.similar(vMohanA);
    let sim1_2A = v1_2.similar(vMohanA);
    let sim2_1A = v2_1.similar(vMohanA);
    // Match vMohanB
    let sim1_1B = v1_1.similar(vMohanB);
    let sim1_2B = v1_2.similar(vMohanB);
    let sim2_1B = v2_1.similar(vMohanB);
    //biome-ignore format:
    dbg>1 && console.log(msg, { 
      mohanA: mohanA.fr, sim1_1A, sim1_2A, sim2_1A,
      mohanB: mohanB.fr, sim1_1B, sim1_2B, sim2_1B,
    });

    // Mohan first line should align with mn8:1.1
    should(sim1_1A).above(sim1_2A).above(sim2_1A);
    // Mohan second line should align with mn8:2.1
    should(sim2_1B).above(sim1_2B).above(sim1_1B);
  });
  it('TESTTESTalignLegacySutta()', async () => {
    const msg = 'td8r.alignLegacySutta:';
    const dbg = 0;
    let suid = 'mn8';
    let lang = 'fr';
    let da = await DpdAligner.createSuttaAligner(SREF);
    let a8t = await da.alignLegacySutta({
      cache: mn8MohanApiCache,
    });

    let results = [];
    //biome-ignore format:
    let scidExpected = [
      'mn8:0.2',
      'mn8:1.1',
      'mn8:2.1',
      'mn8:3.1', // ideally mn8:3.1
      'mn8:3.4', // ideally mn8:3.4
      'mn8:4.1', // ideally mn:4.1
      'mn8:4.4', // or mn:5.1
      'mn8:5.3', // ideally 6.1
      'mn8:7.1', 'mn8:8.1', 'mn8:9.1', 'mn8:10.1', 'mn8:11.1',
      'mn8:12.2', 'mn8:12.3', 'mn8:12.4', 'mn8:12.5', 'mn8:12.6',
      'mn8:12.7', 'mn8:12.8', 'mn8:12.9', 'mn8:12.10', 'mn8:12.11',
      'mn8:12.12', 'mn8:12.13', 'mn8:12.14', 'mn8:12.15', 'mn8:12.16',
      'mn8:12.17', 'mn8:12.18', 'mn8:12.19', 'mn8:12.20', 'mn8:12.21',
      'mn8:12.22', 'mn8:12.23', 'mn8:12.24', 'mn8:12.25', 'mn8:12.26',
      'mn8:12.27', 'mn8:12.28', 'mn8:12.29', 'mn8:12.30', 'mn8:12.31',
      'mn8:12.32', 'mn8:12.33', 'mn8:12.34', 'mn8:12.35', 'mn8:12.36',
      'mn8:12.37', 'mn8:12.38', 'mn8:12.39', 'mn8:12.40', 'mn8:12.41',
      'mn8:12.42', 'mn8:12.43', 'mn8:12.44', 'mn8:12.45', 'mn8:13.4',
      'mn8:14.1', 'mn8:14.3', 'mn8:14.5', 'mn8:15.1', 'mn8:15.2',
      'mn8:16.3', 'mn8:16.5', 'mn8:17.2', 'mn8:17.5', 'mn8:17.6',
    ];
    for (let i = 0; i < scidExpected.length; i++) {
      let scid = scidExpected[i];
      let res = await a8t.next();
      results.push(res);
      let { done, value } = res;
      //biome-ignore format:
      dbg && console.log( `${msg}@1`, value.scid,
          value.scid == scid ? 'OK' : `${RED}EXPECTED:${scid}`,
          value.docInfo.pli, NO_COLOR,);
      dbg > 1 && console.log(`${msg}@1.1`, 'vSrc', value.vSrc.toString());
      should(done).equal(false);
      dbg && console.log(`${msg}@1.2`, 'next', value.toString());
      should(value.line).equal(i + 1);
      should(value.scid).equal(scid);
    }

    let r0v = res[0].value;
    should(res1.done).equal(false);
    should(r0v.scid).equal('mn8:0.2');
    should(r0v.line).equal(1);
    should(r0v.text).equal('8. Le déracinement');
    dbg && console.log(`${msg}@2`, 'scan', r1v.toString());

    let r1v = res[1].value;
    should(res2.done).equal(false);
    should(r1v.line).equal(2);
    should(r1v.scid).equal('mn8:1.1');
    //biome-ignore format:
    should(r1v.text).equal( [
      "<span class='evam'>Ainsi ai-je entendu :</span>",
      'une fois le Bienheureux séjournait dans le parc d’Anāthapiṇḍika,',
      'au bois de Jeta, près de la ville de Sāvatthi.',
    ].join(' '));
    dbg && console.log(`${msg}@3`, 'scan', r1v.toString());
  });
  it('Alignable.fromList()', () => {
    const msg = 'ta7e.fromList:';
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
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da);
    let bow0 = new WordVector({ a: 1, once: 1, time: 1, upon: 1 });
    let bow1 = new WordVector({ a: 1, cat: 1, walking: 1, went: 1 });
    let bowG1 = new WordVector({ a: 1, went: 1 });
    should.deepEqual(Object.keys(al.groups), [
      'G1',
      'G2-4.6-8',
      'G5',
      'G9',
    ]);
    let groups = Object.values(al.groups);
    should.deepEqual(
      groups.map((g) => g.id),
      ['G1', 'G2-4.6-8', 'G5', 'G9'],
    );
    should.deepEqual(
      groups.map((g) => g.itemIds),
      [[1], [2, 3, 4, 6, 7, 8], [5], [9]],
    );
    should.deepEqual(
      groups.map((g) => g.gScore),
      [
        1, // singletons are always a perfect match for themselves
        0.5, // lowest gScore between group items
        1, // singletons are always a perfect match for themselves
        1, // singletons are always a perfect match for themselves
      ],
    );
    should.deepEqual(
      groups.map((g) => g.bow),
      [
        new WordVector({ a: 1, once: 1, time: 1, upon: 1 }),
        new WordVector({ a: 1, went: 1 }),
        new WordVector({ middle: 1, the: 1 }),
        new WordVector({ end: 1, the: 1 }),
      ],
    );

    should.deepEqual(
      al.items.map((g, i) => g.id),
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
    );
    should.deepEqual(
      al.items.map((g) => g.text),
      lines,
    );
    should.deepEqual(
      al.items.map((g) => g.groupId),
      [
        'G1',
        'G2-4.6-8',
        'G2-4.6-8',
        'G2-4.6-8',
        'G5',
        'G2-4.6-8',
        'G2-4.6-8',
        'G2-4.6-8',
        'G9',
      ],
    );
    should.deepEqual(
      al.items.map((g, i) => g.bow),
      lines.map((line) => ts.bowOfText(line)),
    );
    should.deepEqual(
      al.items.map((g, i) => g.pScore),
      [0, 0.25, 0.75, 0.75, 0, 0, 0.75, 0.75, 0],
    );
  });
  it('rangedString()', () => {
    let items1 = [35, 36, 39, 40, 42, 118, 119, 120];
    should(AlignmentGroup.rangedString(items1)).equal(
      '35-6.39-40.42.118-20',
    );
    let items2 = [2, 3, 4, 6, 7, 8];
    should(AlignmentGroup.rangedString(items2)).equal('2-4.6-8');
  });
  it('itemGroup', ()=>{
    let lines = [
      'once upon a time',
      'on a sunny day',
      'a cat went walking',
      'through the forest',
      'on a rainy day',
      'a dog went walking',
      'through the grass',
    ]
    let da = TEST_ALIGNER;
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da);
    let { items } = al;
    should(al.itemGroup(items[0])).properties({id:'G1'});
    should(al.itemGroup(items[1])).properties({id:'G2.5'});
    should(al.itemGroup(items[2])).properties({id:'G3.6'});
    should(al.itemGroup(items[3])).properties({id:'G4.7'});
    should(al.itemGroup(items[4])).properties({id:'G2.5'});
    should(al.itemGroup(items[5])).properties({id:'G3.6'});
    should(al.itemGroup(items[6])).properties({id:'G4.7'});
  });
  it('item2GroupShadow', ()=>{
    const msg = 'td8r.item2GroupShadow';
    let lines = [
      'once upon a time', // 1

      'on a sunny day', //2 G2.5.8
      'a cat went walking', //3 G3.6.9
      'through the forest', //4 G4.7.9

      'on a rainy day', //5 G2.5.8
      'a dog went walking', //6 G3.6.9
      'through the grass', //7 G4.7.9

      'on a windy day',//8 G2.5.8
      'a mouse went walking',//9 G3.6.9
      'through the leaves',//10 G4.7.9

      'the end', //11 G11
    ]
    let da = TEST_ALIGNER;
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da);
    let { items } = al;
    should(al.itemGroup(items[1-1])).properties({id:'G1',delta:1});
    should(al.itemGroup(items[2-1])).properties({id:'G2.5.8',delta:3});
    should(al.itemGroup(items[3-1])).properties({id:'G3.6.9'});
    should(al.itemGroup(items[4-1])).properties({id:'G4.7.10'});
    should(al.itemGroup(items[5-1])).properties({id:'G2.5.8'});
    should(al.itemGroup(items[6-1])).properties({id:'G3.6.9'});
    should(al.itemGroup(items[7-1])).properties({id:'G4.7.10'});
    should(al.itemGroup(items[8-1])).properties({id:'G2.5.8'});
    should(al.itemGroup(items[9-1])).properties({id:'G3.6.9'});
    should(al.itemGroup(items[10-1])).properties({id:'G4.7.10'});
    should(al.itemGroup(items[11-1])).properties({id:'G11'});

    should.deepEqual(
      al.item2GroupShadow(items[1-1]), new Interval(1,1));

    should.deepEqual(
      al.item2GroupShadow(items[2-1]), new Interval(2,4));
    should.deepEqual(
      al.item2GroupShadow(items[3-1]), new Interval(2,4));
    should.deepEqual(
      al.item2GroupShadow(items[4-1]), new Interval(2,4));

    should.deepEqual(
      al.item2GroupShadow(items[5-1]), new Interval(5,7));
    should.deepEqual(
      al.item2GroupShadow(items[6-1]), new Interval(5,7));
    should.deepEqual(
      al.item2GroupShadow(items[7-1]), new Interval(5,7));

    should.deepEqual(
      al.item2GroupShadow(items[8-1]), new Interval(8,10));
    should.deepEqual(
      al.item2GroupShadow(items[9-1]), new Interval(8,10));
    should.deepEqual(
      al.item2GroupShadow(items[10-1]), new Interval(8,10));

    should.deepEqual(
      al.item2GroupShadow(items[11-1]), new Interval(11,11));
  })
});
