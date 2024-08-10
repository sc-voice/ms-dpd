import should from "should";
import Table from '../src/table.mjs';

const TEST_ARRAY = [
  ['color', 'size', 'date'],
  ['purple', 10, new Date(2000, 1, 1)],
  ['red', 5, new Date(2000, 2, 1)],
  ['blue',, new Date(2000, 3, 1)],
];

const TEST_OBJS = [
  {color:'purple', size:10, date: new Date(2000, 1, 1), nums:[1,3]},
  {color:'red', size:5, date: new Date(2000, 2, 1)},
  {color:'blue', date:new Date(2000, 3, 1)},
];

const TEST_GROUP = [
  ['color',  'city', 'size',   'qty'],
  ['purple', 'sf',   'small',  1],
  ['purple', 'ny',   null,     2],
  ['purple', null,   'large',  1],
  ['purple', 'ny',   'large',  null],
  ['purple', 'sf',   'large',  1],
  ['gold',   'ny',   'small',  4],
  ['gold',   'sf',   'large',  5],
  ['gold',   'ny',   'medium', 6],
];

typeof describe === "function" && 
  describe("table", function () 
{
  it("default ctor", () => {
    let tbl = new Table();
    should.deepEqual(tbl.headers, []);
    should.deepEqual(tbl.rows, []);
    should.deepEqual(tbl.asColumns(), []);
    should(tbl.titleOfId).equal(Table.titleOfId);
    should(tbl).properties({
      type: 'Table',
      version: '1.0.0',
      columnSeparator: ' ',
      lineSeparator: '\n',
      cellOverflow: '\u2026',
      emptyCell: '\u233f',
    });
  });
  it("fromRows()", ()=>{
    let rows = [
      {color: 'purple', size:10},
      {color: 'red', size:5},
    ];
    let title = 'test-title';
    let caption = 'test-caption';
    let opts = {title, caption};

    let tbl = Table.fromRows(rows, opts);

    should(tbl.title).equal(title);
    should(tbl.caption).equal(caption);
    should.deepEqual(tbl.headers.map(h=>h.id), ['color', 'size']);
    should(tbl.rows.length).equal(2);
    should.deepEqual(tbl.rows, rows);
    should(tbl.rows).not.equal(rows);

    let tbl2 = Table.fromRows(rows,
      {title, caption, headers:tbl.headers});
    should(tbl2.headers).not.equal(tbl.headers);
    should.deepEqual(tbl2, tbl);
  });
  it("serialize", ()=>{
    let rows = [
      {color: 'purple', size:10},
      {color: 'red', size:5},
    ];
    let title = 'test-title';
    let caption = 'test-caption';
    let opts = {title, caption};

    let tbl = Table.fromRows(rows, opts);
    let json = JSON.stringify(tbl);
    let tbl2 = new Table(JSON.parse(json));
    should.deepEqual(tbl2.options(), tbl.options());
  });
  it("fromArray2()", ()=>{
    let data = [
      ['color', 'size'],
      ['purple', 10],
      ['red', 5],
      ['blue',],
    ];
    let title = 'test-title';
    let caption = 'test-caption';
    let opts = {title, caption};

    let tbl = Table.fromArray2(data, opts);

    should.deepEqual(tbl.headers.map(h=>h.id), ['color', 'size']);
    let expected = [
      {color: 'purple', size:10},
      {color: 'red', size:5},
    ];
    should.deepEqual(tbl.rows[0], expected[0]);
    should.deepEqual(tbl.rows[1], expected[1]);
    should(tbl.rows.length).equal(3);
  });
  it("asColumns()", ()=>{
    let data = TEST_ARRAY;
    let title = 'test-title';
    let caption = 'test-caption';
    let opts = {title, caption};

    let tbl = Table.fromArray2(data, opts);
    let lines = tbl.asColumns();
    //console.log(lines.join('\n'));
    should(lines[0]).equal(title);
    should(lines[1]).match(/Color *Size/i);
    should(lines[2]).match(/purple *10/);
    should(lines[3]).match(/red *5/);
    should(lines[4]).match(/blue *⌿/);
    should(lines.at(-1)).equal(caption);
  });
  it("filter()", ()=>{
    let title = 'test-title';
    let caption = 'test-caption';
    let opts = {title, caption};
    let tbl = Table.fromArray2(TEST_ARRAY, opts);
    let rowFilter = (row=>row.size);

    let tbl2 = tbl.filter(rowFilter);

    should(tbl2.title).equal(tbl.title);
    should(tbl2.caption).equal(tbl.caption);
    should.deepEqual(tbl2.rows, tbl.rows.filter(rowFilter));
  });
  it("sort()", ()=>{
    let tbl = Table.fromArray2(TEST_ARRAY);
    let compare = ((a,b) => {
      let cmp = a.color.localeCompare(b.color);
      return cmp;
    });
    let tbl2 = new Table(tbl);

    should(tbl2.sort(compare)).equal(tbl2);
    should.deepEqual(tbl2.rows[0], tbl.rows[2]);
  });
  it("format()", ()=>{
    let tbl = Table.fromArray2(TEST_ARRAY);
    let compare = ((a,b) => {
      let cmp = a.color.localeCompare(b.color);
      return cmp;
    });
    let localeOptions = { dateStyle: "short", }
    let cellValue = ((s, id)=>id==='color' ? `${s}-${id}` : s);
    let tblEN = tbl.format({
      cellValue,
      locales:'en', 
      localeOptions,
    });
    should(tblEN.split('\n')[0]).match(/Color +Size +Date/i);
    should(tblEN.split('\n')[1]).match(/purple-color +10 +2.1.00/);

    let tblFR = tbl.format({locales:'fr', localeOptions});
    let frLines = tblFR.split('\n');
    should(frLines[0]).match(/Color  Size Date/i);
    should(frLines[1]).match(/purple   10 01.02.2000/);
  });
  it("titleOfId", ()=>{
    should(Table.titleOfId("happy cow")).equal("Happy cow");
  });
  it("at", ()=>{
    let tbl = Table.fromRows(TEST_OBJS);

    // one argument
    should.deepEqual(tbl.at(-1), undefined);
    should.deepEqual(tbl.at(0), TEST_OBJS[0]);
    should.deepEqual(tbl.at(1), TEST_OBJS[1]);
    should.deepEqual(tbl.at(2), TEST_OBJS[2]);
    should.deepEqual(tbl.at(3), undefined);

    // two arguments
    should.deepEqual(tbl.at(-1,0), undefined);
    should.deepEqual(tbl.at(0,0), 'purple');
    should.deepEqual(tbl.at(0,3), [1,3]);
    should.deepEqual(tbl.at(1,1), 5);
    should.deepEqual(tbl.at(2,2), TEST_OBJS[2].date);
    should.deepEqual(tbl.at(2,'size'), undefined);
    should.deepEqual(tbl.at(3,4), undefined);
  });
  it("stringAt", ()=>{
    let tbl = Table.fromRows(TEST_OBJS);
    let locales = 'en';
    let cellValue = ((value,id) => 
      value==='purple' ? `p-${id}` : value);
    let opts = {
      cellValue,
      locales: 'en',
      localeOptions: {
        dateStyle:'short'
      },
    }

    should(tbl.stringAt(-1)).equal(undefined);
    should(tbl.stringAt(0,0)).equal('purple');
    should(tbl.stringAt(0,0,opts)).equal('p-color');
    should(tbl.stringAt(0,1)).equal('10');
    should(tbl.stringAt(0, 2, opts)).equal('2/1/00');
    should(tbl.stringAt(2, 1, opts)).equal(tbl.emptyCell);
  });
  it("findHeader", ()=>{
    const msg = "test.table@findHeader";
    let tbl = Table.fromArray2(TEST_GROUP, {title:'---findHeader---'});
    let { headers:hdrs } = tbl;
    should(Table.findHeader(hdrs, -1)).equal(undefined);
    should(Table.findHeader(hdrs, 'asdf')).equal(undefined);
    should(Table.findHeader(hdrs, 0)).equal(tbl.headers[0]);
    should(Table.findHeader(hdrs, 'color')).equal(tbl.headers[0]);
    should(Table.findHeader(hdrs, {id:'color'})).equal(tbl.headers[0]);
    should(Table.findHeader(hdrs, 1)).equal(tbl.headers[1]);
    should(Table.findHeader(hdrs, 'city')).equal(tbl.headers[1]);
    should(Table.findHeader(hdrs, {id:'city'})).equal(tbl.headers[1]);
  });
  it("groupBy() count", ()=>{
    const msg = "test.table.count";
    const dbg = 0;
    let tbl = Table.fromArray2(TEST_GROUP, {title:'---groupBy---'});
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        {id:'size', aggregate:'count'},
        { id:'size', 
          aggregate:(a,v,i)=>(v==null ? (a||0) : (a||0)+1),
        },
      ]
    );

    dbg && console.log(tbl.format());
    dbg && console.log(aggTbl.format());
    should(aggTbl.at(0,0)).equal('gold');
    should(aggTbl.at(0,1)).equal('ny');
    should(aggTbl.at(0,2)).equal(2);
    should(aggTbl.at(0,3)).equal(2);
    should(aggTbl.at(1,0)).equal('gold');
    should(aggTbl.at(1,1)).equal('sf');
    should(aggTbl.at(1,2)).equal(1);
    should(aggTbl.at(1,3)).equal(1);
    should(aggTbl.at(2,0)).equal('purple');
    should(aggTbl.at(2,1)).equal(null);
    should(aggTbl.at(2,2)).equal(1); // null does not count
    should(aggTbl.at(2,3)).equal(1); // null does not count
    should(aggTbl.at(3,0)).equal('purple');
    should(aggTbl.at(3,1)).equal('ny');
    should(aggTbl.at(3,2)).equal(1);
    should(aggTbl.at(3,3)).equal(1);
    should(aggTbl.at(4,0)).equal('purple');
    should(aggTbl.at(4,1)).equal('sf');
    should(aggTbl.at(4,2)).equal(2);
    should(aggTbl.at(4,3)).equal(2);
  });
  it("groupBy() min, max", ()=>{
    const msg = "test.table.min/max";
    const dbg = 0;
    let tbl = Table.fromArray2(TEST_GROUP, {title:'---groupBy---'});
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        {id:'qty', aggregate:'min'},
        {id:'qty', aggregate:'max'},
      ]
    );

    dbg && console.log(tbl.format());
    dbg && console.log(aggTbl.format());
    should(aggTbl.at(0,0)).equal('gold');
    should(aggTbl.at(0,1)).equal('ny');
    should(aggTbl.at(0,2)).equal(4);
    should(aggTbl.at(0,3)).equal(6);
    should(aggTbl.at(1,0)).equal('gold');
    should(aggTbl.at(1,1)).equal('sf');
    should(aggTbl.at(1,2)).equal(5);
    should(aggTbl.at(1,3)).equal(5);
    should(aggTbl.at(2,0)).equal('purple');
    should(aggTbl.at(2,1)).equal(null);
    should(aggTbl.at(2,2)).equal(1); // null does not count
    should(aggTbl.at(2,3)).equal(1); // null does not count
    should(aggTbl.at(3,0)).equal('purple');
    should(aggTbl.at(3,1)).equal('ny');
    should(aggTbl.at(3,2)).equal(2);
    should(aggTbl.at(3,3)).equal(2);
    should(aggTbl.at(4,0)).equal('purple');
    should(aggTbl.at(4,1)).equal('sf');
    should(aggTbl.at(4,2)).equal(1);
    should(aggTbl.at(4,3)).equal(1);
  });
  it("groupBy() distinct/like", ()=>{
    const msg = "test.table.distinct";
    let dbg = 0;
    let tbl = Table.fromArray2(TEST_GROUP, {title:'---groupBy---'});
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [ {id:'size', aggregate:'list'},      // synonym
        {id:'size', aggregate:'distinct'},  // synonym
      ],
    );
    dbg && console.log(tbl.format());
    dbg && console.log(aggTbl.format());
    should(aggTbl.at(0,0)).equal('gold');
    should(aggTbl.at(0,1)).equal('ny');
    should.deepEqual(aggTbl.at(0,2), ['small', 'medium']);
    should.deepEqual(aggTbl.at(0,3), aggTbl.at(0,2));
    should(aggTbl.at(1,0)).equal('gold');
    should(aggTbl.at(1,1)).equal('sf');
    should.deepEqual(aggTbl.at(1,2), ['large']);
    should.deepEqual(aggTbl.at(1,3), aggTbl.at(1,2));
    should(aggTbl.at(2,0)).equal('purple');
    should(aggTbl.at(2,1)).equal(null);
    should.deepEqual(aggTbl.at(2,2), ['large']);
    should.deepEqual(aggTbl.at(2,3), aggTbl.at(2,2));
    should(aggTbl.at(3,0)).equal('purple');
    should(aggTbl.at(3,1)).equal('ny');
    should.deepEqual(aggTbl.at(3,2), ['large']);
    should.deepEqual(aggTbl.at(3,3), aggTbl.at(3,2));
    should(aggTbl.at(4,0)).equal('purple');
    should(aggTbl.at(4,1)).equal('sf');
    should.deepEqual(aggTbl.at(4,2), ['small','large']);
    should.deepEqual(aggTbl.at(4,3), aggTbl.at(4,2));
  });
  it("groupBy() sum,avg", ()=>{
    const msg = "test.table.sum/avg";
    const dbg = 0;
    let tbl = Table.fromArray2(TEST_GROUP, {title:'---groupBy---'});
    let aggTbl = tbl.groupBy(
      ['color', 'city'],
      [
        {id:'qty', aggregate:'sum'},
        {id:'qty', aggregate:'avg'},
      ]
    );

    dbg && console.log(tbl.format());
    dbg && nsole.log(aggTbl.format());
    should(aggTbl.at(0,0)).equal('gold');
    should(aggTbl.at(0,1)).equal('ny');
    should(aggTbl.at(0,2)).equal(10);
    should(aggTbl.at(0,3)).equal(5);
    should(aggTbl.at(1,0)).equal('gold');
    should(aggTbl.at(1,1)).equal('sf');
    should(aggTbl.at(1,2)).equal(5);
    should(aggTbl.at(1,3)).equal(5);
    should(aggTbl.at(2,0)).equal('purple');
    should(aggTbl.at(2,1)).equal(null);
    should(aggTbl.at(2,2)).equal(1); // null does not count
    should(aggTbl.at(2,3)).equal(1); // null does not count
    should(aggTbl.at(3,0)).equal('purple');
    should(aggTbl.at(3,1)).equal('ny');
    should(aggTbl.at(3,2)).equal(2);
    should(aggTbl.at(3,3)).equal(2);
    should(aggTbl.at(4,0)).equal('purple');
    should(aggTbl.at(4,1)).equal('sf');
    should(aggTbl.at(4,2)).equal(2);
    should(aggTbl.at(4,3)).equal(1);
  });
});
