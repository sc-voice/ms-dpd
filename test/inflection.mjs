import should from "should";
import {
  Pali,
  Dictionary,
  Inflection,
} from '../main.mjs';

typeof describe === "function" && 
  describe("TESTTESTinflection", function () 
{
  it("default ctor", () => {
    let inf = new Inflection();
    should(inf).properties({
      id: null,
      type: null,
      group: null,
      gender: null,
      infCase: null,
      singular: null,
      plural: null,
    });
  });
  it("custom ctor", ()=>{
    let id = 'test-id';
    let type = 'test-type';
    let group = 'test-group';
    let gender = 'test-gender';
    let infCase = 'test-infCase' ;
    let singular = 'test-singular';
    let plural = 'test-plural';
    
    let inf = new Inflection({
      id, type, group, gender, infCase, singular, plural
    });
    should(inf).properties({
      id, type, group, gender, infCase, singular, plural
    });
  });
  it("union()", ()=>{
    let infa = new Inflection({
      id: 'a-id',
      type: 'a-type',
      group: 'a-group',
      gender: 'a-gender',
      infCase: 'a-infCase',
      singular: 'a-singular',
      plural: 'a-plural',
    });
    let infb = new Inflection({
      id: 'b-id',
      type: 'b-type',
      group: 'b-group',
      gender: 'b-gender',
      infCase: 'b-infCase',
      singular: 'b-singular',
      plural: 'b-plural',
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
      group: ['a-group', 'b-group'],
      gender: ['a-gender', 'b-gender'],
      infCase: ['a-infCase', 'b-infCase'],
      singular: ['a-singular', 'b-singular'],
      plural: ['a-plural', 'b-plural'],
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
  it("matchesWord()", ()=>{
    // lenient default {singular:true, plural:true}
    let infS = new Inflection({singular: 'a'});
    should(infS.matchesWord("dhamma")).equal(true);
    should(infS.matchesWord("dhamme")).equal(false);

    let infP = new Inflection({plural: ['ā', 'ehi']});
    should(infP.matchesWord("dhamma")).equal(false);
    should(infP.matchesWord("dhammā")).equal(true);
    should(infP.matchesWord("dhammehi")).equal(true);

    // strict options
    let infSP = new Inflection({singular: 'a', plural: 'e'});
    should(infSP.matchesWord("dhamma", {singular:true})).equal(true);
    should(infSP.matchesWord("dhamma", {plural:true})).equal(false);

    should(infSP.matchesWord("dhamme", {singular:true})).equal(false);
    should(infSP.matchesWord("dhamme", {plural:true})).equal(true);

    should(infSP.matchesWord("dhammā", {singular:true})).equal(false);
    should(infSP.matchesWord("dhammā", {plural:true})).equal(false);
  });
  it("find() ", ()=>{
    const msg = "test.inflection@114";
    let infAll = Inflection.find();
    should(infAll.length).above(65).below(100);

    let infDhamma = Inflection.find(inf=>inf.matchesWord("dhamma"));
    let unionDhamma = Inflection.union(infDhamma);
    //console.log(msg, unionDhamma);
    should(unionDhamma.infCase).equal('voc');
    should(unionDhamma.type).equal('declension');
    should(unionDhamma.group).equal('-a/ā');
    should.deepEqual(unionDhamma.gender, ['masc', 'nt']);
    should(unionDhamma.singular).equal('a');
    should.deepEqual(unionDhamma.plural, ['ā', 'āni']);
  });

});
