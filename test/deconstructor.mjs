import fs from 'node:fs';
import path from 'node:path';
const { promises: fsp } = fs;
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from 'should';
import { Dictionary, Pali } from '../main.mjs';
import { DBG } from '../src/defines.mjs';

typeof describe === 'function' &&
  describe('deconstructor', () => {
    it('sandiṭṭhiparāmāsiādhānaggāhiduppaṭinissaggissa', async () => {
      const msg = 'test.deconstructor@18';
      if (!DBG.TBD) {
        console.log(msg, 'TBD');
        return;
      }
      let dict = await Dictionary.create();
      let word = 'sandiṭṭhiparāmāsiādhānaggāhiduppaṭinissaggissa';
      let res = dict.deconstruct(word);
      should(res).properties({ word });
      should(res.output.length).equal(1, 'TBD');
      should.deepEqual(res.output[0], [
        'sandiṭṭhiparāmāsi',
        'ādhānaggāhi',
        'duppaṭinissaggissa',
      ]);
    });
  });
