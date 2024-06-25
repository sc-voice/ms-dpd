import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { default as AST } from '../src/ast.mjs';

typeof describe === "function" && 
  describe("TESTTESTast", function () 
{
  it("default ctor", () => {
    let eCaught;
    try {
      let ast = new AST();
    } catch(e) {
      eCaught = e;
    }
    should(eCaught.message).match(/nodeType/);
  });
  it("generate E_CODE", ()=>{
    let ast = new AST(AST.E_CODE, "test");
    should(ast.generate()).equal("test");
    let astUndefined = new AST(AST.E_CODE);
    should(astUndefined.generate()).equal(undefined);
    let obj = {a:1, b:2, c:{d:3}};
    let indent = 3;
    let astObj = new AST(AST.E_CODE, { a:1, b:2, c:{d:3}}, indent);
    should(astObj.generate(1)).equal(JSON.stringify(obj));
  });
  it("generate S_SWITCH", ()=>{
    let ast = new AST(AST.S_SWITCH, ['testVar', {
      a: new AST(AST.E_CODE, 'return 1'),
      b: new AST(AST.E_CODE, 'return 2'),
      default: new AST(AST.E_CODE, 'return 3'),
    }])
    let s1 = ast.generate();
    let s2 = ast.generate(0, {step:2});
    should(s1).equal(s2);
    let s3 = ast.generate(1, {step:3});
    should(s3).equal([
      ' switch (testVar) {',
      '    case a: return 1',
      '    case b: return 2',
      '    default: return 3',
      ' }',
    ].join('\n'));
  });
});
