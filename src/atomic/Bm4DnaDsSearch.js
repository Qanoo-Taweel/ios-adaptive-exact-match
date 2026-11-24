import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareDS, searchDS } from '../functions/bm4DNADS.js';
import { horspoolFeatures } from '../functions/costs.js';

/**
 * Bm4DnaDsSearch: Sentinel + 3× unrolled skip loop. Allmer recommends it for short DNA patterns (m < 50).
 * Brief group: A. Algorithm core: src/functions/bm4DNADS.js
 *
 * PATTERN: Strategy (concrete strategy of ExactSearchAtom) +
 *          Template Method (fills the prepare/search hooks only).
 * SOLID (O, open/closed): registered in src/registry.js; the molecule never
 *          names this class.
 */
export class Bm4DnaDsSearch extends ExactSearchAtom {
  static manifest = {
    name: 'Bm4DnaDsSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (bm4DNADS, tuned Boyer-Moore)', references: ['Allmer 2016', 'Hume & Sunday 1991'],
  };

  static selection = {
    features: horspoolFeatures,
    defaults: { enc: 2e-9, scan: 2e-9, verify: 3e-9, prep: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.preps = patterns.map((p) => prepareDS(encodePattern(p, this.alpha), this.alpha.size));
  }

  search(text, hits) {
    const n = text.length;
    // One encoded buffer with a sentinel zone of mMax cells; before each
    // pattern the zone is refilled with that pattern's last code.
    let mMax = 0;
    for (const pr of this.preps) if (pr.m > mMax) mMax = pr.m;
    const t = encodeText(text, this.alpha, mMax);
    for (let u = 0; u < this.preps.length; u++) {
      const pr = this.preps[u];
      if (pr.m > n) continue;
      t.fill(pr.last, n, n + pr.m);
      searchDS(t, n, pr, (pos) => hits.add(u, pos));
    }
  }
}
