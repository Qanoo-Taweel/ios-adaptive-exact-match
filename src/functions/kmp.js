/**
 * Knuth-Morris-Pratt (1977). Left-to-right, never moves backwards in the
 * text, so it is stream friendly. O(m) preprocessing, O(n) search worst case.
 * Uses the optimised failure function ("next" with the strong rule).
 */
export function prepareKMP(p) {
  const m = p.length;
  const fail = new Int32Array(m + 1);
  fail[0] = -1;
  let k = -1;
  for (let i = 0; i < m; i++) {
    while (k >= 0 && p[k] !== p[i]) k = fail[k];
    k++;
    // strong rule: avoid re-comparing the same character after a mismatch
    fail[i + 1] = (i + 1 < m && p[i + 1] === p[k]) ? fail[k] : k;
  }
  // `border` (weak) is needed after a full match.
  const border = new Int32Array(m + 1);
  border[0] = -1;
  k = -1;
  for (let i = 0; i < m; i++) {
    while (k >= 0 && p[k] !== p[i]) k = border[k];
    k++;
    border[i + 1] = k;
  }
  return { p, m, fail, border };
}

export function searchKMP(t, n, prep, onHit) {
  const { p, m, fail, border } = prep;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const c = t[i];
    while (j >= 0 && p[j] !== c) j = fail[j];
    j++;
    if (j === m) {
      onHit(i - m + 1);
      j = border[m];
    }
  }
}
