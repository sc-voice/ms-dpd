import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { default as Dictionary } from '../src/dictionary.mjs';

typeof describe === "function" && 
  describe("TESTTESTdictionary", function () 
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
  });
  it("lookup()", async()=>{
    let dict = await Dictionary.create();

    // Entry
    let dhamma = await dict.lookup("dhamma");
    let { definition } = dhamma;
    //console.log(definition);

    // No entry
    should(definition[0]).match(/nature; character/);
    let asdf = await dict.lookup("asdf");
    should(asdf).equal(null);
  });
});
