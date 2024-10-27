import fs from 'fs';
const fsp = fs.promises;
import path from 'path';
import util from 'util';
import * as url from 'url';
const exec = util.promisify(require('child_process').exec);
import { DBG } from '../../src/defines.mjs';
const msg = "SqlDpd:";
import * as Pali from '../../src/pali.mjs';

const SCV_PATTERNS = [
  ...('aāiī'.split('').reduce((a,l)=>{
    a.push(`${l} masc`);
    a.push(`${l} fem`);
    a.push(`${l} nt`);
    return a;
  }, [])),
];

export default class SqlDpd {
  constructor(opts={}) {
    const msg = "SqlDpd.ctor:";
    let {
      dbg = DBG.SQL_DPD,
      mode = 'json',
      rowLimit = 130,
      maxBuffer = 10 * 1024 * 1024,
      dataDir = path.join("../../data"),
    } = opts;

    Object.assign(this, {
      dbg,
      mode,
      rowLimit,
      dataDir,
    });
    console.log(msg, '[1]this', this);
  }

  async bashSql(sql, opts={}) {
    const msg = `SqlDpd.bashSql()`;
    let {
      dbg = this.dbg,
      mode = this.mode,
      maxBuffer = this.maxBuffer,
    } = opts;
    try {
      dbg && console.error(msg, '[1]sql', sql);
      let cmd = [
        'sqlite3 --batch local/dpd.db',
        mode ? `".mode ${mode}"` : '',
        `"${sql}"`,
      ].join(' ');
      dbg && console.error(msg, '[2]cmd', cmd);
      let res = await exec(cmd, {maxBuffer});
      dbg>1 && console.error(msg, '[2]res', res);
      let {stdout, stderr} = res;
      dbg>1 && console.error(msg, '[3]stdout', stdout);
      if (stderr) {
        console.error(msg, '[4]stderr', stderr);
      }
      return {stdout, stderr};
    } catch(e) { 
      console.error(msg, '[5]catch', e);
      throw e;
    }
  }

  async loadPatterns(opts={}) {
    const msg = `SqlDpd.loadPatterns()`;
    let { 
      dbg = this.dbg,
    } = opts;
    let sql = [
      'select pattern,count(*) count',
      'from dpd_headwords T1',
      'group by pattern',
      'order by count',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    let {stdout, stderr} = await this.bashSql(sql, opts);
    let json = JSON.parse(stdout);
    return json;
  }

  async loadHeadwords(opts={}) {
    const msg = `SqlDpd.loadHeadwords()`;
    const {
      dbg = this.dbg,
      rowLimit = this.rowLimit,
    } = opts;
    let sql = [
      'select id, pattern,meaning_1, meaning_2, meaning_lit',
      'from dpd_headwords T1',
      'where',
      `T1.pattern in ('${SCV_PATTERNS.join("','")}')`,
      `order by id`,
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    return await this.bashSql(sql, opts);
  }

  async buildIndexMap(headwordUsage) {
    const msg = `SqlDpd.buildIndexMap:`;
    let { 
      dbg,
      dataDir,
    } = this;
    let hwKeys = Object.keys(headwordUsage).sort((a,b)=>{
      return (headwordUsage[b] - headwordUsage[a]) || (a-b);
    });

    console.error(msg, '[1]hwKeys', hwKeys.length);
    if (dbg) {
      let keys = hwKeys.slice(0, verboseRows);
      let hws =  keys.reduce((a,k,i)=>{
        a += `${k}:${headwordUsage[k]} `;
        return a;
      }, '');
      console.error(msg, '[1.1]headwordUsage', hws);
    }
    let hwkJson = JSON.stringify(hwKeys, null, 1);
    let hwkPath = path.join(dataDir, 'headword-keys.mjs');
    await fs.promises.writeFile(hwkPath, hwkJson);
    console.error(msg, '[2]hwkPath', hwkJson.length);

  }

  async buildLookup(opts={}) { 
    const msg = `SqlDpd.buildLookup:`;
    console.log(msg, 'Pali', Pali);
    let {
      headwordUsage, // optional map of headword id's
      paliMap, // optional object map of allowed Pali words 
      rowLimit = this.rowLimit,
    } = opts;
    let {
      dbg,
      dataDir,
    } = this;
    let wAccept = 0; // DPD words used in paliMap
    let wReject = 0; // DPD words not used in paliMap
    let paliWords = paliMap && Object.keys(paliMap)
      .sort(Pali.compareRoman);
    let wPali = paliWords && paliWords.length || 0;
    let wUndefined = wPali; // paliMap words not defined in DPD
    let sql = [
      'select lookup_key word, headwords ',
      'from lookup T1',
      'where',
      "T1.headwords is not ''",
      'AND',
      "T1.grammar is not ''",
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    let {stdout, stderr} = await this.bashSql(sql);
    let json = JSON.parse(stdout);
    dbg>1 && console.error(msg, '[2]json', json);
    if (dbg) {
      let nWords = paliWords && paliWords.length || 'all';
      console.error(msg, '[3]paliWords', nWords);
    }
    let wordMap = json.reduce((a,row,i)=>{
      let { word, headwords } = row;
      try {
        word = word.replace('ṃ', 'ṁ');
      } catch(e) {
        console.error(msg, {row}, e);
        throw e;
      }
      if (!paliMap || paliMap[word]) {
        let hwrds = JSON.parse(headwords);
        a[word] = hwrds;
        if (headwordUsage) {
          for (let ihw=0; ihw<hwrds.length; ihw++) {
            let hw = hwrds[ihw];
            headwordUsage[hw] = (headwordUsage[hw]||0)+1;
          }
        }
        wAccept++;
        wUndefined--;
      } else {
        dbg>1 && console.error(msg, '[4]reject', word);
        wReject++;
      }
      return a;
    }, {});
    paliMap = paliWords.reduce((a,w)=>{
      a[w] = paliWords[w];
      return a;
    }, {});

    dbg && console.error(msg, '[5]paliMap', paliMap, 
      paliWords.slice(0, verboseRows));
    dbg && console.error(msg, '[6]', {wAccept, wReject});
    this.buildIndexMap(headwordUsage);

    let lookupJson = JSON.stringify(paliMap, null, 1);
    let lookupPath = path.join(dataDir, 'lookup.mjs');
    await fs.promises.writeFile(lookupPath, lookupJson);
    dbg && console.error(msg, '[7]lookupPath', lookupPath, 
      lookupJson.length);

    return {
      wordMap,
      wAccept,
      wReject,
      wPali,
      wUndefined,
    }
  }

}
