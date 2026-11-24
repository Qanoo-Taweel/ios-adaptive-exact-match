/**
 * Cost-model features (pure functions of a data shape).
 *
 * Each atom's `selection.features(shape)` returns a small vector of expected
 * operation counts. The molecule multiplies them by calibrated coefficients
 * (seconds per operation) and adds them up:
 *     estimate(atom) = Σ_f  coef[atom][f] · feature[atom][f]
 *
 * The counts come from the text's character frequencies f(c) (measured on
 * the first record) and from the actual patterns, so the model "knows", for
 * example, that a Horspool shift is short when the pattern contains the
 * text's most frequent characters.
 */
import { bitsFor } from './alphabet.js';

const log2 = Math.log2;

/** Frequency of character code c in the text (0 if absent). */
function fr(shape, c) { return shape.freq?.get(c) ?? 0; }

/** Collision probability, guarded away from 0 and 1. */
function pcOf(shape) {
  const pc = shape.collision;
  if (!(pc > 0)) return 1 / 4;
  return Math.min(pc, 0.999);
}

/** Expected matches of pattern p in a text of length n. */
export function expectedMatches(shape, p) {
  const n = shape.n, m = p.length;
  if (m > n) return 0;
  let prob = 1;
  for (let i = 0; i < m && prob > 1e-12; i++) prob *= fr(shape, p.charCodeAt(i));
  return (n - m + 1) * prob;
}

/** Per-shape memo (non-enumerable), so 11 atoms do not repeat shared work. */
function memo(shape, key, fn) {
  if (!Object.prototype.hasOwnProperty.call(shape, '_memo')) {
    if (!Object.isExtensible(shape)) return fn();
    Object.defineProperty(shape, '_memo', { value: new Map(), enumerable: false });
  }
  const m = shape._memo;
  if (!m.has(key)) m.set(key, fn());
  return m.get(key);
}

export function totalMatches(shape) {
  return memo(shape, 'totalMatches', () => totalMatchesRaw(shape));
}

function totalMatchesRaw(shape) {
  // Duplicates are reported once per copy: scale distinct matches by k / kDistinct.
  let s = 0;
  for (const p of patternsOf(shape)) s += expectedMatches(shape, p);
  return s * (shape.k / Math.max(1, shape.kDistinct ?? shape.k));
}

/** Patterns from the shape; hypothetical shapes (no patterns) get synthetic stand-ins. */
export function patternsOf(shape) {
  if (shape.patterns && shape.patterns.length) return shape.patterns;
  const k = Math.max(1, shape.kDistinct ?? shape.k ?? 1);
  return Array.from({ length: k }, () => '\u0000'.repeat(Math.max(1, Math.round(shape.mAvg || 1))));
}

/** Expected number of left-to-right character comparisons starting at a random position. */
function expectedPrefixRun(shape, p, cap = 16) {
  let e = 1, prob = 1;
  for (let i = 0; i < Math.min(p.length - 1, cap); i++) {
    prob *= fr(shape, p.charCodeAt(i));
    if (prob < 1e-6) break;
    e += prob;
  }
  return e;
}

/** Expected comparisons when verifying right-to-left from the second-to-last char. */
function expectedSuffixRun(shape, p, cap = 16) {
  let e = 1, prob = 1;
  const m = p.length;
  for (let i = m - 2; i >= Math.max(0, m - 1 - cap); i--) {
    prob *= fr(shape, p.charCodeAt(i));
    if (prob < 1e-6) break;
    e += prob;
  }
  return e;
}

/** Expected Horspool shift under the text's character distribution. */
export function expectedHorspoolShift(shape, p) {
  const m = p.length;
  const shift = new Map();
  for (let i = 0; i < m - 1; i++) shift.set(p.charCodeAt(i), m - 1 - i);
  let covered = 0, e = 0;
  for (const [c, s] of shift) {
    const f = fr(shape, c);
    covered += f;
    e += f * s;
  }
  e += Math.max(0, 1 - covered) * m;
  return Math.max(1, e);
}

function sumOver(shape, fn) {
  let s = 0;
  for (const p of patternsOf(shape)) s += fn(p);
  return s;
}

/* ------------------------------------------------------------------ */
/* Feature functions, one per atom family. Units: operations.          */
/* ------------------------------------------------------------------ */

export function naiveFeatures(shape) {
  const n = shape.n;
  return {
    scan: sumOver(shape, (p) => Math.max(0, n - p.length + 1) * expectedPrefixRun(shape, p)),
    out: totalMatches(shape),
  };
}

export function horspoolFeatures(shape) {
  return { ...memo(shape, 'horspool', () => horspoolRaw(shape)) };
}

function horspoolRaw(shape) {
  const n = shape.n;
  let windows = 0, verify = 0;
  for (const p of patternsOf(shape)) {
    if (p.length > n) continue;
    const w = (n - p.length + 1) / expectedHorspoolShift(shape, p);
    windows += w;
    verify += w * fr(shape, p.charCodeAt(p.length - 1)) * expectedSuffixRun(shape, p);
  }
  const S = (shape.patternSigma ?? 4) + 1;
  return { enc: n, scan: windows, verify, prep: shape.mSum + shape.kDistinct * S, out: totalMatches(shape) };
}

