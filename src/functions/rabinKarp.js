/**
 * Rabin-Karp (Karp & Rabin 1987) with a rolling polynomial hash mod 2^32.
 *
 * Multi-pattern form: patterns are grouped by length; one rolling hash per
 * distinct length serves every pattern of that length through an open-
 * addressing hash table. Equal hashes are ALWAYS verified character by
 * character (the brief's "eşit özetlerde doğrulama şart"), so collisions can
 * cost time but never correctness.
 */
const BASE = 0x01000193; // FNV prime, odd → invertible mod 2^32

function powMod32(base, e) {
  let r = 1, b = base;
  while (e > 0) {
    if (e & 1) r = Math.imul(r, b);
    b = Math.imul(b, b);
    e >>>= 1;
  }
  return r;
}

export function hashCodes(arr, from, len) {
  let h = 0;
  for (let i = from; i < from + len; i++) h = (Math.imul(h, BASE) + arr[i] + 1) | 0;
  return h;
}

export function prepareRabinKarp(patterns) {
  const byLen = new Map();
  patterns.forEach((p, u) => {
    const m = p.length;
    if (!byLen.has(m)) byLen.set(m, []);
    byLen.get(m).push(u);
  });
  const groups = [];
  for (const [m, ids] of byLen) {
    // open addressing table, power of two ≥ 2·|ids|
    let cap = 4;
    while (cap < ids.length * 2) cap <<= 1;
    const keys = new Int32Array(cap);
    const heads = new Int32Array(cap).fill(-1);
    const next = new Int32Array(ids.length).fill(-1);
    const hashes = ids.map((u) => hashCodes(patterns[u], 0, m));
    ids.forEach((u, idx) => {
      const h = hashes[idx];
      let slot = h & (cap - 1);
      while (heads[slot] !== -1 && keys[slot] !== h) slot = (slot + 1) & (cap - 1);
      keys[slot] = h;
      next[idx] = heads[slot];
      heads[slot] = idx;
    });
    groups.push({ m, ids, keys, heads, next, cap, outPow: powMod32(BASE, m - 1), single: ids.length === 1 ? hashes[0] : null });
  }
  return { patterns, groups };
}

export function searchRabinKarp(t, n, prep, onHit) {
  const { patterns } = prep;
  for (const g of prep.groups) {
    const m = g.m;
    if (m > n) continue;
    const { keys, heads, next, cap, outPow, ids, single } = g;
    let h = hashCodes(t, 0, m);
    for (let s = 0; ; s++) {
      if (single !== null) {
        if (h === single) verify(t, s, patterns[ids[0]], ids[0], onHit);
      } else {
        let slot = h & (cap - 1);
        while (heads[slot] !== -1) {
          if (keys[slot] === h) {
            for (let idx = heads[slot]; idx !== -1; idx = next[idx]) verify(t, s, patterns[ids[idx]], ids[idx], onHit);
            break;
          }
          slot = (slot + 1) & (cap - 1);
        }
      }
      if (s + m >= n) break;
      // roll: remove t[s], add t[s+m]
      h = (Math.imul(h - Math.imul(t[s] + 1, outPow), BASE) + t[s + m] + 1) | 0;
    }
  }
}

function verify(t, s, p, u, onHit) {
  for (let j = 0; j < p.length; j++) if (t[s + j] !== p[j]) return;
  onHit(u, s);
}
