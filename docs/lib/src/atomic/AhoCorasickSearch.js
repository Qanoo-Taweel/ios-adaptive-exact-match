import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareAhoCorasick, searchAhoCorasick } from '../functions/ahoCorasick.js';
import { ahoCorasickFeatures } from '../functions/costs.js';

/**
 * AhoCorasickSearch: all patterns in one pass through a DFA. Brief group C.
 * Cost is independent of k during the scan, so it wins with many patterns.
 * Algorithm core: src/functions/ahoCorasick.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class AhoCorasickSearch extends ExactSearchAtom {
  static manifest = {
    name: 'AhoCorasickSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Aho-Corasick)', references: ['Aho & Corasick 1975'],
  };

  static selection = {
    features: ahoCorasickFeatures,
    defaults: { enc: 2e-9, scan: 3e-9, prep: 1e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.prep = prepareAhoCorasick(patterns.map((p) => encodePattern(p, this.alpha)), this.alpha.size);
  }

  findAll(text, hits) {
    const t = encodeText(text, this.alpha);
    searchAhoCorasick(t, text.length, this.prep, (u, pos) => hits.add(u, pos));
  }
}
