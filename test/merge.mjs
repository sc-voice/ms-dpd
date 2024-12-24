import path from "path";
import fs from "fs";
const { promises: fsp } = fs;
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from "should";
import { DBG } from '../src/defines.mjs';
import { Patch, Merge } from '../src/merge.mjs';

const dbg = 0;

const EN_BASE = {
  1: "one EN",
  2: "two EN",
  3: "three EN (oops)",
  4: "four EN (del)",
  5: "five EN",
}

const EN_HEAD = {
  1: "one EN changed",
  2: "two EN changed",
  3: "three EN (oops)",
  //4: "four EN (del)", 
  5: "five EN",
  6: "six EN new",
}

const PT_HEAD = {
  1: "one PT",
  2: "two EN",
  //3: "three EN (oops)",  // mistaken delete
  4: "four EN (del)",
  5: "five EN",
}


const DIFF_EN = `
CMD	: sync
git diff 23292dc8cf35ed03502077f360bd16ae15cd975c -- test-en.mjs
diff --git a/test-en.mjs b/test-en.mjs
index c00c188..480cfe9 100644
--- a/test-en.mjs
+++ b/test-en.mjs
@@ -1,7 +1,7 @@
 export ABC = {
-  "1": "one EN",
+  "1": "one EN changed",
-  "2": "two EN",
+  "2": "two EN changed",
   "3": "three EN (oops)",
-  "4": "four EN (del)",
   "5": "five EN"
+  "6": "six EN new"
 }
`;

typeof describe === "function" && 
  describe("merge", function () 
{
  it("TESTTESTMerge.ctor()", ()=>{
    let srcBase = EN_BASE;
    let srcPatch = Patch.fromString(DIFF_EN);
    let mrg = new Merge({ srcBase, srcPatch });
    should(mrg.srcBase).equal(srcBase);
    should(mrg.srcPatch).equal(srcPatch);
  });
  it("TESTTESTPatch.fromString(DIFF_EN)", () => {
    should.deepEqual(Patch.fromString(DIFF_EN), new Patch({
      add: {
        '1': 'one EN changed',
        '2': 'two EN changed',
        '6': 'six EN new',
      },
      delete: {
        '1': 'one EN',
        '2': 'two EN',
        '4': 'four EN (del)',
      },
    }));
  });
  it("TESTTESTPatch.from()", ()=>{
    let patch1 = Patch.fromString(DIFF_EN);
    should.deepEqual(Patch.from(DIFF_EN), patch1);
    should(Patch.from(patch1)).equal(patch1);
    let eCaught;
    try {
      Patch.from({bad:'input'});
    } catch(e) { eCaught = e; }
    should(eCaught instanceof Error);
    should(eCaught.message).match(/string or Patch/);
  });
  it("TESTTESTpatch() pt", ()=>{
    let srcBase = EN_BASE;
    let srcPatch = DIFF_EN;
    let mrg = new Merge({ srcBase, srcPatch });

    let res = mrg.patch(PT_HEAD);
    should.deepEqual(res.dst, {
      1: "one PT",          // src:---,    dst:update => update
      2: "two EN changed",  // src:update, dst:---    => update
      3: "three EN (oops)", // src:---, d  dst:delete => restore
      //4: "four EN (del)", // src:delete, dst:---    => delete
      5: "five EN",         // src:---,    dst:---    => ---
      6: "six EN new",      // src:new,    dst:---    => add
    });
    should.deepEqual(res.conflicts, {
      1: { dst: 'one PT', src: 'one EN changed' },
    });
    should.deepEqual(res.added, [ '6', ]);
    should.deepEqual(res.deleted, [ '4', ]);
    should.deepEqual(res.updated, [ '2', ]);
  });
});
