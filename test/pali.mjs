import { Pali } from "../main.mjs";
import should from "should";

typeof describe === "function" && describe("pali", function () {
  it("default constructor", () => {
    let pali = new Pali();

    should.deepEqual(Pali.OCBS_ALPHABET, [
      'a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o', 
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
      let sorted = items.split(' ').sort(pali.compareOCBS).join(' ');
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
});
