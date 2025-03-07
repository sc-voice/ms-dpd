import fs from 'node:fs';
const fsp = fs.promises;
import child_process from 'node:child_process';
import path from 'node:path';
import * as url from 'node:url';
import util from 'node:util';
const exec = util.promisify(child_process.exec);
import { DBG } from '../../src/defines.mjs';
const msg = 'SqlDpd:';
import { default as HeadwordKey } from '../../src/headword-key.mjs';
import * as Pali from '../../src/pali.mjs';
const VERBOSE_ROWS = 3;
const DIRNAME = import.meta.dirname;

const DPD_HEADWORD_COLS = [
  'id',
  'pos',
  'pattern',
  'meaning_1',
  'meaning_2 meaning_raw',
  'meaning_lit',
  'construction',
  'stem',
  'lemma_1',
];
const DPD_HEADWORD_COLS_LANG = {
  ru: [
    'T1.id',
    'T1.ru_meaning meaning_1',
    'T1.ru_meaning_raw meaning_raw',
    'T1.ru_meaning_lit meaning_lit',
  ],
};

const HEADWORD_PATTERNS = [
  // DEPRECATED
  ...'aāiī'.split('').reduce((a, l) => {
    a.push(`${l} masc`);
    a.push(`${l} fem`);
    a.push(`${l} nt`);
    return a;
  }, []),
];

/* Load DPD SQL database and build compact representation
 * of information useful for Voice. The DPD has a massive amount
 * of information that is not immediately useful to Voice,
 * so the build process strips away such information and
 * stores it more efficiently for Voice:
 *
 * * Voice only deals with Mahāsaṅgīti text, so Pali words
 *   used elsewhere are ignored.
 * * Voice generates HTML, so there's no need for DPD HTML
 * * Voice does process Sinhala or Sansktrit
 */
