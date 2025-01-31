#!/usr/bin/env node
console.log(process.argv.join('|'));
let [NODE, SCRIPT, ...args] = process.argv;
import fs from 'node:fs';
const { promises: fsp } = fs;
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Inflection from '../src/inflection.mjs';
import Table from '../src/table.mjs';

const SCRIPT_FILE = SCRIPT.split('/').pop();

function parseArgs() {
  const msg = 'parseArgs()';
  const dbg = 0;
  let patternFilter;
  let outSkipped;
  let skipIrregular;
  let verbose = dbg;

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    switch (arg) {
      case '--verbose':
      case '-v':
        {
          verbose = true;
        }
        break;
      case '-si':
        {
          skipIrregular = true;
        }
        break;
      case '-os':
        {
          outSkipped = true;
        }
        break;
      case '-p':
        {
          patternFilter = args[++i];
        }
        break;
      default:
        {
          console.log(msg, `ignored: ${arg}`);
        }
        break;
    }
  }

  let result = {
    patternFilter,
    verbose,
    outSkipped,
    skipIrregular,
  };
  verbose && console.log(msg, result);
  return result;
}
let { patternFilter, verbose, outSkipped, skipIrregular } =
  parseArgs();

(async () => {
  const msg = `${path.basename(SCRIPT)}:`;
  const dbg = 1;
  const dbgv = dbg && verbose;

  // load inflection CSV
  let inflections = [];
  const srcPath = `${__dirname}/../src/dpd-inflection-templates`;
  let srcData = await fsp.readFile(srcPath);
  srcData = srcData.toString().trim();
  let srcLines = srcData.split('\n');
  if (patternFilter) {
    let re = new RegExp(patternFilter, 'i');
    srcLines = srcLines.filter((line) => {
      let [pattern, like, data] = line.split('|');
      return re.test(pattern);
    });
  }
  let skipped = [];
  srcLines.forEach((line) => {
    let [pattern, like, data] = line.split('|');
    switch (like) {
      case 'dhamma': // a masc
      case 'vedanā': // a fem
      case 'citta': // a nt
      case 'sappi': // i nt
      case 'bhikkhunī': // ī fem
        Inflection.parseDpdInflection(line, inflections);
        break;
      default: {
        let [pali, cat, ...pat3] = pattern.split(' ');
        if (!skipIrregular || like !== 'irreg') {
          skipped.push({ cat, pali, pat3, like });
        }
        break;
      }
    }
  });
  inflections.sort(Inflection.compare);
  inflections.forEach((inf, i) => {
    inf.id = i + 1;
  });
  let infTable = Table.fromRows(inflections);
  verbose && console.log(infTable.format());
  if (outSkipped) {
    let skipTable = Table.fromRows(skipped);
    skipTable.sort();
    console.log(skipTable.format());
  }
  let json = infTable.toJSON();
  let sJson = JSON.stringify(json)
    .split('[')
    .join('\n[')
    .split('],"')
    .join('],\n"');
  sJson = [
    'const INFLECTIONS=',
    sJson,
    'export default INFLECTIONS;',
  ].join('\n');
  let outPath = path.join(__dirname, '../dpd/dpd-inflections.mjs');
  await fsp.writeFile(outPath, sJson);
  console.log(msg, 'output:', outPath);
})();
