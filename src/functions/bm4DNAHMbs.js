import { bitsFor } from './alphabet.js';

/**
 * bm4DNAHMbs (Allmer 2016, after Wu & Manber 1994): Boyer-Moore driven by
 * q-grams instead of single characters. The q characters ending at the
 * window's right edge are packed into one integer with bit shifts ("bs"),
 * and a shift table indexed by that hash ("HM") gives the jump.
 *
 * Shift for a q-gram g:
 *   min over occurrences of g ending at j (q-1 ≤ j ≤ m-2) of (m-1-j);
 *   m-q+1 if g never occurs in p[0..m-2].
 *
 * DEVIATION FROM THE PAPER (report §2): the pseudocode uses m as the shift
 * for an unseen q-gram. That is unsafe: the window may start inside the
 * unseen q-gram, e.g. its last q-1 characters may be a prefix of the
 * pattern. The largest safe shift is m-q+1. Our tests include a case
 * that loses matches when the shift is m.
 * Also: hashes are exact (codes are packed, not folded), so the last q-gram
 * is compared by integer equality and only the remaining m-q characters
 * need verification.
 */
export function chooseQ(m, S) {
  const b = bitsFor(S);
  let q = Math.max(1, Math.floor(14 / b)); // table ≤ 2^14 entries
  if (q > 8) q = 8;
  if (q > m) q = m;
  return q;
}

export function prepareHMbs(p, S, qOverride) {
  const m = p.length;
  const b = bitsFor(S);
  const q = qOverride ?? chooseQ(m, S);
  const size = 1 << (b * q);
  const mask = size - 1;
  const shift = new Int32Array(size).fill(m - q + 1);
  let h = 0;
  for (let j = 0; j < m - 1; j++) {
    h = ((h << b) | p[j]) & mask;
    if (j >= q - 1) shift[h] = m - 1 - j;
  }
  let lastHash = 0;
  for (let j = m - q; j < m; j++) lastHash = ((lastHash << b) | p[j]) & mask;
  return { p, m, q, b, mask, shift, lastHash, afterHit: shift[lastHash] };
}

export function searchHMbs(t, n, prep, onHit) {
  const { p, m, q, b, shift, lastHash, afterHit } = prep;
  const verifyTo = m - q; // positions 0..m-q-1 still need checking
  let i = m - 1; // window end
  while (i < n) {
    let h = 0;
    for (let r = i - q + 1; r <= i; r++) h = (h << b) | t[r];
    if (h === lastHash) {
      const s = i - m + 1;
      let j = 0;
      while (j < verifyTo && t[s + j] === p[j]) j++;
      if (j === verifyTo) onHit(s);
      i += afterHit;
    } else {
      i += shift[h];
    }
  }
}
