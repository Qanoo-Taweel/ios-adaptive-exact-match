/**
 * Boyer-Moore (Boyer & Moore 1977) with the bad-character rule and the
 * strong good-suffix rule. Right-to-left comparison.
 *   preprocessing O(m + S), search O(n·m) worst (no Galil rule), sublinear on average.
 */
export function prepareBoyerMoore(p, S) {
  const m = p.length;
  // Bad character: last occurrence of each code in p (or -1).
  const lastOcc = new Int32Array(S).fill(-1);
  for (let i = 0; i < m; i++) lastOcc[p[i]] = i;

  // Strong good-suffix table (standard two-pass construction).
  const good = new Int32Array(m + 1);
  const border = new Int32Array(m + 1);
  let i = m, j = m + 1;
  border[i] = j;
  while (i > 0) {
    while (j <= m && p[i - 1] !== p[j - 1]) {
      if (good[j] === 0) good[j] = j - i;
      j = border[j];
    }
    i--; j--;
    border[i] = j;
  }
  j = border[0];
  for (i = 0; i <= m; i++) {
    if (good[i] === 0) good[i] = j;
    if (i === j) j = border[j];
  }
  return { p, m, lastOcc, good };
}

export function searchBoyerMoore(t, n, prep, onHit) {
  const { p, m, lastOcc, good } = prep;
  let s = 0;
  while (s <= n - m) {
    let j = m - 1;
    while (j >= 0 && p[j] === t[s + j]) j--;
    if (j < 0) {
      onHit(s);
      s += good[0];
    } else {
      const bc = j - lastOcc[t[s + j]];
      const gs = good[j + 1];
      s += bc > gs ? bc : gs;
    }
  }
}
