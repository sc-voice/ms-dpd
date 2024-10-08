const util = require('util');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const exec = util.promisify(require('child_process').exec);
import { DBG } from '../../src/defines.mjs';

let dbg = DBG.SQL_DPD;

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
    let {
      mode = 'json',
      rowLimit = 130,
    } = opts;

    Object.assign(this, {
      mode,
      rowLimit,
    });
  }

  async bashSql(sql, opts={}) {
    const msg = `SqlDpd.bashSql()`;
    let {
      mode = this.mode,
    } = opts;
    try {
      dbg && console.error(msg, '[1]sql', sql);
      let cmd = [
        'sqlite3 --batch local/dpd.db',
        mode ? `".mode ${mode}"` : '',
        `"${sql}"`,
      ].join(' ');
      dbg && console.error(msg, '[2]cmd', cmd);
      let res = await exec(cmd);
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
      rowLimit = this.rowLimit,
    } = opts;
    let sql = [
      'select id, pattern,meaning_1, meaning_2, meaning_lit',
      'from dpd_headwords T1',
      'where',
      `T1.pattern in ('${SCV_PATTERNS.join("','")}')`,
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    return await this.bashSql(sql, opts);
  }

  async loadLookup(mPliMs) { // TBD: coped from build-dpd
    const msg = `SqlDpd.loadLookup:`;
    let wAccept = 0;
    let wReject = 0;
    let sql = [
      'select lookup_key word, headwords ',
      'from lookup T1',
      'where',
      "T1.headwords is not ''",
      'AND',
      "T1.grammar is not ''",
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    let {stdout, stderr} = await sqlDpd.bashSql(sql);
    let json = JSON.parse(stdout);
    dbg>1 && console.error(msg, '[2]json', json);
    let wordMap = json.reduce((a,row,i)=>{
      let { word, headwords } = row;
      try {
        word = word.replace('ṃ', 'ṁ');
      } catch(e) {
        console.error(msg, {row}, e);
        throw e;
      }
      if (!mPliMs || mPliMs[word]) {
        a[word] = JSON.parse(headwords);
        wAccept++;
      } else {
        dbg>1 && console.error(msg, '[3]reject', word);
        wReject++;
      }
      return a;
    }, {});
    dbg && console.error(msg, '[4]wordMap', wordMap);
    dbg && console.error(msg, '[5]', {wAccept, wReject});

    return {
      wordMap,
      wAccept,
      wReject,
    }
  }

}
