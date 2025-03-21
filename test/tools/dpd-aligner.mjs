import fs from 'node:fs';
import path from 'node:path';
const { dirname: __dirname } = import.meta;
import { ScvMath, Text } from '@sc-voice/tools';
import should from 'should';
const { ColorConsole, Unicode, WordVector, TfidfSpace } = Text;
const { Interval } = ScvMath;
import { Dictionary } from '../../main.mjs';
import { DBG } from '../../src/defines.mjs';
import { Tools } from '../../src/tools/main.mjs';
const { 
  Stanza, AlignmentItem, AlignmentGroup, Alignable, DpdAligner,
} = Tools;

let TEST_ALIGNER;
let SREF = 'mn8/fr/wijayaratna';
const { dirname: TEST_DIR, filename: TEST_FILE } = import.meta;
const TEST_DATA = path.join(TEST_DIR, '../data');
const cc = new ColorConsole();

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

let {
  ELLIPSIS,
} = Unicode;

let MN8_SEGS;
let MN8_SEG_MAP;

describe('dpd-aligner', () => {
  before(async () => {
    const msg = 'td8r.before:';
    let dbg = DBG.TD8R_BEFORE;
    let msStart = Date.now();
    TEST_ALIGNER = await DpdAligner.createSuttaAligner(SREF);
    let { segMap } = await TEST_ALIGNER.fetchMLDoc('mn8');
    MN8_SEG_MAP = segMap;
    MN8_SEGS = Object.values(segMap);
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
    cc.bad1(msg, 'TBD'); return;
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
      'mn8:0.2', 'mn8:1.1', 'mn8:2.1', 'mn8:3.1', 'mn8:3.4',
      'mn8:4.1', 'mn8:5.1', 'mn8:6.1', 'mn8:7.1', 'mn8:8.1', 
      'mn8:9.1', 'mn8:10.1', 
      'mn8:11.1',
      'mn8:12.1', // or mn8:12.2
      'mn8:12.3', 'mn8:12.4', 'mn8:12.5', 'mn8:12.6',
      'mn8:12.7', 'mn8:12.8', 'mn8:12.9', 'mn8:12.10', 'mn8:12.11',
      'mn8:12.12', 'mn8:12.13', 'mn8:12.14', 'mn8:12.15', 'mn8:12.16',
      'mn8:12.17', 'mn8:12.18', 'mn8:12.19', 'mn8:12.20', 'mn8:12.21',
      'mn8:12.22', 'mn8:12.23', 'mn8:12.24', 'mn8:12.25', 'mn8:12.26',
      'mn8:12.27', 'mn8:12.28', 'mn8:12.29', 'mn8:12.30', 'mn8:12.31',
      'mn8:12.32', 'mn8:12.33', 'mn8:12.34', 'mn8:12.35', 'mn8:12.36',
      'mn8:12.37', 'mn8:12.38', 'mn8:12.39', 'mn8:12.40', 'mn8:12.41',
      'mn8:12.42', 'mn8:12.43', 'mn8:12.44', 'mn8:12.45', 
      'mn8:13.4',
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
      dbg > 1 &&
        console.log(`${msg}@1.1`, 'vSrc', value.vSrc.toString());
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
    dbg && console.log(`${msg}@2`, 'scan', r0v.toString());

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
  it('Alignable.fromList() simple', () => {
    const msg = 'ta7e.fromList-simple:';
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
    let groupThreshold = 0.5;
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da, { groupThreshold });
    let items1 = [null, ...al.items];
    for (let i = 1; i < items1.length; i++) {
      let { id, groupId, group } = items1[i];
      should(group).instanceOf(AlignmentGroup, 
        `${msg} item${id} ${groupId} AlignmentGroup?`);
    }
    let group2 = items1[2].group;
    should(group2.id).equal('G2-4…8S2@4');
    should(group2.nStanzas).equal(2);

    should(items1[1].group.id).equal('G1');
    should(items1[1].group.nStanzas).equal(1);
    should(items1[2].group).equal(group2);
    should(items1[3].group).equal(group2);
    should(items1[4].group).equal(group2);
    should(items1[5].group.id).equal('G5');
    should(items1[5].group.nStanzas).equal(1);
    should(items1[6].group).equal(group2);
    should(items1[7].group).equal(group2);
    should(items1[8].group).equal(group2);
    should(items1[9].group.id).equal('G9');
    should(items1[9].group.nStanzas).equal(1);

    let stanzas = items1.map(item=>item?.stanza);
    should(stanzas[1]).instanceOf(Stanza);
    should(stanzas[1].toString()).equal('S1/1[1,1]');
    should(stanzas[2]).instanceOf(Stanza);
    should(stanzas[2].toString()).equal('S1/2[2,5]');
    should(stanzas[3].toString()).equal('S1/2[2,5]');
    should(stanzas[5].toString()).equal('S1/2[2,5]');
    should(stanzas[6].toString()).equal('S2/2[6,8]');
    should(stanzas[7].toString()).equal('S2/2[6,8]');
    should(stanzas[8].toString()).equal('S2/2[6,8]');
    should(stanzas[9].toString()).equal('S1/1[9,9]');

    let bow0 = new WordVector({ a: 1, once: 1, time: 1, upon: 1 });
    let bow1 = new WordVector({ a: 1, cat: 1, walking: 1, went: 1 });
    let bowG1 = new WordVector({ a: 1, went: 1 });
    should.deepEqual(Object.keys(al.groups), [
      'G1',
      'G2-4…8S2@4',
      'G5',
      'G9',
    ]);
    let groups = Object.values(al.groups);
    should.deepEqual(
      groups.map((g) => g.id),
      ['G1', 'G2-4…8S2@4', 'G5', 'G9'],
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
        'G2-4…8S2@4',
        'G2-4…8S2@4',
        'G2-4…8S2@4',
        'G5',
        'G2-4…8S2@4',
        'G2-4…8S2@4',
        'G2-4…8S2@4',
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
  it('item-stanza', () => {
    const msg = 'ta7e.item-stanza';
    let lines = [
      'once upon a time', // 1
      'a cat went walking', // 2
      'a bird ate a worm', // 3
      'a lion sat on the grass', // 4
      'the middle is different', // 5
      'a cat went jogging', //6
      'a bird ate a seed', //7
      'a lion sat on the hill', //8
      'the end', //9
    ];
    let da = TEST_ALIGNER;
    let groupThreshold = 0.5;
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da, { groupThreshold });

    let items1 = [null, ...al.items]; // 1-based
    should(items1[1].groupId).equal('G1');
    should(items1[2].groupId).equal('G2…6S2@4');
    should(items1[3].groupId).equal('G3…7S2@4');
    should(items1[4].groupId).equal('G4…8S2@4');
    should(items1[5].groupId).equal('G5');
    should(items1[6].groupId).equal('G2…6S2@4');
    should(items1[7].groupId).equal('G3…7S2@4');
    should(items1[8].groupId).equal('G4…8S2@4');
    should(items1[9].groupId).equal('G9');

    should(items1[1].group.idRanges.toString()).equal('[1,1]');
    should(items1[2].group.idRanges.toString()).equal('[2,2],[6,6]');
    should(items1[3].group.idRanges.toString()).equal('[3,3],[7,7]');

    // Stanzas are defined by head groups.
    // https://github.com/sc-voice/ms-dpd/wiki/Case-Study:-Repetition-in-the-Tipitaka
    let stanzas1 = items1.map(item=>item?.stanza);
    should(stanzas1[1].toString()).equal('S1/1[1,1]');
    should(stanzas1[2].toString()).equal('S1/2[2,5]');
    should(stanzas1[3].toString()).equal('S1/2[2,5]');
    should(stanzas1[4].toString()).equal('S1/2[2,5]');
    should(stanzas1[5].toString()).equal('S1/2[2,5]');
    should(stanzas1[6].toString()).equal('S2/2[6,8]');
    should(stanzas1[7].toString()).equal('S2/2[6,8]');
    should(stanzas1[8].toString()).equal('S2/2[6,8]');
    should(stanzas1[9].toString()).equal('S1/1[9,9]');

  });
  it('Alignable.fromList() mn8 fr', () => {
    const msg = 'ta7e.fromList-mn8-fr:';
    let da = TEST_ALIGNER;
    let groupThreshold = 0.4;
    let segs = MN8_SEGS.slice(0, 50);
    let scids = segs.map((seg) => seg.scid);
    let opts = {
      groupThreshold,
      listText: (scid) => MN8_SEG_MAP[scid].pli,
      listRef: (i) => scids[i],
    };
    let al = Alignable.fromList(scids, da, opts);
  });
  it('analyzeItemIds()', () => {
    let items1 = [35, 36, 39, 40, 42, 118, 119, 120];
    let { id:id1 } = AlignmentGroup.analyzeItemIds(items1);
    should(id1).equal('G35-6.39-40.42.118-20'); // chaotic items

    let items2 = [2, 3, 4, 6, 7, 8];
    let { id:id2 } = AlignmentGroup.analyzeItemIds(items2);
    should(id2).equal('G2-4…8S2@4'); // regular items

    let items3 = [15,16,20,21,25,26,30,31,35,36,40,41,45,46,50,51];
    let { id:id3 } = AlignmentGroup.analyzeItemIds(items3);
    should(id3).equal('G15-6…51S8@5'); // regular items

    let items4 = [3, 5, 7,8,9];
    let { id:id4 } = AlignmentGroup.analyzeItemIds(items4);
    should(id4).equal('G3.5.7-9'); // chaotic items

    let items5 = [5];
    let { id:id5 } = AlignmentGroup.analyzeItemIds(items5);
    should(id5).equal('G5'); // singleton
  });
  it('itemGroup', () => {
    let lines = [
      'once upon a time',
      'on a sunny day',
      'a cat went walking',
      'through the forest',
      'on a rainy day',
      'a dog went walking',
      'through the grass',
    ];
    let da = TEST_ALIGNER;
    let { tfidfSpace: ts } = da;
    let al = Alignable.fromList(lines, da);
    let { groups, items } = al;
    should.deepEqual(Object.keys(groups), [
      'G1',
      'G2…5S2@3',
      'G3…6S2@3',
      'G4…7S2@3',
    ]);
    let items1 = [null, ...items];
    should(items1[1].group.id).equal( 'G1' );
    should(items1[2].group.id).equal( 'G2…5S2@3');
    should(items1[3].group.id).equal( 'G3…6S2@3');
    should(items1[4].group.id).equal( 'G4…7S2@3');
    should(items1[5].group.id).equal( 'G2…5S2@3');
    should(items1[6].group.id).equal( 'G3…6S2@3');
    should(items1[7].group.id).equal( 'G4…7S2@3');
  });
  it('addHeadGroups', () => {
    const msg = 'td8r.addHeadGroups';
    let lines = [
      'once upon a time', // 1

      'on a sunny day', //2 G2.6.10
      'a cat went walking', //3 G3.7.11
      'through the forest', //4 G4.8.12
      'dances with wolves', //5 G5

      'on a rainy day', //6 G2.6.10
      'a dog went walking', //7 G3.7.11
      'through the grass', //8 G4.8.12
      'flies along rails', //8 G9

      'on a windy day', //9 G2.5.8
      'a mouse went walking', //10 G3.7.11
      'through the leaves', //11 G4.8.12
      'swims in oceans', //12 G12

      'the end', //13 G11
    ];
    let da = TEST_ALIGNER;
    let groupThreshold = 0.5;
    let al = Alignable.fromListRaw(lines, da, { groupThreshold });
    al.groupSimilar();
    al.addHeadGroups();
    let items1 = [null, ...al.items]; // 1-based
    should(items1[1].group.head.extent.toString()).equal('[1,1]');
    should(items1[2].group.head.extent.toString()).equal('[2,12]');
    should(items1[3].group.head.extent.toString()).equal('[2,12]');
    should(items1[4].group.head.extent.toString()).equal('[2,12]');
    should(items1[5].group.head.extent.toString()).equal('[2,12]');
    should(items1[6].group.head.extent.toString()).equal('[2,12]');
    should(items1[7].group.head.extent.toString()).equal('[2,12]');
    should(items1[8].group.head.extent.toString()).equal('[2,12]');
    should(items1[9].group.head.extent.toString()).equal('[2,12]');
    should(items1[10].group.head.extent.toString()).equal('[2,12]');
    should(items1[11].group.head.extent.toString()).equal('[2,12]');
    should(items1[12].group.head.extent.toString()).equal('[2,12]');

    // Item 13 is an oddity since it is NOT a repetition:
    // A conservative approach rejects it as part of [2,12] extent.
    // A flexible approach adds it to the [2,12] extent.
    should(items1[13].group.head.extent.toString()).equal('[13,13]');

    // Item 14 is also not repeated. 
    // It is also NOT part of the preceding extent
    should(items1[14].group.head.extent.toString()).equal('[14,14]');
  });
  it('item stanza range', () => {
    const msg = 'td8r.item-stanza-range';
    let lines = [
      'once upon a time', // I1S1/1[1,1]
      'on a sunny day', // I2S1/3[2,4]
      'on a rainy day', // I3S2/3[2,4]
      'on a windy day', // I4S3/3[2,4]
      'the end', // I5S1[5,5]
    ];
    let da = TEST_ALIGNER;
    let groupThreshold = 0.5;
    let al = Alignable.fromList(lines, da, { groupThreshold });
    let { groups, items } = al;
    let gKeys = Object.keys(groups);
    should.deepEqual(gKeys.map(k=>groups[k].nStanzas), 
      [1, 3, 1], 'nStanzas');
    should.deepEqual(gKeys, ['G1', 'G2…4S3@1', 'G5' ], 'group keys');
    should.deepEqual(items.map(item=>item.toString()), [
      'I1S1/1[1,1]',
      'I2S1/3[2,4]',
      'I3S2/3[2,4]',
      'I4S3/3[2,4]',
      'I5S1/1[5,5]',
    ], 'items');
  });
  it('item stanza overlap', () => {
    const msg = 'td8r.item-stanza-overlap';
    let lines = [
      'once upon a time', // 1

      'on a sunny day', //2 G2.5.8
      'a cat went walking', //3 G3.6.9
      'through the forest', //4 G4.7.10

      'on a rainy day', //5 G2.5.8
      'a dog went walking', //6 G3.6.9
      'through the grass', //7 G4.7.10

      'on a windy day', //8 G2.5.8
      'a mouse went walking', //9 G3.6.9
      'through the leaves', //10 G4.7.10

      'the end', //11 G11
    ];
    let da = TEST_ALIGNER;
    let groupThreshold = 0.5;
    let al = Alignable.fromList(lines, da, { groupThreshold });

    let { groups, items } = al;
    should.deepEqual(Object.keys(groups), [
      'G1', // singleton
      'G2…8S3@3', // spanning
      'G3…9S3@3', // spanning
      'G4…10S3@3', // spanning
      'G11', // singleton
    ]);
    should.deepEqual(items.map(item=>item.group.id), [
      'G1',
      'G2…8S3@3',
      'G3…9S3@3',
      'G4…10S3@3',
      'G2…8S3@3',
      'G3…9S3@3',
      'G4…10S3@3',
      'G2…8S3@3',
      'G3…9S3@3',
      'G4…10S3@3',
      'G11',
    ], 'item.group.id');
    should.deepEqual(items.map(item=>item.toString()), [
      'I1S1/1[1,1]',
      'I2S1/3[2,4]',
      'I3S1/3[2,4]',
      'I4S1/3[2,4]',
      'I5S2/3[5,7]',
      'I6S2/3[5,7]',
      'I7S2/3[5,7]',
      'I8S3/3[8,10]',
      'I9S3/3[8,10]',
      'I10S3/3[8,10]',
      'I11S1/1[11,11]',
    ], 'item.toString()');
  });
  it('idRanges', () => {
    should.deepEqual(Alignable.idRanges([1, 2, 3]), [
      new Interval(1, 3),
    ]);
    should.deepEqual(Alignable.idRanges([3, 2, 1]), [
      new Interval(1, 3),
    ]);
    should.deepEqual(Alignable.idRanges([1, 2, 3, 7, 8, 9]), [
      new Interval(1, 3),
      new Interval(7, 9),
    ]);
    should.deepEqual(Alignable.idRanges([1, 2, 3, 5, 7, 8, 9]), [
      new Interval(1, 3),
      new Interval(5, 5),
      new Interval(7, 9),
    ]);
  });
  it('overlaps()', () => {
    let g1_10 = new AlignmentGroup({ itemIds: [1,2,3, 8,9,10] });
    let g2_8 = new AlignmentGroup({ itemIds: [2, 5, 8] });
    let g3_9 = new AlignmentGroup({ itemIds: [3, 5, 7,8,9] });
    let g15_20 = new AlignmentGroup({ itemIds: [15, 20] });
    let g5 = new AlignmentGroup({itemIds: [5]});

    // sparse groups are not spanning
    should(g1_10.id).equal('G1-3…10S2@7');
    should(g1_10.spanning).equal(false);
    should(g3_9.id).equal('G3.5.7-9');
    should(g3_9.spanning).equal(false);

    // spanning groups only have degenerate intervals
    should(g2_8.id).equal('G2…8S3@3');
    should(g2_8.spanning).equal(true);

    // singleton
    should(g1_10.overlaps(g5)).equal(false);
    should(g2_8.overlaps(g5)).equal(true);
    should(g3_9.overlaps(g5)).equal(true);

    // no overlap
    should(g1_10.overlaps(g15_20)).equal(false);
    should(g15_20.overlaps(g1_10)).equal(false);

    // subset
    should(g1_10.overlaps(g2_8)).equal(true);
    should(g2_8.overlaps(g1_10)).equal(true);

    // overlap
    should(g2_8.overlaps(g3_9)).equal(true);
    should(g3_9.overlaps(g2_8)).equal(true);
  });
  it('a12p.inferredStanza() spanning', () => {
    let extent = new Interval(1, 10);
    let itemIds = [1, 5, 8];
    let g1_8 = new AlignmentGroup({itemIds, extent});
    should(g1_8.extent.toString()).equal('[1,10]');

    // The first stanza has 4 items
    should(g1_8.inferredStanza(1).toString()).equal('S1/3[1,4]');
    should(g1_8.inferredStanza(2).toString()).equal('S1/3[1,4]');
    should(g1_8.inferredStanza(3).toString()).equal('S1/3[1,4]');
    should(g1_8.inferredStanza(4).toString()).equal('S1/3[1,4]');

    // The second stanza has 3 items
    should(g1_8.inferredStanza(5).toString()).equal('S2/3[5,7]');
    should(g1_8.inferredStanza(6).toString()).equal('S2/3[5,7]');
    should(g1_8.inferredStanza(7).toString()).equal('S2/3[5,7]');

    // the last stanza has 3 items
    should(g1_8.inferredStanza(8).toString()).equal('S3/3[8,10]');
    should(g1_8.inferredStanza(9).toString()).equal('S3/3[8,10]');
    should(g1_8.inferredStanza(10).toString()).equal('S3/3[8,10]');
  });
  it('a12p.inferredStanza() sparse', () => {
    let itemIds = [2,3, 5, 8,9,10];
    let extent = new Interval(itemIds[0], itemIds.at(-1));
    let g2_10 = new AlignmentGroup({itemIds, extent});
    should(g2_10.extent.toString()).equal('[2,10]');

    // segments outside the AlignmentGroup are ignored
    should(g2_10.inferredStanza(1)).equal(null);
    should(g2_10.inferredStanza(11)).equal(null);

    // segments within a group range form a stanza
    should(g2_10.inferredStanza(2).toString()).equal('S1/3[2,4]');
    should(g2_10.inferredStanza(3).toString()).equal('S1/3[2,4]');
    should(g2_10.inferredStanza(5).toString()).equal('S2/3[5,7]');
    should(g2_10.inferredStanza(8).toString()).equal('S3/3[8,10]');
    should(g2_10.inferredStanza(9).toString()).equal('S3/3[8,10]');
    should(g2_10.inferredStanza(10).toString()).equal('S3/3[8,10]');

    // segments not in the sparse group are included in stanza
    should(g2_10.inferredStanza(4).toString()).equal('S1/3[2,4]');
    should(g2_10.inferredStanza(6).toString()).equal('S2/3[5,7]');
    should(g2_10.inferredStanza(7).toString()).equal('S2/3[5,7]');
  });
  it("bounds()", ()=>{
    let g1_10 = new AlignmentGroup({ itemIds: [1,2,3, 6, 8,9,10] });
    let g1_8 = new AlignmentGroup({ itemIds: [1, 5, 8] });
    let g20 = new AlignmentGroup({ itemIds: [20] });
    should.deepEqual(g1_10.bounds, new Interval(1,10));
    should.deepEqual(g1_8.bounds, new Interval(1,8));
    should.deepEqual(g20.bounds, new Interval(20,20));
  });

});