/** Boyer-Moore: same window model, good suffix makes shifts slightly larger on periodic input. */
export function boyerMooreFeatures(shape) {
  const f = horspoolFeatures(shape);
  return { enc: f.enc, scan: f.scan, verify: f.verify, prep: f.prep * 3, out: f.out };
}

export function hmbsFeatures(shape) {
  const n = shape.n;
  const S = (shape.patternSigma ?? 4) + 1;
  const b = bitsFor(S);
  const pc = pcOf(shape);
  let windows = 0, prep = 0, verify = 0;
  for (const p of patternsOf(shape)) {
    const m = p.length;
    if (m > n) continue;
    let q = Math.max(1, Math.min(8, Math.floor(14 / b), m));
    const span = m - q + 1;
    const pIn = Math.min(1, (m - q) * pc ** q);     // window q-gram occurs in p[0..m-2]
    const eShift = Math.max(1, (1 - pIn) * span + pIn * Math.max(1, span / 2));
    const w = (n - m + 1) / eShift;
    windows += w * q;                                 // q symbols hashed per window
    verify += w * pc ** q * Math.max(1, m - q) * 0.2;
    prep += (1 << (b * q)) + m;
  }
  return { enc: n, scan: windows, verify, prep, out: totalMatches(shape) };
}

export function shiftOrWords(shape) {
  let words = 0, used = 33;
  for (const p of patternsOf(shape)) {
    const w = Math.min(32, p.length);
    if (used + w > 32) { words++; used = 0; }
    used += w;
  }
  return words;
}

export function shiftOrFeatures(shape) {
  const words = shiftOrWords(shape);
  return { enc: shape.n, scan: shape.n * words, prep: shape.mSum, out: totalMatches(shape) };
}

export function kmpFeatures(shape) {
  const n = shape.n;
  return { enc: n, scan: n * Math.max(1, shape.kDistinct), prep: shape.mSum, out: totalMatches(shape) };
}

export function rabinKarpFeatures(shape) {
  const n = shape.n;
  // one rolling pass per distinct length; groups with >1 pattern also probe a hash table
  const groups = new Map();
  for (const p of patternsOf(shape)) groups.set(p.length, (groups.get(p.length) ?? 0) + 1);
  let scan = 0, probe = 0;
  for (const [m, count] of groups) {
    if (m > n) continue;
    scan += n - m + 1;
    if (count > 1) probe += n - m + 1;
  }
  return { enc: n, scan, probe, prep: shape.mSum, out: totalMatches(shape) };
}

export function ahoCorasickFeatures(shape) {
  const S = (shape.patternSigma ?? 4) + 1;
  const outs = totalMatches(shape);
  return { enc: shape.n, scan: shape.n, prep: (shape.mSum + 1) * S, out: outs };
}

export function wuManberFeatures(shape) {
  const n = shape.n;
  const S = (shape.patternSigma ?? 4) + 1;
  const b = bitsFor(S);
  const k = Math.max(1, shape.kDistinct);
  const lmin = Math.max(1, shape.mMin);
  const pc = pcOf(shape);
  let B = Math.max(1, Math.ceil(Math.log(2 * k * lmin) / Math.log(Math.max(2, S - 1))));
  B = Math.min(B, Math.max(1, Math.floor(16 / b)), lmin);
  const span = lmin - B + 1;
  const pBlock = Math.min(1, k * span * pc ** B);    // block known to SHIFT table
  const pZero = Math.min(1, k * pc ** B);            // block is a pattern-prefix end
  const eShift = Math.max(1, (1 - pBlock) * span + pBlock * Math.max(1, span / 3));
  const windows = n / eShift;
  return {
    enc: n,
    scan: windows * B,
    verify: windows * pZero * Math.max(1, k * pc ** B) * 2,
    prep: (1 << (b * B)) + shape.mSum,
    out: totalMatches(shape),
  };
}

/** Prefix-doubling rounds: classes become unique after ~2·log_{1/pc}(n) characters. */
export function doublingRounds(shape) {
  const n = Math.max(2, shape.n);
  const pc = pcOf(shape);
  const repeat = Math.max(2, (2 * Math.log(n)) / Math.max(1e-9, -Math.log(pc)));
  return Math.min(Math.ceil(log2(n)), Math.ceil(log2(repeat)) + 1);
}

export function suffixArrayFeatures(shape) {
  const n = shape.n;
  return {
    prep: n * (1 + doublingRounds(shape)),
    scan: sumOver(shape, (p) => p.length * log2(Math.max(2, n))),
    out: totalMatches(shape),
  };
}

export function fmIndexFeatures(shape) {
  const n = shape.n;
  return {
    prep: n * (1 + doublingRounds(shape)),
    enc: n,                                          // BWT + Occ construction
    scan: sumOver(shape, (p) => p.length * 64),      // 2 rank queries per char, ~32 cells each
    out: totalMatches(shape),
  };
}
