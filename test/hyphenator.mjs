import fs from 'fs';
import path from 'path';

import { Pali } from "../main.mjs";
import should from "should";
import { Dictionary } from "../main.mjs";
import { DBG } from "../src/defines.mjs";
const { dirname:DIRNAME, filename:FILENAME } = import.meta;

var EBT_TEST_MAP;
var dict = Dictionary.create();

typeof describe === "function" && describe("hyphenator", function () {
  before(async()=>{
    const msg = "test.hyphenator.before";
    let ebtPath = path.join(DIRNAME, "ebt-hyphenations.json");
    
    if (fs.existsSync(ebtPath)) {
      let ebtJson = await fs.promises.readFile(ebtPath);
      EBT_TEST_MAP = JSON.parse(ebtJson);
    } else {
      let dpdPath = path.join(DIRNAME, "dpd_hyphenations.json");
      let dpdJson = await fs.promises.readFile(dpdPath);
      let dpdMap = JSON.parse(dpdJson);
      dict = await dict;
      let dpdWords = Object.keys(dpdMap);
      let ebtWords = dpdWords.filter(word=>{
        return dict.entryOf(word);
      });
      let ebtMap = ebtWords.reduce((a,word)=>{
        a[word] = dpdMap[word];
        return a;
      }, {});
      console.log(msg, dpdWords.length, ebtWords.length);
      let ebtJson = JSON.stringify(ebtMap, null, 2);
      console.log(msg, '[1]ebtPath', ebtPath);
      await fs.promises.writeFile(ebtPath, ebtJson);
      EBT_TEST_MAP = ebtMap;
    }
  });
  it("hyphenate() sajjhāyadhanadhaññā", async()=>{
    const msg = "test.hyphenator@41";
    let words = Object.keys(EBT_TEST_MAP);
    dict = await dict;
    let parts = dict.hyphenate('sajjhāyadhanadhaññā');
    should.deepEqual(parts, [ 'sajjhāya', 'dhanadhaññā' ]);
  });
  it("hyphenate()", async()=>{
    const msg = "test.hyphenator@48";
    let words = Object.keys(EBT_TEST_MAP);
    let TEST_START = 0;
    let TEST_END = 17; // words.length
    dict = await dict;
    for (let i=TEST_START; i<TEST_END; i++) {
      let word = words[i];
      // DPD test expectations are more detailed
      // and may include words not in EBT.
      // Therefore we need to have EBT expectations
      // that correspond to words actually in EBT.
      // The two expectations are separated by the "!".
      let dpdExpected = EBT_TEST_MAP[word];
      let ebtExpected = dpdExpected.replace(/!.*/,""); // dpd is better
      let expected = ebtExpected.split("-");

      let parts = dict.hyphenate(word);
      try {
        should(parts).not.equal(undefined); 
        should.deepEqual(parts, expected);
      } catch (e) {
        console.error(msg, 'FAIL', {i, word, parts, expected});
        throw e;
      }
    }
  });
  it("hyphenate() (single)", async()=>{
    const msg = "test.hyphenator@76";
    let dbg = 0 && DBG.HYPHENATE;
    let words = Object.keys(EBT_TEST_MAP);
    let TEST_START = 17;
    let TEST_END = TEST_START+1; 
    dict = await dict;
    for (let i=TEST_START; i<TEST_END; i++) {
      let word = words[i];
      // DPD test expectations are more detailed
      // and may include words not in EBT.
      // Therefore we need to have EBT expectations
      // that correspond to words actually in EBT.
      // The two expectations are separated by the "!".
      let dpdExpected = EBT_TEST_MAP[word];
      let ebtExpected = dpdExpected.replace(/!.*/,""); // dpd is better
      let expected = ebtExpected.split("-");

      dbg && console.log(msg, 'TEST', i, word);
      let parts = dict.hyphenate(word);
      try {
        should(parts).not.equal(undefined); 
        should.deepEqual(parts, expected);
      } catch (e) {
        console.error(msg, 'FAIL', {i, word, parts, expected});
        throw e;
      }
    }
  });
  it("TESTTESThyphenate() jhāyinomhā", async()=>{
    const msg = "test.hyphenator@105";
    let dbg = DBG.HYPHENATE;
    dict = await dict;
    let word = 'jhāyinomhā';
    let parts = dict.hyphenate(word);
    // jhāyino + amhā
    console.log(msg, `TBD-sandhi: ${word}=>`, parts);
  });
});
