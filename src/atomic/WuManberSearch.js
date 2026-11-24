import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareWuManber, searchWuManber } from '../functions/wuManber.js';
import { wuManberFeatures } from '../functions/costs.js';

/**
 * WuManberSearch: multi-pattern block-shift search. Brief group C (bonus atom).
 * Sublinear like Boyer-Moore while serving many patterns at once; weakens
 * when the shortest pattern is very short (the shift is limited by it).
 * Algorithm core: src/functions/wuManber.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class WuManberSearch extends ExactSearchAtom {
  static manifest = {
    name: 'WuManberSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Wu-Manber)', references: ['Wu & Manber 1994'],
  };

  static selection = {
    features: wuManberFeatures,
    defaults: { enc: 2e-9, scan: 2e-9, verify: 3e-9, prep: 1e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.prep = prepareWuManber(patterns.map((p) => encodePattern(p, this.alpha)), this.alpha.size);
  }

  search(text, hits) {
    if (this.prep.lmin > text.length && this.unique.every((p) => p.length > text.length)) return;
    const t = encodeText(text, this.alpha);
    searchWuManber(t, text.length, this.prep, (u, pos) => hits.add(u, pos));
  }
}
