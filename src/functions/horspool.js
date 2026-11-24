/**
 * Boyer-Moore-Horspool (Horspool 1980): only the bad-character shift of the
 * text character aligned with the LAST pattern position.
 * Works on reduced-alphabet code arrays (see alphabet.js).
 *   preprocessing O(m + S), search O(n·m) worst / O(n/m) best.
 */
export function prepareHorspool(p, S) {
  const m = p.length;
  const shift = new Int32Array(S).fill(m);
  for (let i = 0; i < m - 1; i++) shift[p[i]] = m - 1 - i;
  return { p, m, shift };
}

export function searchHorspool(t, n, prep, onHit) {
  const { p, m, shift } = prep;
  const last = p[m - 1];
  let i = 0;
  while (i <= n - m) {
    const c = t[i + m - 1];
    if (c === last) {
      let j = m - 2;
      while (j >= 0 && t[i + j] === p[j]) j--;
      if (j < 0) onHit(i);
    }
    i += shift[c];
  }
}
