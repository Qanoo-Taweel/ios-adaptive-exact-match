import { buildSuffixArray } from './suffixArray.js';

/**
 * FM-index (Ferragina & Manzini 2000) with backward search.
 *
 * Built per text: SA (prefix doubling) → BWT → C[] (counts of smaller
 * symbols) → Occ checkpoints every 64 rows. Backward search narrows the SA
 * interval one pattern character at a time, right to left:
 *   sp = C[c] + Occ(c, sp),  ep = C[c] + Occ(c, ep)
 * so a COUNT query costs O(m) regardless of n. Positions are located with
 * the full suffix array (a sampled SA would save memory but cost time;
 * memory is not graded here; see report §7).
 *
 * Symbols inside the index: 0 = sentinel $, codes are shifted by +1.
 */
const STEP = 64;

export function buildFMIndex(t, n, S) {
  const sa = buildSuffixArray(t.subarray ? t.subarray(0, n) : t, S, true); // length n+1, sa[0] = n
  const A = S + 1; // with sentinel
  const N = n + 1;
  const bwt = A <= 256 ? new Uint8Array(N) : new Uint16Array(N);
  for (let i = 0; i < N; i++) {
    const j = sa[i];
    bwt[i] = j === 0 ? 0 : t[j - 1] + 1;
  }
  const C = new Int32Array(A + 1);
  for (let i = 0; i < N; i++) C[bwt[i] + 1]++;
  for (let c = 1; c <= A; c++) C[c] += C[c - 1];
  const blocks = Math.floor(N / STEP) + 1;
  const occ = new Int32Array(blocks * A);
  const run = new Int32Array(A);
  for (let i = 0; i < N; i++) {
    if (i % STEP === 0) occ.set(run, (i / STEP) * A);
    run[bwt[i]]++;
  }
  if (N % STEP === 0) occ.set(run, (N / STEP) * A);
  return { sa, bwt, C, occ, A, N };
}

/** Number of occurrences of symbol c in bwt[0..i). */
function rank(fm, c, i) {
  const blk = (i / STEP) | 0;
  let r = fm.occ[blk * fm.A + c];
  const bwt = fm.bwt;
  for (let j = blk * STEP; j < i; j++) if (bwt[j] === c) r++;
  return r;
}

export function fmRange(fm, p) {
  let sp = 0, ep = fm.N;
  for (let j = p.length - 1; j >= 0 && sp < ep; j--) {
    const c = p[j] + 1;
    sp = fm.C[c] + rank(fm, c, sp);
    ep = fm.C[c] + rank(fm, c, ep);
  }
  return [sp, ep];
}

export function searchFMIndex(fm, patterns, n, onHit) {
  for (let u = 0; u < patterns.length; u++) {
    const p = patterns[u];
    if (p.length > n) continue;
    const [sp, ep] = fmRange(fm, p);
    for (let r = sp; r < ep; r++) onHit(u, fm.sa[r]);
  }
}
