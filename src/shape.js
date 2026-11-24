import { foldAscii } from './functions/alphabet.js';

/**
 * Data shape ("veri şekli") of an input: what the molecule looks at before
 * choosing an atom. Required by the brief: n, σ, k, min/max/mean pattern
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

    // Text alphabet and character frequencies (one pass over the first record).
    const counts = new Map();
    const seen = new Uint32Array(65536);
    for (let i = 0; i < n; i++) seen[text.charCodeAt(i)]++;
    let sigma = 0;
    for (let c = 0; c < 65536; c++) {
      if (seen[c] !== 0) { sigma++; counts.set(c, seen[c]); }
    }
    const freq = new Map();
    let collision = 0;
    for (const [c, cnt] of counts) {
      const f = cnt / n;
      freq.set(c, f);
      collision += f * f;
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
