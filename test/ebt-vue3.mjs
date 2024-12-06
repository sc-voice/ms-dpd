
import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { DBG } from '../src/defines.mjs';
import {
  Pali,
  Dictionary,
} from '../main.mjs';

typeof describe === "function" && 
  describe("ebt-vue3", function () {

  it("unaccentedPattern", async ()=>{
    let msg = "test.ebt-vue3@20";
    let search = "nibbanam";
    let up = Dictionary.unaccentedPattern(search);
    should(up).equal('(n|ṅ|ñ|ṇ)(i|ī)bb(a|ā)(n|ṅ|ñ|ṇ)(a|ā)(m|ṁ|ṃ)');
    let re = new RegExp(up, 'i');
    should(re.test('nibbanam')).equal(true);
    should(re.test('nibbanaṁ')).equal(true);
    should(re.test('nibbānaṁ')).equal(true);
    should(re.test('dukkhassa')).equal(false);
  });
  it("find() mūlan’ti", async()=>{
    let msg = "test.ebt-vue3@31";
    let dict = await Dictionary.create();
    let resExpected = dict.find("mūlaṁ");

    let res1 = dict.find("mūlan’ti");
    should(res1).instanceof(Object);
    should(res1.data[0].meaning).equal(resExpected.data[0].meaning);
    should(res1.data[1].meaning).equal(resExpected.data[1].meaning);
    //TODO: 
    //should.deepEqual(Object.keys(res1), Object.keys(resExpected));
    //should.deepEqual(res1, resExpected);
  });
  it("abbreviationInfo()", async()=>{
    let dict = await Dictionary.create();

    should(dict.abbreviationInfo("fem")).properties({
      abbreviation: "fem",
      meaning: "feminine noun",
      explanation: "",
    });
  });
  it("wordsWithPrefix()", async ()=>{
    let dict = await Dictionary.create();

    // When strict is false, unaccented patterns are used
    should.deepEqual(dict.wordsWithPrefix("samvega"), [
      "saṁvega",
      "saṁvegā",
      //"saṁvegaṁ",
      "saṁvegaj\u2026",
      "saṁvegam\u2026",
      "saṁvegas\u2026",
      "saṁvegāy\u2026",
    ]);
  });
  it("entryOf()", async()=>{
    let dict = await Dictionary.create();
    let dhamma = dict.entryOf("dhamma");
    should(dhamma).properties({word:"dhamma"});
    let def0 = dict.parseDefinition(dhamma.definition[0]);
    should(def0).properties({
      type: 'masc',
      meaning: 'nature; character',
      literal: '',
      construction: '√dhar+ma',
    });
  });

});
