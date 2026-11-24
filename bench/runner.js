/**
 * Shared measurement code for calibration and validation.
 */
import { registry } from '../src/registry.js';
import { ShapeBuilder } from '../src/shape.js';
import { measure, drain } from './timing.js';

/** Atoms that take part in timing (the oracle is excluded: it is never auto-selected). */
export function timedAtoms(reg = registry) {
  return reg.atoms().filter((A) => A.manifest.name !== 'NaiveSearch');
}

/**
 * Measures every atom on one case. Each run = construct atom (pattern
 * preprocessing) + process every entry + consume every match.
 * Also checks that all atoms return the same number of matches.
 */
export function measureCase(entries, patterns, { reps = 3, warmup = 1, ignoreCase = false } = {}) {
  const times = {};
  const counts = {};
  for (const A of timedAtoms()) {
    const name = A.manifest.name;
    const r = measure(() => drain(new A({ patterns, ignoreCase }).run(entries)), { reps, warmup });
    times[name] = round(r.ms, 4);
    counts[name] = r.result;
  }
  const distinct = new Set(Object.values(counts));
  if (distinct.size !== 1) throw new Error('atoms disagree on match counts: ' + JSON.stringify(counts));
  const shape = new ShapeBuilder().withPatterns(patterns, ignoreCase).withText(entries[0]?.seq ?? '').build();
  return { times, matches: [...distinct][0], shape };
}

export function featuresFor(shape) {
  const out = {};
  for (const A of timedAtoms()) out[A.manifest.name] = A.selection.features(shape);
  return out;
}

export const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;

/** Rebuilds a shape object (with hidden fields) from stored case data. */
export function rebuildShape(caseData, entries) {
  return new ShapeBuilder().withPatterns(caseData.patterns, caseData.ignoreCase ?? false).withText(entries[0]?.seq ?? '').build();
}
