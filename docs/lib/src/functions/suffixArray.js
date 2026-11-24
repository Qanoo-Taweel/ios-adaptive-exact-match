/**
 * Suffix array (Manber & Myers 1993) by prefix doubling with counting sort,
 * O(n log n). The text gets a unique smallest sentinel so cyclic shifts and
 * suffixes sort identically.
 *
 * Query: two binary searches give the SA interval of suffixes starting
 * with the pattern, O(m log n) per pattern; every SA entry in the interval
 * is an occurrence.
 */

/**
 * @param {ArrayLike<number>} s codes in 0..S-1 (no sentinel)
 * @param {number} S alphabet size
 * @param {boolean} keepSentinel return SA of s+$ (length n+1) instead of s
 */
export function buildSuffixArray(s, S, keepSentinel = false) {
  const n = s.length + 1; // with sentinel
  const K = Math.max(S + 1, n);
  let p = new Int32Array(n);
  let c = new Int32Array(n);
  let pn = new Int32Array(n);
  let cn = new Int32Array(n);
  const cnt = new Int32Array(K);
  // initial: sort by the first character (sentinel = 0, codes shifted by +1)
  const ch = (i) => (i === n - 1 ? 0 : s[i] + 1);
  for (let i = 0; i < n; i++) cnt[ch(i)]++;
  for (let i = 1; i <= S; i++) cnt[i] += cnt[i - 1];
  for (let i = n - 1; i >= 0; i--) p[--cnt[ch(i)]] = i;
  let classes = 1;
  c[p[0]] = 0;
  for (let i = 1; i < n; i++) {
    if (ch(p[i]) !== ch(p[i - 1])) classes++;
    c[p[i]] = classes - 1;
  }
  for (let h = 1; h < n && classes < n; h <<= 1) {
    for (let i = 0; i < n; i++) {
      let v = p[i] - h;
      if (v < 0) v += n;
      pn[i] = v;
    }
    cnt.fill(0, 0, classes);
    for (let i = 0; i < n; i++) cnt[c[pn[i]]]++;
    for (let i = 1; i < classes; i++) cnt[i] += cnt[i - 1];
    for (let i = n - 1; i >= 0; i--) p[--cnt[c[pn[i]]]] = pn[i];
    cn[p[0]] = 0;
    classes = 1;
    for (let i = 1; i < n; i++) {
      const a = p[i], b = p[i - 1];
      let a2 = a + h; if (a2 >= n) a2 -= n;
      let b2 = b + h; if (b2 >= n) b2 -= n;
      if (c[a] !== c[b] || c[a2] !== c[b2]) classes++;
      cn[a] = classes - 1;
    }
    const tmp = c; c = cn; cn = tmp;
  }
  return keepSentinel ? p : p.subarray(1); // p[0] is always the sentinel suffix
}

/** Compares pattern p with the suffix of t starting at i: <0, 0 (prefix), >0. */
function cmpSuffix(t, n, i, p) {
  const m = p.length;
  for (let j = 0; j < m; j++) {
    if (i + j >= n) return 1; // suffix shorter ⇒ suffix < pattern ⇒ pattern greater
    const d = p[j] - t[i + j];
    if (d !== 0) return d;
  }
  return 0;
}

export function saRange(t, n, sa, p) {
  let lo = 0, hi = sa.length;
  while (lo < hi) { // first suffix ≥ p
    const mid = (lo + hi) >>> 1;
    if (cmpSuffix(t, n, sa[mid], p) > 0) lo = mid + 1; else hi = mid;
  }
  const start = lo;
  hi = sa.length;
  while (lo < hi) { // first suffix that does not start with p and is > p
    const mid = (lo + hi) >>> 1;
    if (cmpSuffix(t, n, sa[mid], p) >= 0) lo = mid + 1; else hi = mid;
  }
  return [start, lo];
}

export function searchSuffixArray(t, n, sa, patterns, onHit) {
  for (let u = 0; u < patterns.length; u++) {
    const p = patterns[u];
    if (p.length > n) continue;
    const [a, b] = saRange(t, n, sa, p);
    for (let r = a; r < b; r++) onHit(u, sa[r]);
  }
}
