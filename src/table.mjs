import { DBG } from './defines.mjs';

export default class Table {
  constructor(opts) {
    const msg = "Table.ctor";
    Object.assign(this, Table.options(opts));
    let {
      headers,
      rows,
    } = this;

    // headers are owned by table
    this.headers = headers = 
      headers ? JSON.parse(JSON.stringify(headers)) : [];

    // Each row is owned by client, but the 
    // collection is owned by table
    this.rows = rows = rows && [...rows] || [];

    if (headers.length === 0) {
      let row0 = rows[0];
      let rowType = typeof row0;
      switch (rowType) {
        case 'object':
          if (row0 instanceof Array) {
            headers = row0.map((c,i)=>({id:cellValue(c)}));
          } else {
            headers = Object.keys(row0).map((key,i)=>({id:key}));
          }
          break;
        case 'undefined': // empty table
          break;
        default:
          console.log(msg, rows);
          throw new Error(`${msg} [1]rowType ${rowType}`);
          break;
      }
    }
    headers.forEach((h,i)=>{
      h.id = h.id || h.title || emptyCell;
      h.maxWidth = h.maxWidth || 0;
      h.index = i;
    });

    Object.assign(this, { headers, rows });
  }

  static options(opts=[]) {
    const msg = "Table.options()";

    let {
      caption = undefined,
      cellOverflow = '\u2026',
      columnSeparator = ' ',
      cellValue = (s=>s),
      emptyCell = '\u233f',
      emptyRow = {},
      headers = undefined,
      lineSeparator = '\n',
      localeOptions = undefined,
      locales = undefined,
      rows = undefined,
      title = undefined,
      titleOfId = Table.titleOfId,
    } = opts;

    if (headers && !(headers instanceof Array)) {
      let eText = `[1]headers:Array! ${JSON.stringify(headers)}`;
      throw new Error(`${msg} ${eText}`);
    }
    if (rows && !(rows instanceof Array)) {
      throw new Error(`${msg} [1]rows:Array[Object]!`);
    }

    return {
      caption,
      cellOverflow,
      columnSeparator,
      cellValue,
      emptyCell,
      emptyRow,
      headers,
      lineSeparator,
      localeOptions,
      locales,
      rows,
      title,
      titleOfId,
    }
  }

  static findHeader(headers, idOrIndex) {
    switch (typeof idOrIndex) {
      case 'number':
        return headers[idOrIndex];
      case 'string':
        return headers.find(h=>h.id === idOrIndex);
      case 'object':
        return headers.find(h=>h.id === idOrIndex?.id);
      default: 
        return undefined;
    }
  }

  static titleOfId(id='') {
    return id && id.length
      ? id.replace(/^./, id.at(0).toUpperCase())
      : (id||'');
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
  static fromArray2(data, opts) {
    const msg = 'Table.fromArray2';
    let {
      headers = [],
      emptyRow,
    } = opts = Table.options(opts);
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

    opts.headers = headers;
    return Table.fromRows(rows, opts);
  }

  headerId(idOrIndex) {
    return typeof idOrIndex === 'string'
      ? idOrIndex 
      : this.headers[idOrIndex]?.id;
  }

  options(opts) {
    return Table.options(Object.assign({}, this, opts));
  }

  at(rowIndex, idOrIndex, opts={}) {
    let { 
      cellValue = this.cellValue,
    } = opts;
    let row = this.rows[rowIndex];

    if (idOrIndex === undefined) {
      return row;
    }

    let id = this.headerId(idOrIndex);

    let cell = row && row[id];

    return cellValue ? cellValue(cell, id) : cell;
  }

  stringAt(rowIndex, idOrIndex, opts={}) {
    const msg = "Table.stringAt()";
    const dbg = 0;
    let { headers } = this;
    let {
      emptyCell = this.emptyCell,
      locales = this.locales,
      localeOptions = this.localeOptions,
    } = opts;
    if (idOrIndex == null) {
      return undefined;
    }
    let cell = this.at(rowIndex, idOrIndex, opts);
    let text;
    if (cell == null) {
      text = emptyCell;
      dbg && console.log(msg, '[1]null', cell);
    } else if (cell.toLocaleString) {
      text = cell.toLocaleString(locales, localeOptions);
      dbg && console.log(msg, '[2]toLocaleString', cell, 
        {locales, localeOptions});
    } else if (cell instanceof Array) {
      text = cell.join(', ');
      dbg && console.log(msg, '[3]array', text);
    } else {
      dbg && console.log(msg, '[4]?', cell);
    }

    return text;
  }

  #updateHeaders(opts) {
    const msg = "Table.#updateHeaders()";

    let { 
      headers, 
      rows,
    } = this;
    let { 
      titleOfId = this.titleOfId,
      emptyCell = this.emptyCell,
    } = opts;

    for (let i=0; i<headers.length; i++) {
      let h = headers[i];
      let title = h.title || titleOfId(h.id) || emptyCell;
      h.width = title.length;
      h.index = i;
    }

    // calculate column width
    for (let iRow=0; iRow<rows.length; iRow++) {
      for (let i=0; i<headers.length; i++) {
        let h = headers[i];
        let datum = this.stringAt(iRow, h.id, opts);
        h.width = Math.max(h.width, datum.length);
      }
    }
  }

