import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import {
  Pali,
  Dictionary,
} from '../main.mjs';

typeof describe === "function" && 
  describe("dictionary", function () 
{
  it("default ctor", async() => {
    let eCaught;
    try {
      let dict = new Dictionary();
    } catch(e) {
      eCaught = e;
    }
    should(eCaught?.message).match(/Use Dictionary.create/);
  });
  it("create()", async()=>{
    let dict = await Dictionary.create();
    should(dict.lang).equal('en');
    should(dict.dpd.__metadata.license).match(/digitalpalidictionary/);
    should(dict.dpdTexts.length).equal(49757);
  });
  it("TESTTESTentryOf()", async()=>{
    let dict = await Dictionary.create();

    // dhamma
    let dhamma = dict.entryOf("dhamma");
    should(dhamma).properties(["word", "definition"]);
    should(dhamma.word).equal("dhamma");
    should(dhamma.definition[0]).match(/nature; character/);
    should(dhamma.definition[11])
      .match(/nt.*teaching; discourse;/);
    let dhamma2 = dict.entryOf("dhamma");
    should.deepEqual(dhamma2, dhamma);

    // No entry
    let asdf = dict.entryOf("asdf");
    should(asdf).equal(null);

    // dhammo (similar definition)
    let dhammo = dict.entryOf("dhammo");
    should(dhammo.word).equal("dhammo");
    should.deepEqual(
      dhamma.definition.slice(0,11),
      dhammo.definition.slice(0,11));
    should.deepEqual(
      dhamma.definition.slice(12),
      dhammo.definition.slice(11));

    // dhammaṁ (anusvāra)
    let dhammam = dict.entryOf("dhammaṁ");
    should.deepEqual(dhammam.definition, dhamma.definition);

    // giddhe (literal)
    let giddhe = dict.entryOf("giddhe");
    should(giddhe.word).equal("giddhe");
    should(giddhe.definition[0])
      .match(/pp\|greedy.*\|become greedy\|√gidh˖ta/);
  });
  it("TESTTESTrelatedEntries()", async()=>{
    let dict = await Dictionary.create();
    let entries = dict.relatedEntries("dhamma");
    should(entries.length).equal(15);
    let dhammaya = entries.find(e=>e.word === 'dhammāya');
    should(dhammaya.overlap).equal(1);
    should(dhammaya.definition.length).equal(16);
    let dhammani = entries.find(e=>e.word === 'dhammāni');
    should(dhammani.definition.length).equal(3);
  });
});
