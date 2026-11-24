/**
 * bm4DNADS (Allmer 2016), a "tuned Boyer-Moore" in the style of Hume & Sunday
 * (1991): a fast skip loop over a delta table in which the last pattern
 * character has shift 0, unrolled three times, with a sentinel so the skip
 * loop needs no bounds check.
 *
 * DEVIATIONS FROM THE PAPER'S PSEUDOCODE (documented, see report §2):
 *  1. The sentinel is not written into the caller's text (strings are
 *     immutable and the contract forbids side effects). The encoder already
 *     copies the text into a typed array, so we allocate m spare cells at the
 *     end and fill them with the code of the last pattern character.
 *  2. After the skip loop stops on a hit candidate we must check `i < n`
 *     explicitly (the sentinel guarantees the stop, not that it is real text).
 *  3. After a verification the window moves by `md2` = the Horspool shift of
 *     the last character (distance to its previous occurrence in p[0..m-2]),
 *     not by 1. This is safe and is what Hume & Sunday call "md2".
 *  4. Each of the three unrolled steps can overshoot only into the sentinel
 *     zone; the zone is m cells long so `i` never leaves the array.
 */
export function prepareDS(p, S) {
  const m = p.length;
  const delta = new Int32Array(S).fill(m);
  for (let i = 0; i < m - 1; i++) delta[p[i]] = m - 1 - i;
  const last = p[m - 1];
  const md2 = delta[last]; // shift after a verification
  delta[last] = 0;
  return { p, m, delta, md2, last };
}

/** `t` must have at least n + m cells, cells n..n+m-1 filled with `prep.last`. */
export function searchDS(t, n, prep, onHit) {
  const { p, m, delta, md2 } = prep;
  if (m > n) return;
  let i = m - 1; // text index aligned with the last pattern character
  for (;;) {
    let k = delta[t[i]];
    while (k !== 0) {          // skip loop, unrolled 3×
      i += k; k = delta[t[i]];
      i += k; k = delta[t[i]];
      i += k; k = delta[t[i]];
    }
    if (i >= n) return;        // stopped on the sentinel
    const s = i - m + 1;
    let j = m - 2;
    while (j >= 0 && t[s + j] === p[j]) j--;
    if (j < 0) onHit(s);
    i += md2;
    if (i >= n) return;
  }
}
