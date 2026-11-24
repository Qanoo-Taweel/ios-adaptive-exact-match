// Seeded random testing: 320 cases × every atom, compared with the oracle.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { atomsUnderTest, runAtom, oracle } from '../helpers.js';
import { mulberry32, randomText, repetitiveText, makePatterns } from '../../bench/data.js';

const CASES = 320;
const SEED = 424242;
const ALPHAS = ['dna', 'protein', 'text', 'binary', 'alnum', 'rna'];

function makeCase(rng, i) {
  const alpha = ALPHAS[i % ALPHAS.length];
  const n = 1 + ((rng() ** 2) * 2000) | 0;
  let text = rng() < 0.15 ? repetitiveText(rng() < 0.5 ? 'A' : 'ACA', n, rng, 0.01, 'ACGT') : randomText(alpha, n, rng);
  const k = 1 + ((rng() * 12) | 0);
  const m = 1 + ((rng() ** 2) * 60) | 0;
  let pats = makePatterns(text, alpha, k, m, rng, 0.6).map((p) => (rng() < 0.3 ? p.slice(0, 1 + ((rng() * p.length) | 0)) : p));
  if (rng() < 0.2) pats.push(pats[(rng() * pats.length) | 0]);
  if (rng() < 0.1) pats.push(randomText(alpha, n + 1, rng));
  const ignoreCase = rng() < 0.2;
  if (ignoreCase && rng() < 0.5) text = text.toLowerCase();
  const records = 1 + ((rng() * 3) | 0);
  const entries = [];
  const size = Math.ceil(text.length / records);
  for (let r = 0; r < records; r++) entries.push({ header: `>case${i}_${r}`, seq: text.slice(r * size, (r + 1) * size) });
  return { entries, pats, ignoreCase };
}

describe(`seeded random cases (seed ${SEED}, ${CASES} cases)`, () => {
  const rng = mulberry32(SEED);
  const cases = Array.from({ length: CASES }, (_, i) => makeCase(rng, i));
  for (const A of atomsUnderTest()) {
    it(`${A.manifest.name} equals the oracle on all ${CASES} cases`, () => {
      cases.forEach(({ entries, pats, ignoreCase }, i) => {
        const exp = oracle(entries, pats, ignoreCase);
        const got = runAtom(A, entries, pats, ignoreCase);
        assert.deepEqual(got, exp, `case ${i}: patterns=${JSON.stringify(pats).slice(0, 200)}`);
      });
    });
  }
});
