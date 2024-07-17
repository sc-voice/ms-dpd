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
    should(dict.dpdTexts.length).above(52000).below(55000);
  });
  it("entryOf()", async()=>{
    let dict = await Dictionary.create();
    let dhamma = dict.entryOf("dhamma");
    should(dhamma).properties(["word", "definition"]);
    should(dhamma.word).equal("dhamma");
    let def0 = dict.parseDefinition(dhamma.definition[0]);
    should.deepEqual(def0, {
      type: 'masc',
      meaning: 'nature; character',
      literal: '',
      construction: '√dhar˖ma',
    });
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
      dhamma.definition.slice(12,16),
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
  it("relatedEntries()", async()=>{
    const msg = 'test.dictionary@73';
    let dict = await Dictionary.create();
    let entries = dict.relatedEntries("dhamma");
    //console.log(msg, entries);
    should(entries.length).equal(15);
    let dhammaya = entries.find(e=>e.word === 'dhammāya');
    should(dhammaya.overlap).equal(1);
    should(dhammaya.definition.length).equal(17);
    let dhammani = entries.find(e=>e.word === 'dhammāni');
    should(dhammani.definition.length).equal(3);
  });
  it("parseDefinition()", async()=>{
    let dict = await Dictionary.create();
    let entry = dict.entryOf("dhamma");
    should.deepEqual(dict.parseDefinition(entry.definition[0]), {
      type: 'masc',
      meaning: 'nature; character',
      literal: '',
      construction: '√dhar˖ma',
    });
  });
  it("findWords()", async()=>{
    let dict = await Dictionary.create();
    let matches = dict.findWords(/\bto the Truth/i);
    should(matches.length).equal(10);

    { // matches single word
      let { definition, words } = matches[0];
      //console.log(matches[0]);
      should.deepEqual(words, ['saccagāmiṁ']);
      should.deepEqual(dict.parseDefinition(definition), {
        type: 'adj',
        meaning: 'leading to the truth; going to the true',
        literal: '',
        construction: 'sacca˖gāmī',
      });
    }

    { // matches multiple words
      let { definition, words } = matches[7];
      //console.log(matches[6]);
      should.deepEqual(words, ['saccānubodhaṁ', 'saccānubodho']);
      should.deepEqual(dict.parseDefinition(definition), {
        type: 'masc',
        meaning: 'awakening to the truth; understanding the truth; realizing reality',
        literal: '',
        construction: 'sacca˖anubodha',
      });
    }
  });
  it("find() moral behaviour (definition)", async()=>{
    let dict = await Dictionary.create();
    let pattern = 'moral behaviour';
    let res = dict.find(pattern);
    should(res.method).equal('definition');
    should(res.pattern).equal(pattern);
    for (let i=0; i<res.data.length; i++) {
      let { meaning } = res.data[i];
      should(meaning).match(new RegExp(`\\b${pattern}`, 'i'));
    }
    should(res.data.length).equal(25);
  });
  it("find() dhamma (entry)", async()=>{
    let dict = await Dictionary.create();
    let dhamma = dict.find("dhamma");
    should(dhamma).properties(['pattern', 'method', 'data' ]);
    should(dhamma.method).equal('entry');
    should(dhamma.pattern).equal('dhamma');
    should(dhamma.data[0]).properties([
      "word", "type", "meaning", "literal", "construction"
    ]);
    should.deepEqual(dhamma.data[0], {
      word: 'dhamma',
      type: 'masc',
      literal: '',
      construction: '√dhar˖ma',
      meaning: 'nature; character',
    });
  });
  it("normalizePattern()", ()=>{
    let good = "abcdefghijklmnopqrstuvwxyz";
    let accented = [ 
      'ā', 'ī', 'ū', 'ṁ', 'ṃ', 'ḍ', 'ṅ', 'ñ', 'ṇ', 'ḷ', 'ṭ',
    ].join('');
    should(Dictionary.normalizePattern(good)).equal(good);
    should(Dictionary.normalizePattern(accented)).equal(accented);
  });
  it("find() unaccented", async()=>{
    let dict = await Dictionary.create();
    let dhamma = dict.find("dhamma");
    let dhamma_rom = dict.find("dhamma", {method:'unaccented'});
    should(dhamma_rom).properties(['pattern', 'method', 'data' ]);
    should(dhamma_rom.method).equal('unaccented');
    should(dhamma_rom.pattern).equal('(d|ḍ)h(a|ā)(m|ṁ|ṃ)(m|ṁ|ṃ)(a|ā)');
    should(dhamma_rom.data.length).equal(34);
    should.deepEqual(dhamma_rom.data[0], { // same as "dhamma"
      word: 'dhamma',
      type: 'masc',
      literal: '',
      construction: '√dhar˖ma',
      meaning: 'nature; character',
    });
    should.deepEqual(dhamma_rom.data[17], { // almost like "dhamma"
      word: 'dhammā', 
      type: 'masc',
      literal: '',
      construction: '√dhar˖ma',
      meaning: 'nature; character',
    });
  });
  it("find() definition superior virtue", async()=>{
    let dict = await Dictionary.create();
    let virtue = dict.find("superior virtue", {method:'definition'});
    should(virtue).properties(['pattern', 'method', 'data' ]);
    should(virtue.method).equal('definition');
    should(virtue.pattern).equal('superior virtue');
    should(virtue.data.length).equal(1);
    should.deepEqual(virtue.data[0], {
      word: 'sīlaggaṁ',
      type: 'nt',
      literal: '',
      meaning: 'the highest ethical conduct; superior virtue',
      construction: 'sīla˖agga',
    });
  });
  it("find() definition virtue; moral behaviour", async()=>{
    let dict = await Dictionary.create();
    let pattern = 'virtue; moral behaviour';
    let virtue = dict.find(pattern, {method: 'definition'});
    should(virtue).properties(['pattern', 'method', 'data' ]);
    should(virtue.method).equal('definition');
    should(virtue.pattern).equal(pattern);
    should(virtue.data.length).equal(14);
    should.deepEqual(virtue.data[0], {
      word: 'dhamma',
      type: 'masc',
      literal: '',
      meaning: 'virtue; moral behaviour',
      construction: '√dhar˖ma',
    });
    should.deepEqual(virtue.data[1], {
      word: 'dhammasmiṁ',
      type: 'masc',
      literal: '',
      meaning: 'virtue; moral behaviour',
      construction: '√dhar˖ma',
    });
  });
  it("isAccented()", ()=>{
    should(Dictionary.isAccented("samvega")).equal(false);
    should(Dictionary.isAccented("saṁvega")).equal(true);
  });
  it("wordsWithPrefix()", async ()=>{
    let dict = await Dictionary.create();

    // When strict is false (default), the output may have ellipses:
    should.deepEqual(dict.wordsWithPrefix("sam").slice(0,20), [
      "saṁ",  // 3-letter exact
      "sama", // 4-letter exact
      "samā", // 4-letter exact
      "same", // 4-letter exact
      "sami", // 4-letter exact
      "samo", // 4-letter exact
      "samū", // 4-letter exact
      "sāma", // 4-letter exact
      "sāmā", // 4-letter exact
      "sāmi", // 4-letter exact
      "sāmī", // 4-letter exact
      "sāmo", // 4-letter exact
      "sama\u2026", // 4-letter prefix
      "samā\u2026", // 4-letter prefix
      "samb\u2026", // 4-letter prefix
      "same\u2026", // 4-letter prefix
      "samh\u2026", // 4-letter prefix
      "sami\u2026", // 4-letter prefix
      "samī\u2026", // 4-letter prefix
      "samm\u2026", // 4-letter prefix
    ]);

    // When strict is false, unaccented patterns are used
    should.deepEqual(dict.wordsWithPrefix("samvega"), [
      "saṁvega",
      "saṁvegaṁ",
      "saṁvegaj\u2026",
      "saṁvegam\u2026",
      "saṁvegas\u2026",
      "saṁvegāy\u2026",
    ]);
  });
  it("wordsWithPrefix() strict", async ()=>{
    let dict = await Dictionary.create();
    let opts = { strict: true };
    should.deepEqual(dict.wordsWithPrefix("samvega", opts), [
      // there is no samvega
    ]);
    let sam = dict.wordsWithPrefix("saṁ", opts);
    should(sam[0]).equal("saṁ"); // exact match
    should(sam.length).above(404).below(500);
  });
  it("ABBREVIATIONS", ()=>{
    should(Dictionary.ABBREVIATIONS).properties({
      pr: {
        meaning: "present"
      }
    });
  });
  it("find() -mu", async()=>{
    let dict = await Dictionary.create();
    let dhamma = dict.find("dhamma -mu");
    should(dhamma.data.length).equal(34); // dhamma + dhammā
  });
  it("TESTTESTwordInflections", async()=>{ // ExPERIMENTAL
    let dict = await Dictionary.create();
    let infs = dict.wordInflections("dhamma");
  });
  it("TESTTESTprefixOf()", ()=>{
    // useless
    should(Dictionary.prefixOf('')).equal('');
    should(Dictionary.prefixOf('abc')).equal('abc');

    should(Dictionary.prefixOf('abcdef', 'abc', 'aba')).equal('ab');
    should(Dictionary.prefixOf(['a', 'abc', 'aba'])).equal('a');
  });
});
