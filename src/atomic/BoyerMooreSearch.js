import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareBoyerMoore, searchBoyerMoore } from '../functions/boyerMoore.js';
import { boyerMooreFeatures } from '../functions/costs.js';

/**
 * BoyerMooreSearch: Bad character + strong good suffix. The complete example atom of the starter package.
 * Brief group: given example. Algorithm core: src/functions/boyerMoore.js
 *
 * PATTERN: Strategy (concrete strategy of ExactSearchAtom) +
 *          Template Method (fills the prepare/search hooks only).
 * SOLID (O, open/closed): registered in src/registry.js; the molecule never
 *          names this class.
 */
export class BoyerMooreSearch extends ExactSearchAtom {
  static manifest = {
    name: 'BoyerMooreSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Boyer-Moore)', references: ['Boyer & Moore 1977'],
  };

  static selection = {
    features: boyerMooreFeatures,
    defaults: { enc: 2e-9, scan: 4e-9, verify: 4e-9, prep: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.preps = patterns.map((p) => prepareBoyerMoore(encodePattern(p, this.alpha), this.alpha.size));
  }

  findAll(text, hits) {
    const n = text.length;
    const t = encodeText(text, this.alpha);
    for (let u = 0; u < this.preps.length; u++) {
      const pr = this.preps[u];
      if (pr.m > n) continue;
      searchBoyerMoore(t, n, pr, (pos) => hits.add(u, pos));
    }
  }
}
