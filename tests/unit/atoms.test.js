// Per-atom unit tests: shared edge cases (periodic patterns, single
// characters, foreign text characters…) + algorithm-specific cases.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as atoms from '../../src/atomic/index.js';
import { E, positions, runAtom, indexOfReference } from '../helpers.js';
import { buildAlphabet, encodePattern, encodeText } from '../../src/functions/alphabet.js';
import { prepareHMbs, searchHMbs } from '../../src/functions/bm4DNAHMbs.js';
import { prepareShiftOr } from '../../src/functions/shiftOr.js';
import { prepareWuManber } from '../../src/functions/wuManber.js';
import { buildSuffixArray } from '../../src/functions/suffixArray.js';
import { buildFMIndex, fmRange } from '../../src/functions/fmIndex.js';
import { prepareKMP } from '../../src/functions/kmp.js';

const check = (A, seq, pats, ic = false) =>
  assert.deepEqual(runAtom(A, E(seq), pats, ic), indexOfReference(E(seq), pats, ic));

/** Edge cases every atom must handle (≥ 5 per atom, as the brief asks). */
const SHARED = [
  ['periodic pattern ABAB in periodic text', 'ABABABABAB', ['ABAB']],
  ['single-character pattern', 'GATTACA', ['A']],
  ['text characters outside the pattern alphabet', 'xxACGTyyACGTzz##', ['ACGT']],
  ['pattern equals the whole text', 'ACGTTGCA', ['ACGTTGCA']],
  ['match at the very end of the text', 'TTTTTTTTGC', ['GC', 'TGC']],
  ['match at position 0 only', 'CATTTTTTTT', ['CAT']],
  ['no match at all', 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', ['AAAAC', 'G']],
  ['all-same text, long pattern', 'A'.repeat(200), ['A'.repeat(64)]],
  ['self-overlapping pattern AABAA', 'AABAABAABAAAABAA', ['AABAA']],
  ['patterns that are prefixes/suffixes of each other', 'abcabcabcd', ['abc', 'abcabc', 'bc', 'c', 'abcd']],
  ['patterns of very different lengths', 'ACGT'.repeat(30), ['A', 'ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGT', 'GTAC']],
  ['many patterns (64) on a short text', 'MKVLAAGIVGLLLAAPAMA'.repeat(5), Array.from({ length: 64 }, (_, i) => 'MKVLAAGIVGLLLAAPAMA'.slice(i % 15, (i % 15) + 1 + (i % 5)))],
];

for (const [name, A] of Object.entries(atoms)) {
  describe(`atom: ${name}`, () => {
    for (const [title, seq, pats] of SHARED) it(title, () => check(A, seq, pats));
    it('ignoreCase with mixed-case text and patterns', () => check(A, 'aCgTAcGt', ['acgt', 'CG'], true));
  });
}

describe('algorithm-specific cases', () => {
  it('bm4DNAHMbs: unseen q-gram shift must be m-q+1, not m (negative control)', () => {
    const pat = 'ACGTT', text = 'GGGACGTT';
    const alpha = buildAlphabet([pat]);
    const t = encodeText(text, alpha);
    const good = prepareHMbs(encodePattern(pat, alpha), alpha.size);
    assert.equal(good.q, 4);
    const found = [];
    searchHMbs(t, text.length, good, (p) => found.push(p));
    assert.deepEqual(found, [3]);
    // The paper's shift (m) skips the occurrence:
    const bad = { ...good, shift: good.shift.map((s) => (s === pat.length - good.q + 1 ? pat.length : s)) };
    const lost = [];
    searchHMbs(t, text.length, bad, (p) => lost.push(p));
    assert.deepEqual(lost, [], 'shift m loses the match, which shows why m-q+1 is required');
  });

  it('bm4DNAHMbs: pattern shorter than q falls back to q = m', () => {
    const alpha = buildAlphabet(['AC']);
    assert.equal(prepareHMbs(encodePattern('AC', alpha), alpha.size).q, 2);
    check(atoms.Bm4DnaHmbsSearch, 'ACACAC', ['AC', 'C']);
  });

  it('bm4DNADS: match touching the sentinel zone, repeated patterns', () => {
    check(atoms.Bm4DnaDsSearch, 'TTTTTTTAAA', ['AAA', 'TAAA', 'AA']);
    check(atoms.Bm4DnaDsSearch, 'AAAAAAAAAA', ['AAAAAAAAAA', 'A']);
  });

  it('Shift-Or: exactly 32 characters, more than 32, and word packing', () => {
    const p32 = 'ACGTTGCAACGTTGCAACGTTGCAACGTTGCA';
    const p40 = p32 + 'GGGGCCCC';
    check(atoms.ShiftOrSearch, 'TT' + p40 + p32 + 'A', [p32, p40]);
    const alpha = buildAlphabet(['AAAA', 'CCCCCCCCCCCC', 'G'.repeat(20)]);
    const prep = prepareShiftOr(['AAAA', 'CCCCCCCCCCCC', 'G'.repeat(20)].map((p) => encodePattern(p, alpha)), alpha.size);
    assert.equal(prep.words.length, 2, '4+12 share a word, 20 does not fit');
    assert.equal(typeof atoms.ShiftOrSearch.selection.applicable({ mMax: 40 }), 'string');
    assert.equal(atoms.ShiftOrSearch.selection.applicable({ mMax: 32 }), true);
  });

  it('KMP: failure function of a periodic pattern', () => {
    const alpha = buildAlphabet(['ABAB']);
    const { border } = prepareKMP(encodePattern('ABABAB', alpha));
    assert.deepEqual([...border], [-1, 0, 0, 1, 2, 3, 4]);
    check(atoms.KmpSearch, 'ABABABABAB', ['ABABAB']);
  });

  it('Rabin-Karp: many patterns sharing one length go through the hash table', () => {
    const pats = Array.from({ length: 50 }, (_, i) => i.toString(2).padStart(6, '0'));
    check(atoms.RabinKarpSearch, '0110100110010110'.repeat(8), pats);
  });

  it('Aho-Corasick: classic he/she/his/hers example', () => {
    const got = runAtom(atoms.AhoCorasickSearch, E('ushers'), ['he', 'she', 'his', 'hers']);
    assert.deepEqual(got.map((m) => [m.position, m.pattern]), [[1, 'she'], [2, 'he'], [2, 'hers']]);
  });

  it('Wu-Manber: block size and shift table respect the shortest pattern', () => {
    const pats = ['ACG', 'ACGTACGTACGT', 'TTTTTTTTT'];
    const alpha = buildAlphabet(pats);
    const prep = prepareWuManber(pats.map((p) => encodePattern(p, alpha)), alpha.size);
    assert.equal(prep.lmin, 3);
    assert.ok(prep.B <= 3);
    check(atoms.WuManberSearch, 'ACGTACGTACGTTTTTTTTTTACG', pats);
  });

  it('suffix array: correct order on a repetitive text (banana)', () => {
    const alpha = buildAlphabet(['abn']);
    const sa = buildSuffixArray(encodeText('banana', alpha), alpha.size);
    assert.deepEqual([...sa], [5, 3, 1, 0, 4, 2]);
    check(atoms.SuffixArraySearch, 'banana', ['ana', 'na', 'banana', 'nab']);
  });

  it('FM-index: backward search interval sizes equal occurrence counts', () => {
    const text = 'mississippi';
    const alpha = buildAlphabet(['misp']);
    const fm = buildFMIndex(encodeText(text, alpha), text.length, alpha.size);
    const count = (p) => { const [a, b] = fmRange(fm, encodePattern(p, alpha)); return b - a; };
    assert.equal(count('ssi'), 2);
    assert.equal(count('i'), 4);
    assert.equal(count('pp'), 1);
    assert.equal(count('sp'), 0);
    check(atoms.FmIndexSearch, text, ['ssi', 'i', 'issip', 'mississippi']);
  });

  it('index atoms: characters not in any pattern never create false matches', () => {
    for (const A of [atoms.SuffixArraySearch, atoms.FmIndexSearch]) check(A, 'xAyAzA$A', ['A', 'AA', 'xA']);
  });
});
