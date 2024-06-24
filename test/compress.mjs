import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { default as Compress } from '../src/compress.mjs';

const DHAMMA_PATH = `${__dirname}/data/dhamma.json`;
const ABADDHO_PATH = `${__dirname}/data/abaddho.json`;
typeof describe === "function" && describe("compress", function () {
  it("lz-string", async() => {
    let cmprs = new Compress();

    // Compression of long strings creates shorter strings
    let dhamma = fs.readFileSync(DHAMMA_PATH).toString();
    let dhammaz = await cmprs.lzwCompress(dhamma);
    //console.log(dhamma.length, dhammaz.length, dhammaz);
    let dhamma2 = await cmprs.lzwDecompress(dhammaz);
    should(dhamma2).equal(dhamma);
    should(dhamma.length).equal(1106);
    //should(dhammaz.length).equal(764);

    // Compression of short strings creates longer strings
    let abaddho = fs.readFileSync(ABADDHO_PATH).toString();
    let abaddhoz = await cmprs.lzwCompress(abaddho);
    //console.log(abaddho.length, abaddhoz.length, abaddhoz);
    let abaddho2 = await cmprs.lzwDecompress(abaddhoz);
    should(abaddho2).equal(abaddho);
    should(abaddho.length).equal(192);
    //should(abaddhoz.length).equal(216);
  });
  it("linesCompress()", async ()=>{
    let cmprs = new Compress();
    let lines = [
      "abbrev. <b>Vibhaṅga Aṭṭhakathā</b>",
      "abbrev. <b>abbreviation of Cambodia;",
      "abbrev. <b>abbreviation of Cūḷaniddesa;",
      "abbrev. <b>abbreviation of Khuddaka (pāṭha)</b>",
      "abbrev. <b>abbreviation of Majjhima (Nikāya)</b>",
    ];
    let lc = await cmprs.linesCompress(lines);
    should.deepEqual(lc, [
      "abbrev. <b>Vibhaṅga Aṭṭhakathā</b>",
      "11|abbreviation of Cambodia;",
      "28|ūḷaniddesa;",
      "27|Khuddaka (pāṭha)</b>",
      "27|Majjhima (Nikāya)</b>",
    ]);
  });
  it("linesDecompress()", async ()=>{
    let cmprs = new Compress();
    let lines = [
      "abbrev. <b>Vibhaṅga Aṭṭhakathā</b>",
      "abbrev. <b>abbreviation of Cambodia;",
      "abbrev. <b>abbreviation of Cūḷaniddesa;",
      "abbrev. <b>abbreviation of Khuddaka (pāṭha)</b>",
      "abbrev. <b>abbreviation of Majjhima (Nikāya)</b>",
    ];
    let lc = await cmprs.linesCompress(lines);
    let ld = await cmprs.linesDecompress(lc);
    should.deepEqual(ld, lines);
  });
});
