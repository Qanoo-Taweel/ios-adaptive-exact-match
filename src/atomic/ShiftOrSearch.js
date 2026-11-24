import { ExactSearchAtom, TASK } from './ExactSearchAtom.js';
import { buildAlphabet, encodeText, encodePattern } from '../functions/alphabet.js';
import { prepareShiftOr, searchShiftOr } from '../functions/shiftOr.js';
import { shiftOrFeatures } from '../functions/costs.js';

/**
 * ShiftOrSearch: bit-parallel Shift-Or. Brief group A.
 * One pass per 32-bit word; short patterns are packed several per word.
 * Algorithm core: src/functions/shiftOr.js
 *
 * PATTERN: Strategy + Template Method (see ExactSearchAtom).
 * Selection: declares itself NOT applicable when a pattern is longer than
 * 32 (the word size). It still answers correctly when forced.
 */
export class ShiftOrSearch extends ExactSearchAtom {
  static manifest = {
    name: 'ShiftOrSearch', version: '0.1.0', kind: 'atom', task: TASK,
    title: 'Exact match (Shift-Or, bit parallel)', references: ['Baeza-Yates & Gonnet 1992'],
  };

  static selection = {
    features: shiftOrFeatures,
    defaults: { enc: 2e-9, scan: 1.5e-9, prep: 2e-9, out: 6e-8 },
    applicable(shape) {
      return shape.mMax <= 32 ? true : `longest pattern has ${shape.mMax} > 32 characters (one machine word)`;
    },
  };

  prepare(patterns) {
    this.alpha = buildAlphabet(patterns);
    this.prep = prepareShiftOr(patterns.map((p) => encodePattern(p, this.alpha)), this.alpha.size);
  }

  search(text, hits) {
    const t = encodeText(text, this.alpha);
    searchShiftOr(t, text.length, this.prep, (u, pos) => hits.add(u, pos));
  }
}
