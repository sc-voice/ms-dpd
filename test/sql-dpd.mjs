import should from "should";
import fs from 'fs';
const fsp = fs.promises;
import path from 'path';
import util from 'util';
import * as url from 'url';
import { DBG } from '../src/defines.mjs';
const M = "test.SqlDpd:";
import * as Pali from '../src/pali.mjs';
import { default as SqlDpd } from '../scripts/js/sql-dpd.mjs';
import { default as HeadwordKey } from '../src/headword-key.mjs';
const DIRNAME = import.meta.dirname;

let msg = M;
let DATADIR = path.join(DIRNAME, "../local/dpd-test1");

typeof describe==="function" && describe("sql-dpd", function() {
  this.timeout(10*1000);
  before(()=>{
    //console.log(msg, "before");
    let dataDir = DATADIR;
    fs.mkdirSync(dataDir, {recursive:true});
  });
  it("ctor", async()=>{
    let eCaught;
    try {
      let sqlDpd = new SqlDpd();
    } catch(e) {
      eCaught = e;
    }

    should(eCaught.message).match(/use SqlDpd.create/);
  });
  it("create() default", async()=>{
    let sqlDpd = await SqlDpd.create();
    should(sqlDpd).properties({
      dbg: DBG.SQL_DPD > 1 ? 1 : 0,
      lang: 'en',
      rowLimit: 0,
      dataDir: DATADIR,
      paliMap: undefined,
      verboseRows: 3,
    });

    let { dpdLookup, dpdHeadwords } = sqlDpd;
    let hwIds = Object.keys(dpdHeadwords);
    should(hwIds.length).above(70000); // no paliMap filter

    should(dpdLookup.kho).instanceOf(Array);
    should(dpdLookup.devi).instanceOf(Array);
  });
  it("create() paliMap, dataDir, verboseRows, dbg", async()=>{
    const msg = `${M}@37:`;
    let paliMap = {devi:1};
    let verboseRows = 0;
    let dataDir = path.join(import.meta.dirname, '../local/dpd-test2');
    let dbg = 0;

    let sqlDpd = await SqlDpd.create({
      paliMap, verboseRows, dataDir, dbg,
    });
    should(sqlDpd).properties({
      dbg,
      rowLimit: 0,
      dataDir,
      paliMap,
      verboseRows,
    });

    let { dpdLookup, dpdHeadwords } = sqlDpd;
    let lookupKeys = Object.keys(dpdLookup);
    should.deepEqual(lookupKeys, ['de', 'devi']);

    should.deepEqual(sqlDpd.dpdLookup.devi, [34161, 34162])
    should(dpdHeadwords[34161]).properties({
      pattern: "ī fem",
      pos: "fem",
      id: 34161,
      meaning_1: "queen",
      meaning_2: "queen",
    });
    should(dpdHeadwords[34162]).properties({
      pattern: "ī fem",
      pos: "fem",
      id: 34162,
      meaning_1: "goddess",
      meaning_2: "goddess",
    });
    let hwIds = Object.keys(dpdHeadwords);
    should.deepEqual(hwIds, [
      '31672', '31673', '32231', '33953', 
      '33954', '34161', '34162',
    ]);
    should(hwIds.length).equal(7); // de, devi
  });
  it("create() headwordPatterns", async()=>{
    const msg = `${M}@37:`;
    let paliMap = { devi:1, deva:1 }; // test words
    let headwordPatterns = ['ī fem'];
    let verboseRows = 0;
    let dataDir = DATADIR;
    let dbg = 0;

    // DEPRECATED: headwordPatterns
    // Restricts headwords to the specified patterns.
    // Restricting dictionary output by part of speech
    // during ongoing development should happen at 
    // a higher level since headword ids are permanent.
    let sqlDpd = await SqlDpd.create({
      paliMap, verboseRows, dataDir, dbg, headwordPatterns,
    });
    should(sqlDpd).properties({
      dbg,
      rowLimit: 0,
      dataDir,
      paliMap,
      verboseRows,
    });

    let { dictWords, dpdLookup, dpdHeadwords } = sqlDpd;
    should(dictWords.length).equal(3); // de, devi, deva
    let lookupKeys = Object.keys(dpdLookup);
    should.deepEqual(dictWords, [ 'de', 'deva', 'devi' ]);
    should.deepEqual(lookupKeys, dictWords);

    should.deepEqual(sqlDpd.dpdLookup.devi, [34161, 34162])
    should.deepEqual(sqlDpd.dpdLookup.deva, [34018, 34019, 34020, 34021])
    should(dpdHeadwords[34018]).equal(undefined);
    should(dpdHeadwords[34161]).properties({
      pattern: "ī fem",
      pos: "fem",
      id: 34161,
      meaning_1: "queen",
      meaning_2: "queen",
    });
    should(dpdHeadwords[34162]).properties({
      pattern: "ī fem",
      pos: "fem",
      id: 34162,
      meaning_1: "goddess",
      meaning_2: "goddess",
    });
    let hwIds = Object.keys(dpdHeadwords);
    should(hwIds.length).equal(2); // devi
  });
  it("build()", async()=>{
    const msg = 'test.sql-dpd@144';
    let paliMap = { devi:1, aggi:1, "evaṁ":1 }; // test words
    let sqlDpd = await SqlDpd.create({paliMap});
    await sqlDpd.build();
    let { enAbbr, hwKeys, defPali, defLang, defMap } = sqlDpd;

    should(defMap.aggi).equal('AS,BG');
    should(defLang['AS']).equal('fire||');
    should(defPali['AS']).equal("i masc|masc|√agg+i|agg|aggi");

    should(defMap.devi).equal('8sz,8t0');
    should(defLang['8sz']).equal('queen||');
    should(defPali['8sz'])
    .equal('ī fem|fem|√div > dev+*a+ī\ndeva+ī|dev|devī 1');

    should(defMap['evaṁ']).equal('4iU,4iV');
    should(defLang['4iU']).match(/thus; this/);
    should(defPali['4iU'])
    .equal('|ind|eva+aṃ|-|evaṃ 1');

    should(enAbbr.pr).properties({meaning:'present tense'});
    let pAbbr = path.join(DATADIR, 'en', 'abbreviation-en.mjs');
    should(fs.existsSync(pAbbr)).equal(true);
  });
  it("binarySearch", ()=>{
    let data = [
      "blue",
      "red",
      "yellow",
    ].sort();
    should(SqlDpd.binarySearch(data, "blue")).equal(0);
    should(SqlDpd.binarySearch(data, "red")).equal(1);
    should(SqlDpd.binarySearch(data, "yellow")).equal(2);

    should(SqlDpd.binarySearch(data, "asdf")).equal(-1);
    should(SqlDpd.binarySearch(data, "")).equal(-1);
    should(SqlDpd.binarySearch(data, " ")).equal(-1);

    // match
    should(SqlDpd.binarySearch(data, "ba")).equal(-1);
    should(SqlDpd.binarySearch(data, "bl")).equal(0);
    should(SqlDpd.binarySearch(data, "bx")).equal(-1);
    should(SqlDpd.binarySearch(data, "ra")).equal(-1);
    should(SqlDpd.binarySearch(data, "re")).equal(1);
    should(SqlDpd.binarySearch(data, "rx")).equal(-1);
    should(SqlDpd.binarySearch(data, "ya")).equal(-1);
    should(SqlDpd.binarySearch(data, "ye")).equal(2);
    should(SqlDpd.binarySearch(data, "yx")).equal(-1);
  });
  it("TESTTESTbuild() ru", async()=>{
    const msg = `${M}@197:`;
    let paliMap = {devi:1};
    let verboseRows = 0;
    let dataDir = path.join(import.meta.dirname, '../local/dpd-test-ru');

    let sqlDpd = await SqlDpd.create({ paliMap, verboseRows, dataDir });
    await sqlDpd.build();

    let { dpdLookup, langHeadwords, defLangDPD } = sqlDpd;
    should(defLangDPD).properties('ru');
    should(langHeadwords).properties('ru');
    let ruHeadwords = langHeadwords.ru;
    let lookupKeys = Object.keys(dpdLookup);
    should.deepEqual(lookupKeys, ['de', 'devi']);

    should.deepEqual(sqlDpd.dpdLookup.devi, [34161, 34162])
    should(ruHeadwords[34161]).properties({
      id: 34161,
      meaning_1: "королева",
      meaning_2: "",
      meaning_lit: "",
    });
    should(ruHeadwords[34162]).properties({
      id: 34162,
      meaning_1: "",
      meaning_2: "богиня",
      meaning_lit: "",
    });
  });
});
