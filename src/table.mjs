import { DBG } from './defines.mjs';

export default class Table {
  constructor(opts={}) {
    const msg = "Table.ctor";
    let {
      emptyRow = {},
      emptyCell = '\u233f',
      cellOverflow = '\u2026',
      caption,
      columnSeparator = ' ',
      lineSeparator = '\n',
      headers=[],
      title,
      rows=[],
      locales,
      localeOpts,
    } = opts;

    if (!(rows instanceof Array)) {
      throw new Error(`${msg} [1]rows:Array[Object]!`);
    }
    if (!(headers instanceof Array)) {
      let eText = `[1]headers:Array! ${JSON.stringify(headers)}`;
      throw new Error(`${msg} ${eText}`);
    }
    if (rows.length) {
      let row0 = rows[0];
      if (headers.length) {
        headers = JSON.parse(JSON.stringify(headers));
      } else {
        if(row0 instanceof Array) {
          throw new Error(`${msg} [2]rows:Array[Object]!`);
        }
        headers = Object.keys(row0).map(key=>({id:key}));
      }
    }

    headers.forEach(h=>{
      h.id = h.id || h.title || emptyCell;
      h.title = h.title || h.id.replace(/^./, h.id.at(0).toUpperCase());
      h.width = h.title.length;
      h.maxWidth = h.maxWidth || 0;
    });

    Object.assign(this, {
      emptyRow,
      emptyCell,
      cellOverflow,
      caption,
      columnSeparator,
      lineSeparator,
      headers,
      title,
      rows: [...rows],
      locales,
      localeOpts,
    });
  }

  // [{color:"red", size:10}, ...]
  static fromRows(rows, opts={}) {
    const msg = 'Table.fromRows()';
    return new Table(Object.assign({}, opts, {rows}));
  }

  // [
  //   ["color", "size}],
  //   ["red", 10]
  // ]
  static fromArray2(data, opts={}) {
    const msg = 'Table.fromArray2';
    let {
      headers = [],
      emptyRow = {},
    } = opts;
    if (!(data instanceof Array)) {
      throw new Error(`${msg} [1]data:Array?`);
    }
    let rows = data;
    if (rows.length) {
      let row0 = rows[0];
      if(!(row0 instanceof Array)) {
        throw new Error(`${msg} [2]data:Array[Array]?`);
      }
      if (headers.length===0) {
        headers = row0.map(c=>{
          if (typeof c !== 'string') {
            throw new Error(`${msg} [3]header? ${c}`);
          } 
          return { id:c }
        });
      }
    }

    // convert rows to Object
    rows = rows.slice(1).map(
      row=>row.reduce((a,c,i)=>{
        let hdr = headers[i];
        a[hdr.id] = c;
        return a;
      }, {})
    );

    let newOpts = Object.assign({}, opts, {headers});
    return Table.fromRows(rows, newOpts);
  }

  datumAsString(row, id, opts={}) {
    const msg = "Table.datumAsString()";
    let { 
      headers, emptyCell='', cellOverflow,
    } = this;
    let {
      locales = this.locales,
      localeOpts = this.localeOpts,
    } = opts;
    let val = row[id];
    if (val == null) {
      return emptyCell;
    }
    let hdr = headers.find(h=>h.id===id);
    let s = val.toLocaleString(locales, localeOpts);
    if (hdr) {
      if (hdr.maxWidth && hdr.width < s.length) {
        s = s.slice(0, hdr.maxWidth-1) + cellOverflow;
      }
    }
    return s;
  }

  #updateHeaders(opts) {
    const msg = "Table.#updateHeaders()";

    let { 
      headers, 
      rows,
    } = this;

    // calculate column width
    rows.forEach(row=>{
      for (let i=0; i<headers.length; i++) {
        let h = headers[i];
        let datum = this.datumAsString(row, h.id, opts);
        h.width = Math.max(h.width, datum.length);
      }
    });
  }

  asColumns(opts={}) {
    const msg = "Table.asColumns()";
    const dbg = 0;
    let {
      title = this.title,
      caption = this.caption,
      columnSeparator = this.columnSeparator,
      locales=this.locales,
      localeOpts=this.localeOpts,
      compact = true,
    } = opts;
    let { 
      headers, 
      rows,
    } = this;

    this.#updateHeaders();

    let lines = [];
    title && lines.push(title);
    if (headers.length) {
      let colTitles = headers.map(h=>{
        let datum = compact ? h.id.toUpperCase() : h.title;
        return datum.padEnd(h.width);
      });
      lines.push(colTitles.join(columnSeparator));
    }

    rows.forEach(row=>{
      let data = [];
      headers.forEach(h=>{
        let rawDatum = row[h.id];
        let datum = this.datumAsString(row, h.id, {locales, localeOpts});
        if (typeof rawDatum === 'number') {
          data.push(datum.padStart(h.width));
        } else {
          data.push(datum.padEnd(h.width));
        }
      });
      let line = data.join(columnSeparator);
      dbg && console.log(msg, row, line);
      lines.push(line);
    });

    caption && lines.push(caption);

    return lines;
  }

  filter(f=(row=>true), opts={}) {
    let { rows } = this;
    opts = Object.assign({}, this, opts);
    opts.rows = rows.filter(f);
    return new Table(opts);
  }

  sort(compare) {
    const msg = "Table.sort()";
    let out = this.rows.sort(compare);
    return this;
  }

  toLocaleString(locales, localeOpts) {
    let opts = {locales, localeOpts};
    let lines = this.asColumns(opts);
    let { lineSeparator } = this;
    return lines.join(lineSeparator);
  }

}
