import { foldAscii } from './functions/alphabet.js';

/**
 * Data shape ("veri şekli") of an input: what the molecule looks at before
 * choosing an atom. Required by the assignment: n, σ, k, min/max/mean pattern
 * length. We add a few cheap extras the cost model uses.
 *
 * PATTERN: Builder. ShapeBuilder assembles the shape step by step
 *   (withPatterns → withText → build), so callers (molecule, benchmarks,
 *   tests) can build shapes from real or hypothetical inputs.
 * SOLID (S): computing the shape is separate from choosing an atom.
 *
 * Fields that are large or not JSON friendly (character frequencies, the
 * folded patterns) are attached as NON-ENUMERABLE properties: atoms can read
 * them in `features(shape)`, but they stay out of `record.shape` and JSON.
 */
const SAMPLE_LIMIT = 1 << 13, BLOCKS = 32, BLOCK = 256;
const SEEN = new Uint32Array(65536); // shared scratch table, always left all-zero

export class ShapeBuilder {
  #patterns = [];
  #ignoreCase = false;
  #text = '';

  withPatterns(patterns, ignoreCase = false) {
    this.#patterns = patterns;
    this.#ignoreCase = ignoreCase;
    return this;
  }

  withText(text) {
    this.#text = text ?? '';
    return this;
  }

  build() {
    const fold = this.#ignoreCase ? foldAscii : (s) => s;
    const text = fold(this.#text);
    const patterns = this.#patterns.map(fold);
    const n = text.length;

    // Text alphabet and character frequencies of the first record.
    // Texts up to 2^13 characters are scanned completely; longer texts are
    // sampled in 32 evenly spaced blocks of 256 characters (8 192 chars), so
    // the decision costs a few tens of µs instead of growing with n. σ is
    // then an estimate (a character rarer than ~1/8 192 can be missed);
    // `sampled: true` says so in the record.
    const chars = [];
    let counted = 0;
    const count = (from, to) => {
      for (let i = from; i < to; i++) {
        const c = text.charCodeAt(i);
        if (SEEN[c]++ === 0) chars.push(c);
      }
      counted += to - from;
    };
    const sampled = n > SAMPLE_LIMIT;
    if (!sampled) count(0, n);
    else {
      const step = Math.floor((n - BLOCK) / (BLOCKS - 1));
      for (let b = 0; b < BLOCKS; b++) count(b * step, b * step + BLOCK);
    }
    const sigma = chars.length;
    const freq = new Map();
    let collision = 0;
    for (const c of chars) {
      const f = SEEN[c] / counted;
      freq.set(c, f);
      collision += f * f;
      SEEN[c] = 0; // reset the shared counter table for the next call
    }

    const lens = patterns.map((p) => p.length);
    const k = patterns.length;
    const distinct = new Set(patterns);
    const patChars = new Set();
    for (const p of distinct) for (let i = 0; i < p.length; i++) patChars.add(p.charCodeAt(i));

    const shape = {
      n,
      sigma,
      k,
      kDistinct: distinct.size,
      mMin: k ? Math.min(...lens) : 0,
      mMax: k ? Math.max(...lens) : 0,
      mAvg: k ? round(lens.reduce((a, b) => a + b, 0) / k, 3) : 0,
      mSum: lens.reduce((a, b) => a + b, 0),
      distinctLengths: new Set(lens).size,
      patternSigma: patChars.size,
      collision: round(collision, 6), // Σ f(c)², probability that two random text chars are equal
      ignoreCase: this.#ignoreCase,
      sampled,
    };
    Object.defineProperty(shape, 'freq', { value: freq, enumerable: false });
    Object.defineProperty(shape, 'patterns', { value: [...distinct], enumerable: false });
    return shape;
  }
}

/** Shortcut used by the molecule. */
export function shapeOf(entry, params) {
  return new ShapeBuilder()
    .withPatterns(params.patterns, params.ignoreCase ?? false)
    .withText(entry ? entry.seq : '')
    .build();
}

function round(x, d) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
