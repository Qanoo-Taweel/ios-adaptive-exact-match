import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareRabinKarp, searchRabinKarp } from '../functions/rabinKarp.js';
import { rabinKarpFeatures } from '../functions/costs.js';

/**
 * RabinKarpSearch: rolling hash, one pass per distinct pattern LENGTH
 * (all patterns of that length share it). Brief group B.
 * Equal hashes are always verified. Algorithm core: src/functions/rabinKarp.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 */
export class RabinKarpSearch extends ExactSearchAtom {
  static manifest = {
    name: 'RabinKarpSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Rabin-Karp)', references: ['Karp & Rabin 1987'],
  };

  static selection = {
    features: rabinKarpFeatures,
    defaults: { enc: 2e-9, scan: 3e-9, verify: 2e-9, prep: 2e-9, out: 6e-8 },
    applicable() { return true; },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.prep = prepareRabinKarp(patterns.map((p) => encodePattern(p, this.alpha)));
  }

  search(text, hits) {
    const t = encodeText(text, this.alpha);
    searchRabinKarp(t, text.length, this.prep, (u, pos) => hits.add(u, pos));
  }
}
