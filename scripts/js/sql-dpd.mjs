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
  static async bashSql(sql, mode='json') {
    const msg = `SqlDpd.bashSql()`;
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

  static async loadPatterns() {
    const msg = `SqlDpd.loadPatterns()`;
    let sql = [
      'select pattern,count(*) count',
      'from dpd_headwords T1',
      'group by pattern',
      'order by count',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    let {stdout, stderr} = await SqlDpd.bashSql(sql);
    let json = JSON.parse(stdout);
    return json;
  }

  static async loadHeadwords(opts={}) {
    const msg = `SqlDpd.loadHeadwords()`;
    const {
      rowLimit = 130,
    } = opts;
    let sql = [
      'select id, pattern,meaning_1, meaning_2, meaning_lit',
      'from dpd_headwords T1',
      'where',
      `T1.pattern in ('${SCV_PATTERNS.join("','")}')`,
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    return await SqlDpd.bashSql(sql);
  }

}
