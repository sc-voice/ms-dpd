const util = require('util');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const exec = util.promisify(require('child_process').exec);

export default class SqlDpd {
  static async bashSql(sql, mode='json') {
    const msg = `SqlDpd.bashSql()`;
    let dbg = 0;
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
}
