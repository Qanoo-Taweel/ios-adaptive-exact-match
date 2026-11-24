import { bitsFor } from './alphabet.js';

/**
 * Wu-Manber (Wu & Manber 1994) multi-pattern search.
 *
 * Every pattern is viewed through its first `lmin` characters (lmin = the
 * shortest pattern length). A block of B characters ending at the window's
 * right edge is hashed (exactly, by bit packing) and looked up in
 *   SHIFT[h]  = how far the window may safely move, and
 *   bucket[h] = patterns whose lmin-prefix ENDS with this block (SHIFT = 0).
 * Candidates are verified over their full length.
 *
 * Safe default shift for an unseen block is lmin-B+1 (same argument as in
 * bm4DNAHMbs). The original paper also keeps a PREFIX hash table to filter
 * bucket entries; we verify directly because buckets are short with an
 * exact (non-folded) block hash.
 */
export function chooseBlock(lmin, S, k) {
  const b = bitsFor(S);
  // B ≈ log_S(2·k·lmin) as Wu & Manber suggest, limited by table size and lmin.
  let B = Math.max(1, Math.ceil(Math.log(2 * k * lmin) / Math.log(Math.max(2, S - 1))));
  const maxB = Math.max(1, Math.floor(16 / b));
  if (B > maxB) B = maxB;
  if (B > lmin) B = lmin;
  return B;
}

export function prepareWuManber(patterns, S, blockOverride) {
  let lmin = Infinity;
  for (const p of patterns) if (p.length < lmin) lmin = p.length;
  const k = patterns.length;
  const B = blockOverride ?? chooseBlock(lmin, S, k);
  const b = bitsFor(S);
  const size = 1 << (b * B);
  const mask = size - 1;
  const shift = new Int32Array(size).fill(lmin - B + 1);
  const head = new Int32Array(size).fill(-1);
  const next = new Int32Array(k).fill(-1);
  patterns.forEach((p, u) => {
    let h = 0;
    for (let j = 0; j < lmin; j++) {
      h = ((h << b) | p[j]) & mask;
      if (j >= B - 1) {
        const sft = lmin - 1 - j;
        if (sft < shift[h]) shift[h] = sft;
      }
    }
    // h is now the block ending at lmin-1: push into its bucket
    next[u] = head[h];
    head[h] = u;
  });
  // Reverse buckets so they are in ascending pattern order (deterministic).
  for (let h = 0; h < size; h++) {
    if (head[h] === -1 || next[head[h]] === -1) continue;
    let prev = -1, cur = head[h];
    while (cur !== -1) { const nx = next[cur]; next[cur] = prev; prev = cur; cur = nx; }
    head[h] = prev;
  }
  return { patterns, lmin, B, b, shift, head, next };
}

export function searchWuManber(t, n, prep, onHit) {
  const { patterns, lmin, B, b, shift, head, next } = prep;
  let i = lmin - 1;
  while (i < n) {
    let h = 0;
    for (let r = i - B + 1; r <= i; r++) h = (h << b) | t[r];
    const s = shift[h];
    if (s > 0) { i += s; continue; }
    const start = i - lmin + 1;
    for (let u = head[h]; u !== -1; u = next[u]) {
      const p = patterns[u];
      const m = p.length;
      if (start + m > n) continue;
      let j = 0;
      while (j < m && t[start + j] === p[j]) j++;
      if (j === m) onHit(u, start);
    }
    i += 1;
  }
}
