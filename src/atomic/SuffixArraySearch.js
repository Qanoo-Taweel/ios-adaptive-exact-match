import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { buildSuffixArray, searchSuffixArray } from '../functions/suffixArray.js';
import { suffixArrayFeatures } from '../functions/costs.js';

/**
 * SuffixArraySearch: index the TEXT once (prefix doubling), then answer every
 * pattern by binary search. Brief group D. Pays O(n log n) up front, so it
 * only wins with many patterns on a short text.
 * Algorithm core: src/functions/suffixArray.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class SuffixArraySearch extends ExactSearchAtom {
  static manifest = {
    name: 'SuffixArraySearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (suffix array + binary search)', references: ['Manber & Myers 1993'],
  };

  static selection = {
    features: suffixArrayFeatures,
    defaults: { prep: 3e-8, scan: 5e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.encoded = patterns.map((p) => encodePattern(p, this.alpha));
  }

  search(text, hits) {
    const n = text.length;
    if (this.unique.every((p) => p.length > n)) return;
    const t = encodeText(text, this.alpha);
    const sa = buildSuffixArray(t, this.alpha.size);
    searchSuffixArray(t, n, sa, this.encoded, (u, pos) => hits.add(u, pos));
  }
}
