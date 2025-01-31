import fs from 'node:fs';
import path from 'node:path';
const { promises: fsp } = fs;
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import should from 'should';
import { DBG } from '../src/defines.mjs';
import { default as HeadwordKey } from '../src/headword-key.mjs';
const { SYMBOLS } = HeadwordKey;

typeof describe === 'function' &&
  describe('r64', () => {
    it('fromNumber', () => {
      for (let i = 0; i < SYMBOLS.length; i++) {
        should(HeadwordKey.fromNumber(i)).equal(SYMBOLS[i]);
      }
      should(HeadwordKey.fromNumber(75143)).equal('JXz');
      should(HeadwordKey.fromNumber(75144)).equal('JY0');
      should(HeadwordKey.fromNumber(75145)).equal('JY1');
      should(HeadwordKey.fromNumber(238327)).equal('zzz');
    });
    it('toNumber() string', () => {
      for (let i = 0; i < SYMBOLS.length; i++) {
        should(HeadwordKey.toNumber(SYMBOLS[i])).equal(i);
      }
      should(HeadwordKey.toNumber('JXz')).equal(75143);
      should(HeadwordKey.toNumber('JY0')).equal(75144);
      should(HeadwordKey.toNumber('JY1')).equal(75145);
      should(HeadwordKey.toNumber('zzz')).equal(238327);
    });
  });
