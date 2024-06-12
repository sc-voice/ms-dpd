import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { compress, decompress } from 'shrink-string';
import { default as Lzw } from '../src/lzw.mjs';

const DHAMMA_PATH = `${__dirname}/data/dhamma.json`;
const ABADDHO_PATH = `${__dirname}/data/abaddho.json`;
typeof describe === "function" && describe("compress", function () {
  it("shrink-string", async() => {
    // Compression of long strings creates shorter strings
    let dhamma = fs.readFileSync(DHAMMA_PATH).toString();
    let dhammaz = await compress(dhamma);
    let dhamma2 = await decompress(dhammaz);
    should(dhamma2).equal(dhamma);
    console.log(dhammaz.length, dhamma2.length, dhammaz);
    should(dhamma.length).equal(1106);
    should(dhammaz.length).equal(544);

    // Compression of short strings creates longer strings
    let abaddho = fs.readFileSync(ABADDHO_PATH).toString();
    let abaddhoz = await compress(abaddho);
    let abaddho2 = await decompress(abaddhoz);
    should(abaddho2).equal(abaddho);
    console.log(abaddhoz.length, abaddho2.length, abaddhoz);
    should(abaddho.length).equal(192);
    should(abaddhoz.length).equal(216);
  });
  it("lzw_encode", async() => {
    let lzw = new Lzw();
    // Compression of long strings creates shorter strings
    let dhamma = fs.readFileSync(DHAMMA_PATH).toString();
    let dhammaz = await lzw.lzw_encode(dhamma);
    let dhamma2 = await lzw.lzw_decode(dhammaz);
    should(dhamma2).equal(dhamma);
    console.log(dhamma.length, dhammaz.length, dhammaz);
    //should(dhamma.length).equal(1106);
    //should(dhammaz.length).equal(544);

    // Compression of short strings creates longer strings
    let abaddho = fs.readFileSync(ABADDHO_PATH).toString();
    let abaddhoz = await lzw.lzw_encode(abaddho);
    let abaddho2 = await lzw.lzw_decode(abaddhoz);
    should(abaddho2).equal(abaddho);
    console.log(abaddho.length, abaddhoz.length, abaddhoz);
    //should(abaddho.length).equal(192);
    //should(abaddhoz.length).equal(216);
  });
  it("TESTTESTlzw.encode", async() => {
    let lzw = new Lzw();
    // Compression of long strings creates shorter strings
    let dhamma = fs.readFileSync(DHAMMA_PATH).toString();
    let dhammaz = await lzw.encode(dhamma);
    let dhamma2 = await lzw.decode(dhammaz);
    should(dhamma2).equal(dhamma);
    console.log(dhamma.length, dhammaz.length, dhammaz);
    //should(dhamma.length).equal(1106);
    //should(dhammaz.length).equal(544);

    // Compression of short strings creates longer strings
    let abaddho = fs.readFileSync(ABADDHO_PATH).toString();
    let abaddhoz = await lzw.encode(abaddho);
    let abaddho2 = await lzw.decode(abaddhoz);
    should(abaddho2).equal(abaddho);
    console.log(abaddho.length, abaddhoz.length, abaddhoz);
    //should(abaddho.length).equal(192);
    //should(abaddhoz.length).equal(216);
  });
});