export default class SqlDpd {
  static #privateCtor = false;
  constructor(opts = {}) {
    const msg = 'SqlDpd.ctor:';
    if (!SqlDpd.#privateCtor) {
      throw new Error('use SqlDpd.create()');
    }
    let {
      dataDir = path.join(`${DIRNAME}/../../local/dpd-test`),
      dbg = DBG.SQL_DPD,
      maxBuffer = 20 * 1024 * 1024,
      lang = 'en',
      mode = 'json',
      paliMap,
      rowLimit = 0,
      verboseRows = VERBOSE_ROWS,
      headwordPatterns, // DEPRECATED
    } = opts;
    dbg &&
      console.error(
        msg,
        '[1]paliMap filtering:',
        paliMap ? Object.keys(paliMap).length : 'none',
      );
    dataDir = path.resolve(dataDir);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    Object.assign(this, {
      dbg,
      lang,
      mode,
      rowLimit,
      dataDir,
      verboseRows,
      headwordPatterns, // DEPRECATED
    });

    // Non-enumerable properties
    Object.defineProperty(this, 'langHeadwords', {
      value: {},
    });
    Object.defineProperty(this, 'dpdHeadwords', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(this, 'dpdLookup', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(this, 'dictWords', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(this, 'paliMap', {
      value: paliMap,
    });
    Object.defineProperty(this, 'paliWords', {
      value: paliMap && Object.keys(paliMap).sort(Pali.compareRoman),
    });
    Object.defineProperty(this, 'headwordUsage', {
      value: {},
    });
    Object.defineProperty(this, 'hwIds', {
      writable: true,
      value: [],
    });
    Object.defineProperty(this, 'defPali', {
      writable: true,
      value: [],
    });
    Object.defineProperty(this, 'defLang', {
      writable: true,
      value: [],
    });
    Object.defineProperty(this, 'defLangDPD', {
      writable: true,
      value: {},
    });
    Object.defineProperty(this, 'defMap', {
      writable: true,
      value: undefined,
    });
    Object.defineProperty(this, 'langAbbr', {
      writable: true,
      value: {},
    });
    dbg && console.log(msg, '[2]this', JSON.stringify(this));
  }

  static binarySearch(arr, target) {
    const msg = 'SqlDpd.binarySearch';
    const dbg = DBG.BINARY_SEARCH;
    let left = 0;
    let right = arr.length - 1;
    let mid = -1;

    if (!target) {
      return -1;
    }

    let lastMatch = -1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      if (arr[mid].startsWith(target)) {
        lastMatch = mid;
      }

      if (arr[mid] === target) {
        dbg && console.log(msg, `[1]${target} =>`, mid);
        return mid; // Target found at index 'mid'
      } else if (target > arr[mid]) {
        left = mid + 1; // Search in the right half
        dbg && console.log(msg, `[2]${target} >`, arr[mid]);
      } else {
        right = mid - 1; // Search in the left half
        dbg && console.log(msg, `[3]${target} <`, arr[mid]);
      }
    }

    dbg && console.log(msg, `[4]${target} =>`, lastMatch);
    return lastMatch;
  }

  static async create(opts = {}) {
    const msg = 'SqlDpd.create:';
    let {
      dataDir = path.join(`${DIRNAME}/../../local/dpd-test`),
      dbg = DBG.SQL_DPD,
      maxBuffer = 20 * 1024 * 1024,
      lang = 'en',
      mode = 'json',
      paliMap,
      rowLimit = 0,
      verboseRows = VERBOSE_ROWS,
      headwordPatterns, // DEPRECATED
    } = opts;

    SqlDpd.#privateCtor = true;
    let sqlDpd = new SqlDpd({
      dataDir,
      dbg,
      maxBuffer,
      lang,
      mode,
      paliMap,
      rowLimit,
      verboseRows,
      headwordPatterns, // DEPRECATED
    });
    SqlDpd.#privateCtor = false;

    await sqlDpd.#loadLookup();
    await sqlDpd.#loadHeadwords();
    await sqlDpd.#loadHeadwordsLang('ru');
    await sqlDpd.#loadAbbreviations();

    return sqlDpd;
  }

  isPaliWord(word) {
    const msg = 'SqlDpd.isPaliWord';
    let { paliMap, paliWords } = this;

    if (paliMap == null) {
      return true;
    }
    if (paliMap[word]) {
      return true;
    }
    let iMatch = SqlDpd.binarySearch(paliWords, word);
    return iMatch !== -1;
  }

  async #loadLookup() {
    const msg = `SqlDpd.#loadLookup:`;
    let { dbg, rowLimit, paliMap, headwordUsage, verboseRows } = this;
    let wAccept = 0; // DPD words used in paliMap
    let wReject = 0; // DPD words not used in paliMap
    let sql = [
      'select lookup_key word, headwords ',
      'from lookup T1',
      'where',
      "T1.headwords is not ''",
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    let { stdout, stderr } = await this.bashSql(sql);
    let lookupJson = JSON.parse(stdout);
    dbg > 1 && console.error(msg, '[0.1]lookupJson', lookupJson);
    if (dbg) {
      let nWords = (paliMap && Object.keys(paliMap).length) || 'all';
      console.error(msg, '[0.2]paliMap', nWords);
    }
    // Filter out words not in paliMap

    let dpdLookup = lookupJson.reduce((a, row, i) => {
      let { word, headwords } = row;
      try {
        word = word.replaceAll('ṃ', 'ṁ');
      } catch (e) {
        console.error(msg, { row }, e);
        throw e;
      }
      if (this.isPaliWord(word)) {
        let hwrds = JSON.parse(headwords);
        a[word] = hwrds;
        for (let ihw = 0; ihw < hwrds.length; ihw++) {
          let hw = hwrds[ihw];
          headwordUsage[hw] = (headwordUsage[hw] || 0) + 1;
        }
        wAccept++;
      } else {
        dbg > 1 && console.error(msg, '[0.3]reject', word);
        wReject++;
      }
      return a;
    }, {});

    let dictWords = Object.keys(dpdLookup).sort(Pali.compareRoman);
    let lookupMap = dictWords.reduce((a, w) => {
      a[w] = `{h:${JSON.stringify(dpdLookup[w])}}`;
      return a;
    }, {});

    dbg &&
      console.error(
        msg,
        '[0.4]lookupMap.devi',
        lookupMap.devi,
        dictWords.slice(0, verboseRows),
      );
    dbg && console.error(msg, '[0.5]', { wAccept, wReject });

    this.dpdLookup = dpdLookup;
    this.dictWords = dictWords;
  }

  async build() {
    const msg = 'SqlDpd.build:';
    let dbg = DBG.SQL_DPD_BUILD || this.dbg;

    await this.#buildDefinitions();
    await this.#buildIndex();
    await this.#buildAbbreviations();
  }

  async bashSql(sql, opts = {}) {
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
      let res = await exec(cmd, { maxBuffer });
      dbg > 1 && console.error(msg, '[2]res', res);
      let { stdout, stderr } = res;
      dbg > 1 && console.error(msg, '[3]stdout', stdout);
      if (stderr) {
        console.error(msg, '[4]stderr', stderr);
      }
      return { stdout, stderr };
    } catch (e) {
      console.error(msg, '[5]catch', e);
      throw e;
    }
  }

  async #fetchHeadwords() {
    const msg = `SqlDpd.#fetchHeadwords()`;
    const { dbg, rowLimit, headwordPatterns } = this;
    let where = headwordPatterns
      ? `where T1.pattern in ('${headwordPatterns.join("','")}')`
      : '';
    let sql = [
      'select',
      DPD_HEADWORD_COLS.join(','),
      'from dpd_headwords T1',
      where,
      `order by id`,
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    let { stdout, stderr } = await this.bashSql(sql);
    dbg &&
      console.error(
        msg,
        '[2]stdout,stderr',
        stdout?.length,
        stderr?.length,
      );
    return { stdout, stderr };
  }

  async #fetchHeadwordsLang(lang) {
    const msg = `SqlDpd.#fetchHeadwordsRU()`;
    const { dbg, rowLimit } = this;
    let where = '';
    let cols = DPD_HEADWORD_COLS_LANG[lang];
    if (cols == null) {
      throw new Error(`${msg} lang?`);
    }
    let sql = [
      'select',
      cols.join(','),
      'from russian T1',
      where,
      `order by id`,
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    let { stdout, stderr } = await this.bashSql(sql);
    dbg &&
      console.error(
        msg,
        '[2]stdout,stderr',
        stdout?.length,
        stderr?.length,
      );
    return { stdout, stderr };
  }

  async #loadHeadwords() {
    const msg = 'SqlDpd.#loadHeadwords:';

    let headwords;
    let headwordMap;
    try {
      let { dbg, verboseRows, headwordUsage } = this;
      let { stdout, stderr } = await this.#fetchHeadwords();
      dbg && console.error(msg, '[0.1]stdout', stdout.length);
      headwords = JSON.parse(stdout);
      dbg && console.error(msg, '[1]headwords', headwords.length);
      headwordMap = headwords.reduce((a, hw, i) => {
        let {
          id,
          pattern,
          meaning_1,
          meaning_raw,
          meaning_lit,
          pos,
          source_1,
          construction,
          stem,
          lemma_1,
        } = hw;
        if (headwordUsage[id] > 0) {
          // Copmact construction by removing extra spaces (~3%)
          construction = construction.split(/ ?\+ ?/).join('+');
          a[id] = {
            id,
            pattern,
            meaning_1,
            meaning_raw,
            meaning_lit,
            pos,
            source_1,
            construction,
            stem,
            lemma_1,
          };
        }
        return a;
      }, {});
      if (dbg && verboseRows) {
        for (let i = 0; i < verboseRows; i++) {
          let hwi = JSON.stringify(
            headwords[i],
            (k, v) => v || undefined,
          );
          console.error(' ', hwi);
        }
        console.error('  ...');
      }
    } catch (e) {
      console.error(msg, e);
      throw e;
    }
    this.dpdHeadwords = headwordMap;
    return headwordMap;
  }

