import should from "should";
import {
  Pali,
  Dictionary,
  Inflection,
  Table,
} from '../main.mjs';

typeof describe === "function" && 
  describe("inflection", function () 
{
  it("default ctor", () => {
    let inf = new Inflection();
    should(inf.isEmpty).equal(true);
  });
  it("custom ctor", ()=>{
    let id = 'test-id';
    let type = 'test-type';
    let pat = 'test-pat';
    let gdr = 'test-gender';
    let $case = 'test-case' ;
    let singular = 'test-singular';
    let plural = 'test-plural';
    
    let inf = new Inflection({
      id, type, pat, gdr, 'case':$case, singular, plural
    });
    should(inf).properties({
      id, type, pat, gdr, 'case':$case, singular, plural
    });
    should(inf.isEmpty).equal(false);
  });
  it("compare()", ()=>{
    let pat = 'a nt';
    let gdr = 'nt';
    let type = 'dcl';
    let nbr = 'sg';
    let nom = 'nom';
    let infs = [
      new Inflection({ type, pat, gdr, nbr, 'case':nom }),
      new Inflection({ type, pat, gdr, nbr, 'case':'acc' }),
      new Inflection({ type, pat, gdr, nbr:'pl', 'case':nom }),
      new Inflection({type, pat, gdr, nbr, 'case':nom, 
        like:'citta' }),
      //["dcl","fem","sg","nom","ā","ā fem","vedanā",30],
      new Inflection({type, pat:'ā fem', gdr:'fem', nbr, 'case':nom, 
        like:'vedanā' }),
    ];
    should(Inflection.compare(infs[3],infs[4])).below(0);

    should(Inflection.compare(infs[0],infs[1])).below(0);
    should(Inflection.compare(infs[0],infs[2])).below(0);
    should(Inflection.compare(infs[1],infs[2])).below(0);
    should(Inflection.compare(infs[3],infs[4])).below(0);
  });
  it("union()", ()=>{
    let infa = new Inflection({
      id: 'a-id',
      type: 'a-type',
      pat: 'a-pat',
      gdr: 'a-gender',
      'case': 'a-case',
      nbr: 'sg',
    });
    let infb = new Inflection({
      id: 'b-id',
      type: 'b-type',
      pat: 'b-pat',
      gdr: 'b-gender',
      'case': 'b-case',
      nbr: 'pl',
    });

    // union identity
    let union_aa = Inflection.union(infa, infa);
    should.deepEqual(union_aa, infa);

    // union creates property arrays
    let union_ab = Inflection.union(infa, infb);
    should(union_ab).instanceOf(Inflection);
    should(union_ab).properties({
      id: ['a-id', 'b-id'],
      type: ['a-type', 'b-type'],
      pat: ['a-pat', 'b-pat'],
      gdr: ['a-gender', 'b-gender'],
      'case': ['a-case', 'b-case'],
      nbr: ['pl', 'sg'],
    });
    should.deepEqual(infa.union(infb), Inflection.union(infa, infb));

    // associativity: order doesn't matter
    let union_ba = Inflection.union(infb, infa);
    should.deepEqual(union_ba, union_ab);

    // instance union
    should.deepEqual(infb.union(infa), union_ba);

    // union of unions
    should.deepEqual(union_ab.union(union_ba), union_ab);
  });
  it("matchesWord() a/ā", ()=>{
    const msg = "test.inflection@94";
    const dbg = 0;
    let infs = [
      new Inflection({case:'voc', gdr:'masc', nbr:'sg', sfx: 'a' }),
      new Inflection({ case:'voc', gdr:'masc', nbr:'pl', sfx: 'ā' }),
      new Inflection({ case:'voc', gdr:'masc', nbr:'pl', sfx: 'ehi' }),
    ];

    should(infs[0].matchesWord("dhamma", {stem:'dhamm'})).equal(true);
    should(infs[0].matchesWord("dhamma", {stem:'dham'})).equal(false);

    should(infs[0].matchesWord("dhamma")).equal(true);
    should(infs[1].matchesWord("dhamma")).equal(false);
    should(infs[2].matchesWord("dhamma")).equal(false);
    should(infs[0].matchesWord("dhammā")).equal(false);
    should(infs[1].matchesWord("dhammā")).equal(true);
    should(infs[2].matchesWord("dhammā")).equal(false);
    should(infs[0].matchesWord("dhammehi")).equal(false);
    should(infs[1].matchesWord("dhammehi")).equal(false);
    should(infs[2].matchesWord("dhammehi")).equal(true);

    should(infs[0].matchesWord("dhamma",{nbr:'sg'})).equal(true);
    should(infs[0].matchesWord("dhamma",{nbr:'pl'})).equal(false);
    should(infs[1].matchesWord("dhammā",{nbr:'sg'})).equal(false);
    should(infs[1].matchesWord("dhammā",{nbr:'pl'})).equal(true);

    let dhamma = Inflection.TABLE
      .filter(inf=>inf.matchesWord('dhamma', {stem:"dhamm"}))
    dbg && console.log(msg, dhamma);
    should(Pali.compareRoman('a', 'ā')).below(0);
    dbg && console.log(dhamma.format({title:msg}));
    should(dhamma.rows.length).equal(3);
    should.deepEqual(dhamma.rows.map(row=>row.pat),[
      "a nt", "a masc", "ā fem" ]);
    should.deepEqual(dhamma.rows.map(row=>row.like),[
      "citta", "dhamma", "vedanā", ]);
  });
  it("matchesWord() dhammānaṁ ", ()=>{
    let type = 'dcl';
    let nt = 'nt';
    let sg = 'sg';
    let pl = 'pl';
    let instr = 'instr';
    let dat = 'dat';
    let voc = 'voc';
    let acc = 'acc';
    let anam = "ānaṁ";
    let infs = [
      new Inflection({type, gdr:nt, case:dat, nbr:pl, sfx:anam}),
      new Inflection({type, gdr:nt, case:voc, nbr:sg, sfx:anam}),
    ];
    let dhammanam = infs.filter(inf=>inf.matchesWord("dhammānaṁ"));
    should.deepEqual(dhammanam, infs);
  });
  it("matchesWord() i/ī devī", ()=>{
    let stem = 'dev';
    let type = 'dcl';
    let gdr = 'fem';
    let infs = [
      new Inflection({ type, gdr, case:"instr", nbr:'sg', sfx:"iyā"}),
      new Inflection({ type, gdr, case:"instr", nbr:'pl', sfx:"īhi"}),
      new Inflection({ type, gdr, case:"voc", nbr:'sg', sfx:'i'}),
      new Inflection({ type, gdr, case:"voc", nbr:'pl', sfx:'ī'}),
      new Inflection({ type, gdr, case:"voc", nbr:'pl', sfx:'iyo'}),
    ];
    let devi = infs.filter(inf=>inf.matchesWord("devī", {stem}));
    should.deepEqual(devi, [infs[3]]);
    let devihi = infs.filter(inf=>inf.matchesWord("devīhi", {stem}));
    should.deepEqual(devihi, [infs[1]]);
  });
  it("matchesWord() i/ī akkhi", ()=>{
    const msg =  'test.inflection@161';
    const dbg = 0;
    let stem = 'akkh';
    let type = 'dcl';
    let gdr = 'nt';
    let infs = [
      new Inflection({ type, gdr, case:"instr", nbr:'sg', sfx:"iyā"}),
      new Inflection({ type, gdr, case:"instr", nbr:'pl', sfx:"īhi"}),
      new Inflection({ type, gdr, case:"voc", nbr:'sg', sfx:'i'}),
      new Inflection({ type, gdr, case:"voc", nbr:'pl', sfx:'ī'}),
      new Inflection({ type, gdr, case:"voc", nbr:'pl', sfx:'iyo'}),
    ];
    let akkhi = infs.filter(inf=>inf.matchesWord("akkhī", {stem}));
    should.deepEqual(akkhi, [infs[3]]);
    let akkhihi = infs.filter(inf=>inf.matchesWord("akkhīhi", {stem}));
    should.deepEqual(akkhihi, [infs[1]]);
  });
  it("matchesWord() gdr", ()=>{
    const msg =  'test.inflection@191';
    const dbg = 0;
    let infs = [
      new Inflection({ gdr:'nt' }),
      new Inflection({ gdr:'masc' }),
      new Inflection({ gdr:'fem' }),
      new Inflection({ gdr:'*' }),
    ];
    should.deepEqual(
      infs.filter(inf=>inf.matchesWord("x", {})),
      infs,
    );
    should.deepEqual(
      infs.filter(inf=>inf.matchesWord("x", {gdr:'nt'})),
      [infs[0]],
    );
    should.deepEqual(
      infs.filter(inf=>inf.matchesWord("x", {gdr:'*'})),
      [infs[3]],
    );
  });
  it("select()", ()=>{
    const msg = "test.inflection@147";
    const dbg = 0;
    let infAll = Inflection.select();
    should(infAll.length).above(110).below(150);
  });
  it("select() dhamma", ()=>{
    const msg = "test.inflection@147";
    const dbg = 0;
    let infDhamma = Inflection.select(inf=>inf.matchesWord("dhamma"));
    let unionDhamma = Inflection.union(...infDhamma.rows);
    dbg && console.log(msg, unionDhamma);
    should(unionDhamma.case).equal('voc');
    should(unionDhamma.type).equal('dcl');
    should.deepEqual(unionDhamma.pat, ['a masc', 'a nt', 'ā fem']);
    should.deepEqual(unionDhamma.gdr, ['fem', 'masc', 'nt']);
    should.deepEqual(unionDhamma.nbr, 'sg');
    should.deepEqual(unionDhamma.sfx, 'a');
  });
  it("select() dhammānaṁd ", ()=>{
    const msg = "test.inflection@147";
    const dbg = 0;
    let stem = "dhamm";
    // ṃ
    let infDhammanam = Inflection.select(
      inf=>inf.matchesWord('dhammānaṁ', {stem}));
    should(infDhammanam.length).equal(6);
  });
  it("attribute() attribute", ()=>{
    let test = (idOrName,props) => {
      should(Inflection.attribute(idOrName)).properties(props);
    };
    test(null, {id:null, type:'attribute'});
    test('attribute', {id:'attr', type:'attribute'});
    test('gdr', {id:'gdr', type:'attribute'});
    test('number', {id:'nbr', type:'attribute'});
    test('case', {id:'case', type:'attribute'});
  });
  it("attribute() number", ()=>{
    let attr = Inflection.attribute;

    should(attr('number')).properties({id:'nbr', type:'attribute'});
    should(attr('sg')).properties({id:'sg', type:'number'});
    should(attr('singular')).properties({id:'sg', type:'number'});
    should(attr('pl')).properties({id:'pl', type:'number'});
    should(attr('plural')).properties({id:'pl', type:'number'});
  });
  it("attributeTable()", ()=>{
    let title = 'test-title';
    let tbl = Inflection.attributeTable({title});
    let fNumber = (row=>row.type === 'number');

    should(tbl.title).equal(title);

    let tblNumber = tbl.filter(fNumber);
    should.deepEqual(tblNumber.rows.map(r=>r.id), ['sg', 'pl']);
  });
  it("parseDpdInflection()", ()=>{
    const msg = "test.inflection@218";
    let dbg = 0;
    let dpdTmplt = 'a masc|dhamma|[[[""], ["masc sg"], [""], ["masc pl"], [""]], [["nom"], ["o"], ["masc nom sg"], ["ā", "āse"], ["masc nom pl"]], [["acc"], ["aṃ"], ["masc acc sg"], ["e"], ["masc acc pl"]], [["instr"], ["ā", "ena"], ["masc instr sg"], ["ebhi", "ehi"], ["masc instr pl"]], [["dat"], ["assa", "āya"], ["masc dat sg"], ["ānaṃ"], ["masc dat pl"]], [["abl"], ["ato", "amhā", "asmā", "ā"], ["masc abl sg"], ["ato", "ebhi", "ehi"], ["masc abl pl"]], [["gen"], ["assa"], ["masc gen sg"], ["āna", "ānaṃ"], ["masc gen pl"]], [["loc"], ["amhi", "asmiṃ", "e"], ["masc loc sg"], ["esu"], ["masc loc pl"]], [["voc"], ["a", "ā"], ["masc voc sg"], ["ā"], ["masc voc pl"]], [["in comps"], ["a"], ["in comps"], [""], [""]]]';

    let {
      pattern, like, comps, srcTable, inflections
    } = Inflection.parseDpdInflection(dpdTmplt);
    should(pattern).equal('a masc');
    should(like).equal('dhamma');

    dbg && console.log(msg, srcTable.format());
    let verbose = 1;
    let infTable = Table.fromRows(inflections);
    dbg && console.log(msg, inflections.length);
    let tblOpts;
    verbose && (tblOpts = {
      title: `-------${msg} tblOpts-------`,
      titleOfId: Inflection.titleOfId,
      cellValue: Inflection.cellValue,
    })
    dbg && console.log(infTable.format(tblOpts));
    should(infTable.length).equal(29);
    should(infTable.at(3,'sfx')).equal('aṁ');
  });
});
