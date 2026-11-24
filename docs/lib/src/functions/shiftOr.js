/**
 * Shift-Or (Baeza-Yates & Gonnet 1992), bit-parallel.
 *
 * Bit j of the state D is 0 when p[0..j] matches the text ending at the
 * current character. Update: D = (D << 1) | B[c].
 *
 * Extension (multi-pattern packing): several short patterns are packed into
 * one 32-bit word side by side. Pattern starts are listed in `startMask`;
 * after the shift those bits are cleared (an empty prefix always matches),
 * and `endMask` collects the last bit of each pattern. One pass over the
 * text then serves every pattern of the word.
 *
 * Patterns longer than 32 are handled correctly but not efficiently: the
 * first 32 characters act as a filter and the rest is verified. The atom
 * declares itself "not applicable" for automatic selection in that case.
 */
export function prepareShiftOr(patterns, S) {
  const words = [];
  let cur = null;
  patterns.forEach((p, u) => {
    const w = Math.min(p.length, 32);
    if (cur === null || cur.used + w > 32) {
      cur = { used: 0, B: new Int32Array(S).fill(-1), startMask: 0, endMask: 0, ends: [] };
      words.push(cur);
    }
    const off = cur.used;
    for (let j = 0; j < w; j++) cur.B[p[j]] &= ~(1 << (off + j));
    cur.startMask |= 1 << off;
    cur.endMask |= 1 << (off + w - 1);
    cur.ends.push({ bit: off + w - 1, u, filterLen: w, p });
    cur.used += w;
  });
  for (const word of words) {
    // map end bit → entries (array indexed by bit position)
    word.byBit = new Array(32).fill(null);
    for (const e of word.ends) word.byBit[e.bit] = e;
  }
  return { words };
}

export function searchShiftOr(t, n, prep, onHit) {
  for (const word of prep.words) {
    const { B, startMask, endMask, byBit } = word;
    const keep = ~startMask;
    let D = -1;
    if (word.ends.length === 1) {
      // Fast path: one pattern in this word.
      const e = word.ends[0];
      const bit = 1 << e.bit;
      for (let i = 0; i < n; i++) {
        D = ((D << 1) & keep) | B[t[i]];
        if ((D & bit) === 0) report(t, n, e, i, onHit);
      }
      continue;
    }
    for (let i = 0; i < n; i++) {
      D = ((D << 1) & keep) | B[t[i]];
      let active = ~D & endMask;
      while (active !== 0) {
        const low = active & -active;
        report(t, n, byBit[31 - Math.clz32(low)], i, onHit);
        active ^= low;
      }
    }
  }
}

function report(t, n, e, i, onHit) {
  const s = i - e.filterLen + 1;
  const p = e.p, m = p.length;
  if (m === e.filterLen) { onHit(e.u, s); return; }
  if (s + m > n) return;
  for (let j = e.filterLen; j < m; j++) if (t[s + j] !== p[j]) return;
  onHit(e.u, s);
}
