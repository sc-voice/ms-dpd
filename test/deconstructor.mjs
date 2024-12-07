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
  describe("deconstructor", function () {

  it("sandiṭṭhiparāmāsiādhānaggāhiduppaṭinissaggissa", async()=>{
    const msg = "test.deconstructor@18";
    if (!DBG.TBD) { console.log(msg, "TBD"); return; }
    let dict = await Dictionary.create();
    let word = 'sandiṭṭhiparāmāsiādhānaggāhiduppaṭinissaggissa';
    let res = dict.deconstruct(word);
    should(res).properties({ word, });
    should(res.output.length).equal(1, "TBD");
    should.deepEqual(res.output[0], [
      "sandiṭṭhiparāmāsi", "ādhānaggāhi", "duppaṭinissaggissa"
    ]);
  });
})
