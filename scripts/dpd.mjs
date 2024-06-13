import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { default as Compress } from "../src/compress.mjs";

const msg = `${__filename}`;
let APIURL = 'https://suttacentral.net/api';
let url = `${APIURL}/dictionaries/lookup?from=pli&to=en`;
let res = await fetch(url);
let data = await res.json();
let dataMap = {
  __metadata: {
    license: "https://digitalpalidictionary.github.io/titlepage.html",
    version: "1.0.0",
  }
}

let cmprs = new Compress();

for (let i = 0; i < data.length; i++) {
  let di = data[i];
  let key = di.entry;
  let { definition } = di;
  let info = JSON.stringify({ definition });
  if (definition) {
    if (1) {
      let infoCompress = await cmprs.lzwCompress(info);
      dataMap[key] = infoCompress;
    } else {
      dataMap[key] = info;
    }
  }
}

let outPath = `${__dirname}/../data/dpd-en.mjs`;
let out = JSON.stringify(dataMap,null,1);
out = `export const DPD=${out}`;
let keys = Object.keys(dataMap);
fs.writeFileSync(outPath, out);

console.log(msg, 'DPD dictionary updated', {
  bytes: out.length*2,
  keys: keys.length, 
  outPath,
});
