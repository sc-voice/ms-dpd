
import { 
  Sankey 
} from "../main.mjs";
import should from "should";

typeof describe === "function" && 
  describe("sankey", function () 
{
  it("default constructor", () => {
    let sk = new Sankey();
    should.deepEqual(sk.links, []);
    should.deepEqual(sk.nodes, []);
  });
  it("addLink()", ()=>{
    let sk = new Sankey();
    let source = "test-source";
    let target = "test-target";
    let value = 1;

    // addLink() sums value 
    sk.addLink({source,target,value});
    should.deepEqual(sk.links, [{source, target, value}]);
    sk.addLink({source,target,value});
    should.deepEqual(sk.links, [{source, target, value:2*value}]);

    // addLink() uses source/target to identify the link
    let source2 = "test-source2";
    let target2 = "test-target2";
    let value2 = 10;
    sk.addLink({source, target:target2, value:value2});
    should.deepEqual(sk.links, [
      {source, target, value:2*value},
      {source,target:target2,value:value2},
    ]);
    let value3 = 100;
    sk.addLink({source:source2, target, value:value3});
    should.deepEqual(sk.links, [
      {source,          target,          value:2*value},
      {source,          target:target2,  value:value2},
      {source:source2,  target,          value:value3},
    ]);
    should.deepEqual(sk.nodes, [
      {id: source},
      {id: target},
      {id: target2},
      {id: source2},
    ]);
  });
  it("serialization", ()=>{
    let sk = new Sankey();
    let source = "test-source";
    let target = "test-target";
    let value = 1;
    sk.addLink({source,target,value});

    let json = JSON.stringify(sk);
    let sk2 = new Sankey(JSON.parse(json));
    should.deepEqual(sk2, sk);

    // Verify that sk2 works like the original
    sk2.addLink({source,target,value});
    should.deepEqual(sk2.links, [{source, target, value:value*2}]);
  });
});
