import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareKMP, searchKMP } from '../functions/kmp.js';
import { kmpFeatures } from '../functions/costs.js';

/**
 * KmpSearch: Knuth-Morris-Pratt. Brief group B. Linear worst case, never
 * re-reads the text; wins on highly periodic text where shift-based
 * algorithms collapse to shift 1. Algorithm core: src/functions/kmp.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class KmpSearch extends ExactSearchAtom {
  static manifest = {
    name: 'KmpSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Knuth-Morris-Pratt)', references: ['Knuth, Morris & Pratt 1977'],
  };

  static selection = {
    features: kmpFeatures,
    defaults: { enc: 2e-9, scan: 3e-9, prep: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.preps = patterns.map((p) => prepareKMP(encodePattern(p, this.alpha)));
  }

  search(text, hits) {
    const n = text.length;
    const t = encodeText(text, this.alpha);
    for (let u = 0; u < this.preps.length; u++) {
      if (this.preps[u].m > n) continue;
      searchKMP(t, n, this.preps[u], (pos) => hits.add(u, pos));
    }
  }
}
