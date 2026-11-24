import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareHorspool, searchHorspool } from '../functions/horspool.js';
import { horspoolFeatures } from '../functions/costs.js';

/**
 * HorspoolSearch: Bad-character shift on the last window character only. Strong on medium/long patterns over larger alphabets.
 * Brief group: A. Algorithm core: src/functions/horspool.js
 *
 * PATTERN: Strategy (concrete strategy of ExactSearchAtom) +
 *          Template Method (fills the prepare/search hooks only).
 * SOLID (O, open/closed): registered in src/registry.js; the molecule never
 *          names this class.
 */
export class HorspoolSearch extends ExactSearchAtom {
  static manifest = {
    name: 'HorspoolSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Horspool)', references: ['Horspool 1980'],
  };

  static selection = {
    features: horspoolFeatures,
    defaults: { enc: 2e-9, scan: 3e-9, verify: 3e-9, prep: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.preps = patterns.map((p) => prepareHorspool(encodePattern(p, this.alpha), this.alpha.size));
  }

  findAll(text, hits) {
    const n = text.length;
    const t = encodeText(text, this.alpha);
    for (let u = 0; u < this.preps.length; u++) {
      const pr = this.preps[u];
      if (pr.m > n) continue;
      searchHorspool(t, n, pr, (pos) => hits.add(u, pos));
    }
  }
}
