// Task 2: every atom equals the NaiveSearch oracle, element by element,
// on real and synthetic data.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadFasta, atomsUnderTest, runAtom, oracle, indexOfReference } from '../helpers.js';
import { mulberry32, randomText, repetitiveText, makePatterns, toEntries } from '../../bench/data.js';

const lambda = loadFasta('lambda.fasta');
const ecoli = loadFasta('ecoli-proteins.fasta');

function slices(seq, rng, count, minLen, maxLen) {
  return Array.from({ length: count }, () => {
    const m = minLen + ((rng() * (maxLen - minLen + 1)) | 0);
    const s = (rng() * (seq.length - m)) | 0;
    return seq.slice(s, s + m);
  });
}

const rng = mulberry32(20261124);
const L = lambda[0].seq;
const P = ecoli.map((e) => e.seq).join('');

const DATASETS = [
  ['lambda: short patterns', lambda, slices(L, rng, 8, 3, 12)],
  ['lambda: long patterns', lambda, [...slices(L, rng, 4, 100, 1000), 'GGGCGGCGACCTCGCGGGTTTTCGCTATTTATGAAAATTTTCCGGTTTAAGGCGTTTCCG']],
  ['lambda: many patterns (200, mixed lengths)', lambda, [...slices(L, rng, 150, 4, 40), ...Array.from({ length: 50 }, () => randomText('dna', 12, rng))]],
  ['lambda: lower-case genome with ignoreCase', lambda.map((e) => ({ ...e, seq: e.seq.toLowerCase() })), ['GAATTC', 'ggatcc', 'AAGCTT', 'gcggccgc'], true],
  ['E. coli proteins: 126-record stream, peptides', ecoli, [...slices(P, rng, 20, 3, 15), 'MKK', 'W', 'LLLL']],
  ['E. coli proteins: many patterns', ecoli, slices(P, rng, 120, 4, 8)],
];

const SYNTH = [];
for (const [alpha, n, k, m] of [['dna', 20000, 6, 8], ['protein', 20000, 6, 5], ['text', 20000, 6, 6], ['binary', 5000, 6, 10], ['alnum', 10000, 6, 4]]) {
  const t = randomText(alpha, n, rng);
  SYNTH.push([`synthetic ${alpha} alphabet`, toEntries(t, 3, alpha), makePatterns(t, alpha, k, m, rng)]);
}
SYNTH.push(['highly repetitive ATATAT…', toEntries(repetitiveText('AT', 6000), 1), ['ATAT', 'TATA', 'ATATATATATAT', 'AA', 'T']]);
SYNTH.push(['highly repetitive AAAA… with rare mutations', toEntries(repetitiveText('A', 6000, rng, 0.002, 'ACGT'), 2), ['AAAA', 'A'.repeat(50), 'AC', 'AAAAG']]);
SYNTH.push(['mixed pattern lengths + the same pattern twice', toEntries(randomText('dna', 8000, rng), 4), ['A', 'ACG', 'ACGTACGTAC', 'ACG', 'GATTACAGATTACA', 'T'.repeat(33)]]);
SYNTH.push(['multi-record stream with empty records', [{ header: '>a', seq: 'ACGT' }, { header: '>b', seq: '' }, { header: '>c', seq: 'TTACGTT' }], ['ACGT', 'T']]);
SYNTH.push(['ignoreCase on mixed-case text', toEntries(randomText('alnum', 5000, rng), 2), ['abc', 'ABC', 'x', 'Q9z'], true]);

describe('oracle sanity', () => {
  it('NaiveSearch equals an independent indexOf reference', () => {
    for (const [, entries, pats, ic] of [...DATASETS, ...SYNTH]) {
      assert.deepEqual(oracle(entries, pats, ic), indexOfReference(entries, pats, ic));
    }
  });
});

for (const A of atomsUnderTest()) {
  describe(`oracle: ${A.manifest.name}`, () => {
    for (const [title, entries, pats, ic = false] of [...DATASETS, ...SYNTH]) {
      it(title, () => {
        const expected = oracle(entries, pats, ic);
        const got = runAtom(A, entries, pats, ic);
        assert.equal(got.length, expected.length);
        assert.deepEqual(got, expected);
      });
    }
  });
}
