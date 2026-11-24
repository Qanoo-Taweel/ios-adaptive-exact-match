import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFasta } from '../src/fasta.js';
import { registry } from '../src/registry.js';
import { NaiveSearch } from '../src/atomic/NaiveSearch.js';

const here = dirname(fileURLToPath(import.meta.url));

export function loadFasta(name) {
  return readFasta(readFileSync(join(here, 'data', name), 'utf8'));
}

/** Every registered atom class except the oracle itself. */
export function atomsUnderTest() {
  return registry.atoms().filter((A) => A !== NaiveSearch);
}

export function runAtom(A, entries, patterns, ignoreCase = false) {
  return [...new A({ patterns, ignoreCase }).run(entries)];
}

export function oracle(entries, patterns, ignoreCase = false) {
  return runAtom(NaiveSearch, entries, patterns, ignoreCase);
}

/**
 * Second, fully independent reference built on String.prototype.indexOf
 * (allowed in tests only). Used to check the oracle itself.
 */
export function indexOfReference(entries, patterns, ignoreCase = false) {
  const fold = (s) => (ignoreCase ? s.replace(/[a-z]/g, (c) => c.toUpperCase()) : s);
  const out = [];
  for (const e of entries) {
    const t = fold(e.seq);
    const hits = [];
    patterns.forEach((p, pi) => {
      const fp = fold(p);
      for (let i = t.indexOf(fp); i !== -1; i = t.indexOf(fp, i + 1)) hits.push([i, pi]);
    });
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [i, pi] of hits) out.push({ header: e.header, pattern: patterns[pi], position: i, length: patterns[pi].length });
  }
  return out;
}

export const E = (seq, header = '>t') => [{ header, seq }];
export const positions = (matches) => matches.map((m) => m.position);