  async #loadHeadwordsLang(lang) {
    const msg = 'SqlDpd.#loadHeadwordsRU:';

    let headwords;
    let headwordMap;
    try {
      let { dbg, verboseRows, headwordUsage } = this;
      let { stdout, stderr } = await this.#fetchHeadwordsLang(lang);
      dbg && console.error(msg, '[0.1]stdout', stdout.length);
      headwords = JSON.parse(stdout);
      dbg && console.error(msg, '[1]headwords', headwords.length);
      headwordMap = headwords.reduce((a, hw, i) => {
        let { id, pattern, meaning_1, meaning_raw, meaning_lit } = hw;
        if (headwordUsage[id] > 0) {
          a[id] = {
            id,
            meaning_1,
            meaning_raw,
            meaning_lit,
          };
        }
        return a;
      }, {});
      if (dbg && verboseRows) {
        for (let i = 0; i < verboseRows; i++) {
          let hwi = JSON.stringify(
            headwords[i],
            (k, v) => v || undefined,
          );
          console.error(' ', hwi);
        }
        console.error('  ...');
      }
    } catch (e) {
      console.error(msg, e);
      throw e;
    }
    this.langHeadwords[lang] = headwordMap;
    return headwordMap;
  }

  async loadPatterns(opts = {}) {
    const msg = `SqlDpd.loadPatterns()`;
    let { dbg = this.dbg } = opts;
    let sql = [
      'select pattern,count(*) count',
      'from dpd_headwords T1',
      'group by pattern',
      'order by count',
    ].join(' ');
    dbg && console.error(msg, '[1]sql', sql);
    let { stdout, stderr } = await this.bashSql(sql, opts);
    let json = JSON.parse(stdout);
    return json;
  }

  async writeMap(fpath, decl, map) {
    const msg = 'SqlDpd.writeMap';
    let dbg = DBG.SQL_DPD_BUILD || this.dbg;
    let { hwIds } = this;
    let iLast = hwIds.length - 1;
    let aOut = [
      decl + '{',
      ...hwIds.map((id, i) => {
        let key = HeadwordKey.fromNumber(id);
        let v = JSON.stringify(map[key]);
        v = v.replaceAll('ṃ', 'ṁ');
        let sep = i < iLast ? ',' : '';
        return ` "${key}": ${v}${sep}`;
      }),
      '}\n',
    ];
    let dirName = path.dirname(fpath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    await fs.promises.writeFile(fpath, aOut.join('\n'));
    dbg && console.error(msg, `[1]${fpath}`, aOut.length);
  }

  async #buildDefinitions() {
    const msg = `SqlDpd.#buildDefinitions:`;
    let dbg = DBG.BUILD_DEFINITIONS || DBG.SQL_DPD_BUILD || this.dbg;
    let {
      dataDir,
      dpdHeadwords,
      langHeadwords,
      verboseRows,
      headwordUsage,
    } = this;
    let hwIds = Object.keys(headwordUsage).sort(
      (a, b) => Number(a) - Number(b),
    );
    this.hwIds = hwIds;

    /* Pali Definitions (defPali)
     * Write out common Pali definitions, which greatly
     * decreases defLang size
     */
    let defPali = hwIds.reduce((a, n) => {
      let key = HeadwordKey.fromNumber(n);
      let { pattern, pos, construction, stem, lemma_1 } =
        dpdHeadwords[n];
      a[key] = [pattern, pos, construction, stem, lemma_1].join('|');
      return a;
    }, {});
    let fnPali = 'definition-pali.mjs';
    let defPaliPath = path.join(dataDir, fnPali);
    await this.writeMap(
      defPaliPath,
      'export const DEF_PALI=',
      defPali,
    );
    this.defPali = defPali;

    /* Write out definition lines for English, which is the
     * template used for all MS-DPD translations.
     */
    let defLang = hwIds.reduce((a, n) => {
      let key = HeadwordKey.fromNumber(n);
      let { meaning_1, meaning_raw, meaning_lit } = dpdHeadwords[n];
      a[key] = [
        meaning_1,
        meaning_1 ? '' : meaning_raw,
        meaning_lit,
      ].join('|');
      return a;
    }, {});
    let fnLang = `definition-en.mjs`;
    let langDir = path.join(dataDir, 'en');
    let defLangPath = path.join(langDir, fnLang);
    await this.writeMap(
      defLangPath,
      'export const DEF_LANG=',
      defLang,
    );
    this.defLang = defLang;

    // Write out definition lines for RU
    const DPD_LANGS = ['ru'];
    for (let i = 0; i < DPD_LANGS.length; i++) {
      let lang = DPD_LANGS[i];
      let dpdLangHeadwords = langHeadwords[lang];
      let defLang = hwIds.reduce((a, n) => {
        let key = HeadwordKey.fromNumber(n);
        let headword = dpdLangHeadwords[n] || dpdHeadwords[n];
        let { meaning_1, meaning_raw, meaning_lit } = headword;
        a[key] = [
          meaning_1,
          meaning_1 ? '' : meaning_raw,
          meaning_lit,
        ].join('|');
        return a;
      }, {});
      let fnLang = `definition-${lang}.mjs`;
      let langDir = path.join(dataDir, lang);
      let defLangPath = path.join(langDir, fnLang);
      await this.writeMap(
        defLangPath,
        'export const DEF_LANG=',
        defLang,
      );
      this.defLangDPD[lang] = defLang;
    }
  }

  async #buildIndex() {
    const msg = `SqlDpd.#buildIndex:`;
    let { dataDir, dictWords, dpdLookup, verboseRows } = this;
    let dbg = DBG.SQL_DPD_BUILD || this.dbg;
    dbg && console.log(msg, '[1]');
    let defMap = dictWords.reduce((a, w, i) => {
      let v = dpdLookup[w].map((id) => {
        let key = HeadwordKey.fromNumber(id);
        return key;
      });
      if (dbg && i <= verboseRows) {
        console.error(msg, { w, v });
      }
      a[w] = v.join(',');
      return a;
    }, {});

    let indexOut = [
      'export const INDEX=',
      JSON.stringify(defMap, null, 1),
    ].join('\n');
    let indexPath = path.join(dataDir, 'index.mjs');
    await fsp.writeFile(indexPath, indexOut);
    dbg && console.error(msg, '[1]', indexPath, indexOut.length);

    this.defMap = defMap;
  }

  async #loadAbbreviations() {
    const msg = `SqlDpd.#loadAbbreviations:`;
    //const RE_RU = /.*[бвгджзклмнпрстфхцчшщёиыэюяйъь].*/;
    let { dbg, rowLimit, paliMap, headwordUsage, verboseRows } = this;
    let sql = [
      'select lookup_key, abbrev ',
      'from lookup',
      'where',
      'lookup_key in (select distinct pos from dpd_headwords)',
      'order by lookup_key',
      rowLimit ? `limit ${rowLimit}` : '',
    ].join(' ');
    let { stdout, stderr } = await this.bashSql(sql);
    let rows = JSON.parse(stdout);
    let enAbbr = rows.reduce((a, row) => {
      let { lookup_key, abbrev } = row;
      let json = (abbrev && JSON.parse(abbrev)) || {};
      a[lookup_key] = {
        abbreviation: lookup_key,
        meaning: json.meaning,
        explanation: json.explanation,
      };
      return a;
    }, {});
    this.langAbbr.en = enAbbr;
    let ruAbbr = rows.reduce((a, row) => {
      let { lookup_key, abbrev } = row;
      let json = (abbrev && JSON.parse(abbrev)) || {};
      a[lookup_key] = {
        abbreviation: json.ru_abbrev,
        meaning: json.ru_meaning,
      };
      return a;
    }, {});
    dbg && console.error(msg, '[1]rows', rows.length);
    dbg > 1 && console.error(msg, '[1.1]ruAbbr', ruAbbr);
    this.langAbbr.ru = ruAbbr;
  }

  async #buildAbbreviations() {
    const msg = 'SqlDpd.#buildAbbreviations';
    let { langAbbr, dataDir } = this;
    let dbg = DBG.BUILD_ABBREVIATIONS || this.dbg;
    let langs = Object.keys(langAbbr);
    for (let i = 0; i < langs.length; i++) {
      let lang = langs[i];
      let fname = `abbreviation-${lang}.mjs`;
      let fpath = path.join(dataDir, lang, fname);
      let json = JSON.stringify(langAbbr[lang], null, 2);
      let mjs = ['export const ABBREVIATIONS =', json].join(' ');
      await fsp.writeFile(fpath, mjs);
      dbg && console.error(msg, `[1]${fpath}`, json.length);
    }
  }
}
