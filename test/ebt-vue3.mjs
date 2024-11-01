
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
  describe("TESTTESTebt-vue3", function () 
{

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
    should.deepEqual(Object.keys(res1), Object.keys(resExpected));
    should.deepEqual(res1, resExpected);
  });
});
