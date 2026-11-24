import { foldAscii } from '../functions/alphabet.js';
import { HitCollector } from '../functions/hits.js';

export const TASK = 'sequence.pattern-match.exact';

/**
 * ExactSearchAtom: common base of every atom of task `sequence.pattern-match.exact`.
 *
 * PATTERN: Template Method. `process()` is the fixed algorithm skeleton
 *   (validate entry → fold case → call the hook `search()` → order and emit).
 *   Subclasses only fill in two hooks: `prepare(patterns)` (once, in the
 *   constructor) and `search(text, hits)` (per entry).
 * PATTERN: Strategy. Every subclass is an interchangeable strategy for the same
 *   task; the molecule talks only to this type.
 * SOLID (L, Liskov): any subclass can replace any other; contract tests run on
 *   every registered atom to prove it.
 * SOLID (S, single responsibility): the base owns the contract (validation,
 *   ignoreCase, ordering, duplicates); subclasses own only their algorithm.
 *
 * Rules (contract §4.3): no console output, no file or network access,
 * deterministic, and no built-in search helpers (indexOf, includes,
 * startsWith, RegExp…) inside atoms.
 */
export class ExactSearchAtom {
  static manifest = {
    name: 'ExactSearchAtom', version: '0.1.0', kind: 'abstract',
    task: TASK, title: 'Exact match (abstract base)', references: [],
  };

  /** Selection metadata read by the ExactMatch molecule. */
  static selection = {
    features() { return {}; },
    defaults: {},
    applicable() { return true; },
  };

  /**
   * @param {{patterns:string[], ignoreCase?:boolean}} params
   */
  constructor(params) {
    const { patterns, ignoreCase = false } = ExactSearchAtom.validateParams(params);
    this.params = Object.freeze({ patterns: Object.freeze([...patterns]), ignoreCase });
    this.original = this.params.patterns;
    this.ignoreCase = ignoreCase;

    // De-duplicate (after case folding) so each distinct pattern is searched once.
    const folded = ignoreCase ? patterns.map(foldAscii) : patterns;
    const index = new Map();
    this.unique = [];
    this.owners = [];
    folded.forEach((p, i) => {
      let u = index.get(p);
      if (u === undefined) {
        u = this.unique.length;
        index.set(p, u);
        this.unique.push(p);
        this.owners.push([]);
      }
      this.owners[u].push(i);
    });
    this.prepare(this.unique);
  }

  static validateParams(params) {
    if (params === null || typeof params !== 'object') {
      throw new TypeError('params must be an object: { patterns: string[], ignoreCase?: boolean }');
    }
    const { patterns, ignoreCase = false } = params;
    if (!Array.isArray(patterns)) throw new TypeError('params.patterns must be an array of strings');
    if (patterns.length === 0) throw new RangeError('params.patterns must not be empty');
    patterns.forEach((p, i) => {
      if (typeof p !== 'string') throw new TypeError(`patterns[${i}] is not a string`);
      if (p.length === 0) throw new RangeError(`patterns[${i}] is the empty string`);
    });
    if (typeof ignoreCase !== 'boolean') throw new TypeError('params.ignoreCase must be a boolean');
    return { patterns, ignoreCase };
  }

  /** Hook: pre-process the distinct (case-folded) patterns once. */
  prepare(_patterns) { /* overridden by subclasses */ }

  /**
   * Hook: find every occurrence of every unique pattern in `text` and report
   * it with `hits.add(uniqueIndex, position)`. Order does not matter.
   * @abstract
   */
  search(_text, _hits) {
    throw new Error(`${this.constructor.name}.search() is not implemented`);
  }

  /** Template method. Produces Sequence.Match objects for one FASTA.Entry. */
  *process(entry) {
    if (entry === null || typeof entry !== 'object' || typeof entry.seq !== 'string') {
      throw new TypeError('entry must be a FASTA.Entry: { header: string, seq: string }');
    }
    const header = entry.header;
    const text = this.ignoreCase ? foldAscii(entry.seq) : entry.seq;
    if (text.length === 0) return;
    const hits = new HitCollector(this.original.length, this.owners);
    this.search(text, hits);
    const pats = this.original;
    for (const [position, idx] of hits.ordered()) {
      yield { header, pattern: pats[idx], position, length: pats[idx].length };
    }
  }

  /** Convenience: process a whole stream of entries. */
  *run(entries) {
    for (const e of entries) yield* this.process(e);
  }
}
