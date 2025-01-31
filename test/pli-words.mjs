import fs from 'node:fs';
import path from 'node:path';
const { promises: fsp } = fs;
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from 'should';
import { DBG } from '../src/defines.mjs';

let RE_TI = /[”’"'\b]ti/g;

typeof describe === 'function' &&
  describe('pli-words', () => {
    it('upanidhāyā_ ti', () => {
      let text1 = 'asdf upanidhāyā”ti. wxyz';
      let norm1 = text1.replace(RE_TI, 'ti');
      should(norm1).equal('asdf upanidhāyāti. wxyz');

      let text2 = "asdf upanidhāyā'ti. wxyz";
      let norm2 = text2.replace(RE_TI, 'ti');
      should(norm2).equal('asdf upanidhāyāti. wxyz');
    });
  });
