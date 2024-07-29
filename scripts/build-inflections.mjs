#!/usr/bin/env node
console.log(process.argv.join("|"));
let [ NODE, SCRIPT, ...args] = process.argv;
import fs from 'fs';
const { promises: fsp } = fs;
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Inflection from '../src/inflection.mjs'
import Table from '../src/table.mjs'

const SCRIPT_FILE = SCRIPT.split('/').pop();

function parseArgs() {
  const msg = "parseArgs()";
  const dbg = 1;
  let patternFilter;
  let outSkipped;
  let skipIrregular;
  let verbose;

  for (let i=0; i<args.length; i++) {
    let arg = args[i];
    switch (arg) {
      case '-v': {
        verbose = true;
      } break;
      case '-si': {
        skipIrregular = true;
      } break;
      case '-os': {
        outSkipped = true;
      } break;
      case '-p': {
        patternFilter = args[++i];
      } break;
      default: {
        console.log(msg, `ignored: ${arg}`);
      } break;
    }
  }

  let result = {
    patternFilter,
    verbose,
    outSkipped,
    skipIrregular,
  }
  dbg && console.log(msg, result);
  return result;
}
let {
  patternFilter,
  verbose,
  outSkipped,
  skipIrregular,
} = parseArgs();

(async function() {
  const msg = `${path.basename(SCRIPT)}:`;
  const dbg = 1;
  const dbgv = dbg && verbose;

  // load inflection CSV
  let inflections = [];
  const srcPath = `${__dirname}/../src/dpd_inflection_templates`;
  let srcData = await fsp.readFile(srcPath);
  let srcLines = srcData.toString().trim().split('\n');
  if (patternFilter) {
    let re = new RegExp(patternFilter, 'i');
    srcLines = srcLines.filter(line=>{
      let [ pattern, like, data ] = line.split('|');
      return re.test(pattern); 
    });
  }
  let skipped = [];
  srcLines.forEach(line=>{
    let [ pattern, like, data ] = line.split('|');
    switch (like) {
      case 'dhamma':  // a masc
      case 'vedanā':  // a fem
      case 'citta':   // a nt
        Inflection.parseDpdInflection(line, inflections); 
        break;
      default: {
        let [ pali, cat, ...pat3 ] = pattern.split(' ');
        if (!skipIrregular || like!=='irreg') {
          skipped.push({cat, pali, pat3, like});
        }
        break;
      }
    }
  });
  let infTable = Table.fromRows(inflections);
  console.log(infTable.format());
  if (outSkipped) {
    let skipTable = Table.fromRows(skipped);
    skipTable.sort();
    console.log(skipTable.format());
  }
})()
