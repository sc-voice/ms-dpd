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

const SCRIPT_FILE = SCRIPT.split('/').pop();

function parseArgs() {
  const msg = "parseArgs()";
  const dbg = 1;
  let patternFilter;
  let verbose;
  let infCase;

  for (let i=0; i<args.length; i++) {
    let arg = args[i];
    switch (arg) {
      case '-ic': {
        infCase = args[++i];
      } break;
      case '-v': {
        verbose = true;
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
    infCase,
  }
  dbg && console.log(msg, result);
  return result;
}
let {
  patternFilter,
  verbose,
  infCase,
} = parseArgs();

class DpdInflection {
  constructor(opts={}) {
    const msg = 'DpdInflection.ctor';
    Object.assign(this, opts);
  }
}

function parseDataRow(row, opts={}) {
  const msg = `parseDataRow()`;
  let {
    pattern,
    inflections,
    comps,
  } = opts;
  const dbg = 0;
  const dbgv = 0;
  let dbgmsg;
  let dbgvmsg;
  let rowType = row[0][0];
  let group;
  switch (rowType) {
    case '': 
      rowType = 'title'; 
      dbgv && (dbgvmsg = `${pattern} ["${row[0]}", "${row[1]}",...]`);
      break;
    case 'nom':
    case 'acc':
    case 'instr':
    case 'dat':
    case 'abl':
    case 'gen':
    case 'loc':
    case 'voc': {
      rowType = 'declension';
      for (let i=1; i<row.length; i+=2) {
        let data = row[i];
        let key = row[i+1];
        dbg && console.log(msg, {comps, key, data});
      }
      dbg && (dbgmsg = `${pattern}, ${rowType}`);
    } break;
    case 'in comps':
      group = row[1];
      break;
    default:
      dbgv && (
        dbgvmsg = `...${pattern} [${row[0]}, ${row[1]}, ...] IGNORED`
      );
      break;
  }
  dbgmsg && console.log(msg, dbgmsg);
  dbgvmsg && console.log(msg, dbgvmsg);
  return {
    rowType,
    group,
    inflections,
  };
}

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
  srcLines.forEach(line=>{
    let [ pattern, like, data ] = line.split('|');
    let rows = JSON.parse(data);
    let rowType;
    let group;
    let inflections = [];
    let lastRow = rows[rows.length-1];
    let in_comps = lastRow[0][0];
    let comps = lastRow[1];
    dbg && console.log(msg, {pattern, like, comps});
    dbg && rows.forEach((row,iRow)=>{
      let showSrc = infCase
        ? 0<=infCase.split(',').findIndex(ic=>row[0][0]===ic)
        : true;
      if (showSrc) {
        let srcRow = row.map((cell,i)=>{
          if (i === 0) {
            return (iRow==0 ? '' : (iRow.toString())).padStart(2)+' ';
          } else if (i % 2) {
            return (cell.join(',')||'-o-').padEnd(24);
          } else {
            let text = cell.join(',') || '-o-';
            return dbgv 
              ? text.padEnd(14) 
              : (text&&'\u2026 ' || text);
          }
        });
        console.log(srcRow.join(''));
      }
      let info = parseDataRow(row, {pattern, comps, inflections});
      rowType = rowType || info.rowType;
      group = group || info.group;
    });
  });
/*

  let keys = srcLines[0].split(' , ');
  for (let id=1; id<srcLines.length; id++) {
    let line = srcLines[id]
      .replaceAll('ṃ', 'ṁ')
      .split(' , ');
    let entry = {id};
    for (let j=0; j<keys.length; j++) {
      let key = keys[j];
      let value = line[j];
      switch (key) {
        case 'singular':
        case 'plural':
          value = value &&
            value.split('/').map(s=>s.trim().replace('-','') );
          break;
        case "case": {
          value = value && value.toLowerCase(); // match DPD
          key = "case";
        } break;
      }
      let re = new RegExp('---*');
      entry[key] = re.test(value) ? null : value;
    }
    inflections.push(entry);
  }

  // Save OCBS inflection rules
  let infJSON = JSON.stringify(inflections, null, 2);
  infJSON = 'export const INFLECTIONS=' + infJSON;
  const dstPath = `${__dirname}/../data/inflections-ocbs.mjs`;
  await fs.promises.writeFile(dstPath, infJSON);
  console.log(msg, dstPath);
*/
})()
