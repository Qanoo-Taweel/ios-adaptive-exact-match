import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { searchNaive } from '../functions/naive.js';
import { naiveFeatures } from '../functions/costs.js';

/**
 * NaiveSearch: brute force reference (test oracle).
 * It is registered so it can be forced (`--strategy NaiveSearch`), but it
 * declares itself not applicable for automatic selection.
 */
export class NaiveSearch extends ExactSearchAtom {
  static manifest = {
    name: 'NaiveSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (brute force oracle)', references: ['Charras & Lecroq, Exact String Matching Algorithms'],
  };

  static selection = {
    features: naiveFeatures,
    defaults: { scan: 2.5e-9, out: 6e-8 },
    applicable() { return 'reference oracle (O(n·m) brute force); used only for testing or when forced'; },
  };

  search(text, hits) {
    const pats = this.unique;
    for (let u = 0; u < pats.length; u++) searchNaive(text, pats[u], (pos) => hits.add(u, pos));
  }
}
