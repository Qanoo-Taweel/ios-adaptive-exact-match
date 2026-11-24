// Contract tests (§4): every registered atom must pass all of them.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registry } from '../../src/registry.js';
import { ExactSearchAtom, TASK } from '../../src/atomic/ExactSearchAtom.js';
import { E, positions, runAtom, indexOfReference } from '../helpers.js';

for (const A of registry.atoms()) {
  const name = A.manifest.name;
  describe(`contract: ${name}`, () => {
    it('has a complete manifest and selection block', () => {
      const m = A.manifest;
      assert.equal(m.kind, 'atom');
      assert.equal(m.task, TASK);
      assert.equal(typeof m.version, 'string');
      assert.equal(typeof m.title, 'string');
      assert.ok(Array.isArray(m.references) && m.references.length > 0);
      assert.ok(A.prototype instanceof ExactSearchAtom);
      assert.equal(typeof A.selection.features, 'function');
      assert.equal(typeof A.selection.defaults, 'object');
    });

    it('reports overlapping matches (AAAAA / AA → 0,1,2,3)', () => {
      assert.deepEqual(positions(runAtom(A, E('AAAAA'), ['AA'])), [0, 1, 2, 3]);
    });

    it('orders by record, then position, then pattern index', () => {
      const entries = [{ header: '>r1', seq: 'ACGTAC' }, { header: '>r2', seq: 'TACG' }];
      const got = runAtom(A, entries, ['AC', 'A', 'TAC']).map((m) => [m.header, m.position, m.pattern]);
      assert.deepEqual(got, [
        ['>r1', 0, 'AC'], ['>r1', 0, 'A'], ['>r1', 3, 'TAC'], ['>r1', 4, 'AC'], ['>r1', 4, 'A'],
        ['>r2', 0, 'TAC'], ['>r2', 1, 'AC'], ['>r2', 1, 'A'],
      ]);
    });

    it('reports a duplicated pattern once per copy', () => {
      const got = runAtom(A, E('GATTACA'), ['TA', 'A', 'TA']).map((m) => [m.position, m.pattern]);
      assert.deepEqual(got, [[1, 'A'], [3, 'TA'], [3, 'TA'], [4, 'A'], [6, 'A']]);
    });

    it('ignoreCase folds ASCII only and reports the pattern as given', () => {
      const got = runAtom(A, E('acGTÉé'), ['ACgt', 'é'], true);
      assert.deepEqual(got, [
        { header: '>t', pattern: 'ACgt', position: 0, length: 4 },
        { header: '>t', pattern: 'é', position: 5, length: 1 },
      ]);
      assert.deepEqual(runAtom(A, E('acgt'), ['ACGT'], false), []);
    });

    it('positions are UTF-16 code units', () => {
      const seq = '😀AB😀AB';
      assert.deepEqual(positions(runAtom(A, E(seq), ['AB'])), [2, 6]);
      assert.deepEqual(positions(runAtom(A, E(seq), ['😀'])), [0, 4]);
    });

    it('empty text or pattern longer than text gives no result (no error)', () => {
      assert.deepEqual(runAtom(A, E(''), ['A']), []);
      assert.deepEqual(runAtom(A, E('ACG'), ['ACGT']), []);
      assert.deepEqual(runAtom(A, E('ACG'), ['ACGT', 'CG']).map((m) => m.position), [1]);
    });

    it('throws on an empty pattern list or an empty pattern', () => {
      assert.throws(() => new A({ patterns: [] }));
      assert.throws(() => new A({ patterns: ['A', ''] }));
      assert.throws(() => new A({}));
    });

    it('is deterministic and reusable across calls', () => {
      const atom = new A({ patterns: ['GG', 'G'] });
      const a = [...atom.process({ header: '>x', seq: 'AGGGTG' })];
      const b = [...atom.process({ header: '>x', seq: 'AGGGTG' })];
      assert.deepEqual(a, b);
      assert.deepEqual(a, indexOfReference(E('AGGGTG', '>x'), ['GG', 'G']));
    });

    it('long-text sanity against the reference', () => {
      const seq = 'ACGT'.repeat(500) + 'TTTT' + 'GATTACA'.repeat(100);
      const pats = ['ACGTACGT', 'TTTT', 'ATTACAG', 'A', 'CGTT'];
      assert.deepEqual(runAtom(A, E(seq), pats), indexOfReference(E(seq), pats));
    });
  });
}

describe('contract: source rules', () => {
  const FORBIDDEN = /\.(indexOf|lastIndexOf|includes|startsWith|endsWith|search|match|matchAll|split)\s*\(|RegExp|\/[^/\n*]+\/[gimsuy]*\.test\(|console\.|require\(|from 'node:|fetch\(/;
  for (const A of registry.atoms()) {
    if (A.manifest.name === 'NaiveSearch') continue; // the oracle may use built-ins (it does not)
    it(`${A.manifest.name} and its core modules use no built-in search, no console, no I/O`, async () => {
      const file = new URL(`../../src/atomic/${A.manifest.name}.js`, import.meta.url);
      const src = readFileSync(fileURLToPath(file), 'utf8');
      const mods = [...src.matchAll(/from '\.\.\/functions\/(\w+)\.js'/g)].map((m) => m[1]);
      for (const mod of ['alphabet', 'hits', ...mods]) {
        const code = readFileSync(fileURLToPath(new URL(`../../src/functions/${mod}.js`, import.meta.url)), 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        assert.doesNotMatch(code, FORBIDDEN, `forbidden call in src/functions/${mod}.js`);
      }
      const own = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      assert.doesNotMatch(own, FORBIDDEN);
    });
  }
  it('base class uses no built-in search either', () => {
    const code = readFileSync(fileURLToPath(new URL('../../src/atomic/ExactSearchAtom.js', import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, FORBIDDEN);
  });
});
