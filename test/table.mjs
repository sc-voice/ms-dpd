import should from "should";
import Table from '../src/table.mjs';

const TEST_DATA = [
  ['color', 'size', 'date'],
  ['purple', 10, new Date(2000, 1, 1)],
  ['red', 5, new Date(2000, 2, 1)],
  ['blue',, new Date(2000, 3, 1)],
];

typeof describe === "function" && 
  describe("table", function () 
{
  it("default ctor", () => {
    let tbl = new Table();
    should.deepEqual(tbl.headers, []);
    should.deepEqual(tbl.rows, []);
    should.deepEqual(tbl.asColumns(), []);
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
    should.deepEqual(tbl.headers.map(h=>h.title), ['Color', 'Size']);
    should.deepEqual(tbl.headers.map(h=>h.id), ['color', 'size']);
    should.deepEqual(tbl.headers.map(h=>h.width), [5,4]);
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
    should.deepEqual(tbl2, tbl);
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

    should.deepEqual(tbl.headers.map(h=>h.title), ['Color', 'Size']);
    should.deepEqual(tbl.headers.map(h=>h.id), ['color', 'size']);
    should.deepEqual(tbl.headers.map(h=>h.width), [5,4]);
    let expected = [
      {color: 'purple', size:10},
      {color: 'red', size:5},
    ];
    should.deepEqual(tbl.rows[0], expected[0]);
    should.deepEqual(tbl.rows[1], expected[1]);
    should(tbl.rows.length).equal(3);
  });
  it("asColumns()", ()=>{
    let data = TEST_DATA;
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
    let tbl = Table.fromArray2(TEST_DATA, opts);
    let rowFilter = (row=>row.size);

    let tbl2 = tbl.filter(rowFilter);

    should(tbl2.title).equal(tbl.title);
    should(tbl2.caption).equal(tbl.caption);
    should.deepEqual(tbl2.rows, tbl.rows.filter(rowFilter));
  });
  it("sort()", ()=>{
    let tbl = Table.fromArray2(TEST_DATA);
    let compare = ((a,b) => {
      let cmp = a.color.localeCompare(b.color);
      return cmp;
    });
    let tbl2 = new Table(tbl);

    should(tbl2.sort(compare)).equal(tbl2);
    should.deepEqual(tbl2.rows[0], tbl.rows[2]);
  });
  it("toLocaleString()", ()=>{
    let tbl = Table.fromArray2(TEST_DATA);
    let compare = ((a,b) => {
      let cmp = a.color.localeCompare(b.color);
      return cmp;
    });
    let localeOpts = { dateStyle: "short", }
    let tblEN = tbl.toLocaleString('en', localeOpts);
    should(tblEN.split('\n')[0]).match(/Color *Size Date/i);
    should(tblEN.split('\n')[1]).match(/purple   10 2.1.00/);

    let tblFR = tbl.toLocaleString('fr', localeOpts);
    let frLines = tblFR.split('\n');
    should(frLines[0]).match(/Color  Size Date/i);
    should(frLines[1]).match(/purple   10 01.02.2000/);
  });
});
