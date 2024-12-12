import { Pali } from "../main.mjs";
import should from "should";

typeof describe === "function" && describe("pali", function () {
  it("default constructor", () => {
    let pali = new Pali();

    should.deepEqual(Pali.OCBS_ALPHABET, [
      'a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o', 
      'ṃ', 'ṁ', 
      'k', 'kh', 'g', 'gh', 
      'ṅ', 'c', 'ch', 'j', 'jh', 
      'ñ', 'ṭ', 'ṭh', 'ḍ', 'ḍh', 
      'ṇ', 't', 'th', 'd', 'dh', 
      'n', 'p', 'ph', 'b', 'bh', 
      'm', 'y', 'r', 'l', 'ḷ', 'ḷh', 'v', 's', 'h',
    ]);
  });
  it("OCBS_CHAR_ORDER()", ()=>{
    //console.log(Pali.OCBS_CHAR_ORDER);
  });
  it("compareOCBS()", ()=>{
    let pali = new Pali();
    let test = (items, expected) =>{
      let sorted = items.split(' ').sort(Pali.compareOCBS).join(' ');
      should(sorted).equal(expected);
    }

    test('āsava ācariya ananta ānanda', 'ananta ācariya ānanda āsava');
    test('iñjati amacca oka ūhata', 'amacca iñjati ūhata oka');
    test('ghara gaṇa cakka joti', 'gaṇa ghara cakka joti');
    test('jeguccha jīva jāgara jaya', 'jaya jāgara jīva jeguccha');
    test('ṭhāna dhaja ḍaṃsa ñāṇa', 'ñāṇa ṭhāna ḍaṃsa dhaja');
    test('phala palapati bala bhava', 'palapati phala bala bhava');
    test('mettā māna mitta mūla', 'māna mitta mūla mettā');
    test('saṃyuta saṃyutta saṃyojita saṃyojana', 
      'saṃyuta saṃyutta saṃyojana saṃyojita');
    test('rāga lakkhaṇa yakkha vacana', 'yakkha rāga lakkhaṇa vacana');
    test('khattiya khandha khanti khama', 
      'khattiya khanti khandha khama');
    test('icchati iñjati icchā iṭṭha', 'icchati icchā iñjati iṭṭha');
    test('sīla siṅgāla sikhā sīta', 'sikhā siṅgāla sīta sīla');
  });
  it("compareRoman()", ()=>{
    const msg = "test.pali@45";
    let pali = new Pali();
    let test = (items, expected) =>{
      let sorted = items.split(/  */)
        .sort(Pali.compareRoman)
        .join(' ');
      should(sorted).equal(expected);
    }

    test("vedanā dhamma", "dhamma vedanā");
    test("m ṁ", "m ṁ");
    test("me ṁb", "me ṁb");
    test("me\u2026 ṁb\u2026", "me\u2026 ṁb\u2026");
    test("ame\u2026 aṁb\u2026", "ame\u2026 aṁb\u2026");
    test("same\u2026 saṁb\u2026", "same\u2026 saṁb\u2026");
    test('ṃd it ṃ  i', 'i it ṃ ṃd');
    test('āsava ācariya ananta ānanda', 'ananta ācariya ānanda āsava');
    test('iñjati amacca oka ūhata', 'amacca iñjati oka ūhata');
    test('ghara gaṇa cakka joti', 'cakka gaṇa ghara joti');
    test('jeguccha jīva jāgara jaya', 'jaya jāgara jeguccha jīva');
    test('ṭhāna dhaja ḍaṃsa ñāṇa', 'dhaja ḍaṃsa ñāṇa ṭhāna');
    test('phala palapati bhava bala', 'bala bhava palapati phala');
    test('mettā māna mitta mūla', 'māna mettā mitta mūla');
    test('saṃyuta saṃyutta saṃyojita saṃyojana', 
      'saṃyojana saṃyojita saṃyuta saṃyutta');
    test('rāga lakkhaṇa yakkha vacana', 'lakkhaṇa rāga vacana yakkha');
    test('khattiya khandha khanti khama', 
      'khama khandha khanti khattiya');
    test('icchati iñjati icchā iṭṭha', 'icchati icchā iñjati iṭṭha');
    test('sīla siṅgāla sikhā sīta', 'sikhā siṅgāla sīla sīta');
  });
  it("compare endings()", ()=>{
    let pali = new Pali();
    let endings = [
      '-iṃ', 
      '-ī',
      '-iyo',
      '-i',
      '-ī',
      '-iyā',
      '-īhi',
    ];
    let sendings = endings.sort(Pali.compareRoman);
    should.deepEqual(sendings, [
      '-i',
      '-iṃ', 
      '-iyā',
      '-iyo',
      '-ī',
      '-ī',
      '-īhi',
    ]);
  });
  it("INFLECTIONS", ()=>{
    let inf = Pali.INFLECTIONS;
    should.deepEqual(inf[0], {
      id: 1,
      type: "dcl",
      pat: "-a/ā",
      gdr: "masc",
      'case': "nom",
      singular: ["o"],
      plural: ["ā"]
    });
    should.deepEqual(inf[4], {
      id: 5,
      type: "dcl",
      pat: "-a/ā",
      gdr: "masc",
      'case': "abl",
      singular: ["ā", "asmā", "amhā"],
      plural: ["ehi"]
    });
  });
  it("ENDING_MAX_LEN", ()=>{
    should(Pali.ENDING_MAX_LEN).equal(5);
  });
});