  asColumns(opts) {
    const msg = "Table.asColumns()";
    const dbg = 0;
    let {
      title,
      titleOfId,
      columnSeparator,
      cellValue,
      headers,
      rows,
      locales,
      localeOptions,
      caption,
    } = opts = this.options(opts);

    this.#updateHeaders(opts);

    let lines = [];
    title && lines.push(title);
    if (headers.length) {
      let colTitles = headers.map(h=>{
        let datum = h.title || titleOfId(h.id);
        return datum.padEnd(h.width);
      });
      lines.push(colTitles.join(columnSeparator));
    }

    for (let iRow=0; iRow<rows.length; iRow++) {
      let row = rows[iRow];
      let data = [];
      headers.forEach(h=>{
        let text = this.stringAt(iRow, h.id, {
          cellValue, 
          locales, 
          localeOptions,
        });
        if (typeof row[h.id] === 'number') {
          data.push(text.padStart(h.width));
        } else {
          data.push(text.padEnd(h.width));
        }
      });
      let line = data.join(columnSeparator);
      dbg && console.log(msg, row, line);
      lines.push(line);
    }

    caption && lines.push(caption);

    return lines;
  }

  filter(f=(row=>true), opts) {
    const msg = "Table.filter()";
    opts = this.options(opts);
    opts.rows = this.rows.filter(f);
    return new Table(opts);
  }

  colComparator(cols) {
    const msg = "Table.cellComparator()";
    const dbg = 1;
    let { headers, rows } = this;
    let keys = cols.map(c=>{
      switch (typeof c) {
        case 'string':
        case 'number':
          return {
            id: this.headerId(c),
            descending: false,
          }
        default:
          return c;
      }
    });
    return (a,b)=>{
      for (let i=0; i<keys.length; i++) {
        let { id, descending } = keys[i];
        let ak = a[id];
        let bk = b[id];
        if (ak !== bk) {
          let ascending = descending ? -1 : 1;
          if (ak && bk==null) { 
            return ascending; 
          } else if (ak==null && bk) { 
            return -ascending;
          } else {
            return ak < bk ? -ascending : ascending;
          }
        }
      }
      return 0;
    }
  }

  sort(compare) {
    const msg = "Table.sort()";
    let out = this.rows.sort(compare);
    return this;
  }

  format(opts) {
    opts = this.options(opts);
    let lines = this.asColumns(opts);

    return lines.join(opts.lineSeparator);
  }

  groupBy(grpCols, aggCols=null) {
    const msg = "Table.groupBy()";
    let { headers:srcHdrs, rows:srcRows } = this;
    let dstHdrs = JSON.parse(JSON.stringify(srcHdrs));
    let grpHdrs = grpCols.map(c=>{
      let hdr = Table.findHeader(dstHdrs, c);
      if (hdr == null) {
        throw new Error(`${msg} header? ${hdr}`);
      }
      hdr.aggregate = false;
      return hdr;
    });
    if (aggCols==null) {
      aggCols = dstHdrs.filter(h=>{
        if (h.aggregate === false) {
          return false;
        }

        h.aggregate = 'list';
        return true;
      });
    }
    let aggHdrs = aggCols.map((c,i)=>{
      let hdr = Table.findHeader(dstHdrs, c);
      if (hdr == null) {
        throw new Error(`${msg} header? ${hdr}`);
      }
      hdr.aggregate = hdr.aggregate || c?.aggregate || 'list';
      if (hdr.title == null) {
        hdr.title = (typeof hdr.aggregate === 'string')
          ? `${hdr.aggregate}(${hdr.id})`
          : `F${i}(${hdr.id})`;
      }
      return hdr;
    });
    dstHdrs = [...grpHdrs, ...aggHdrs];
    this.sort(this.colComparator(dstHdrs));
    let rows = [];

    let opts = this.options();
    //opts.rows = rows;
    opts.headers = dstHdrs;

    return new Table(opts);
  }

}
