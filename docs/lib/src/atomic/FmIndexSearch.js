import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { buildFMIndex, searchFMIndex } from '../functions/fmIndex.js';
import { fmIndexFeatures } from '../functions/costs.js';

/**
 * FmIndexSearch: BWT + backward search. Assignment group D (bonus atom).
 * Counting a pattern costs O(m) whatever n is; building the index costs the
 * suffix array plus O(n). Algorithm core: src/functions/fmIndex.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class FmIndexSearch extends ExactSearchAtom {
  static manifest = {
    name: 'FmIndexSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (FM-index, backward search)', references: ['Ferragina & Manzini 2000'],
  };

  static selection = {
    features: fmIndexFeatures,
    defaults: { index: 3e-8, enc: 1e-8, scan: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.encoded = patterns.map((p) => encodePattern(p, this.alpha));
  }

  findAll(text, hits) {
    const n = text.length;
    if (this.unique.every((p) => p.length > n)) return;
    const t = encodeText(text, this.alpha);
    const fm = buildFMIndex(t, n, this.alpha.size);
    searchFMIndex(fm, this.encoded, n, (u, pos) => hits.add(u, pos));
  }
}
