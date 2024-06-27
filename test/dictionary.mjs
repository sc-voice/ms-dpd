import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { default as Dictionary } from '../src/dictionary.mjs';

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

    let dhamma = dict.entryOf("dhamma");
    let { definition } = dhamma;
    let dhamma2 = dict.entryOf("dhamma");
    should.deepEqual(dhamma2, dhamma);

    // No entry
    should(definition[0]).match(/nature; character/);
    let asdf = dict.entryOf("asdf");
    should(asdf).equal(null);
  });
  it("lookup()", async()=>{
    let dict = await Dictionary.create();

    let dhamma = dict.lookup("dhamma");
    should(dhamma.key).equal("dhamma");
    //console.log(dhamma);
    let dhammo = dict.lookup("dhammo");
    should(dhammo.key).equal("dhammo");
    should.deepEqual(
      dhamma.definition.slice(0,11),
      dhammo.definition.slice(0,11));
    should.deepEqual(
      dhamma.definition.slice(12),
      dhammo.definition.slice(11));
  });
});
