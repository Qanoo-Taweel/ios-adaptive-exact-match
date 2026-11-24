// Task 3: ExactMatch molecule and selection.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExactMatch } from '../../src/molecules/ExactMatch.js';
import { registry, AtomRegistry } from '../../src/registry.js';
import { ExactSearchAtom, TASK } from '../../src/atomic/ExactSearchAtom.js';
import { NaiveSearch } from '../../src/atomic/NaiveSearch.js';
import { CostModel } from '../../src/selection/CostModel.js';
import { ShapeBuilder } from '../../src/shape.js';
import { loadFasta, oracle } from '../helpers.js';
import { mulberry32, randomText, makePatterns, toEntries } from '../../bench/data.js';

const lambda = loadFasta('lambda.fasta');
const ecoli = loadFasta('ecoli-proteins.fasta');

/** A fake atom defined only inside this test file. */
function fakeAtom(name, { cost = 1e-15, applicable = true } = {}) {
  return class extends NaiveSearch {
    static manifest = { name, version: '0.0.1', kind: 'atom', task: TASK, title: `fake ${name}`, references: ['test'] };
    static selection = { features: () => ({ unit: 1 }), defaults: { unit: cost }, applicable: () => applicable };
  };
}

describe('ExactMatch: record', () => {
  it('contains requested, selected, shape, estimates and why', () => {
    const em = new ExactMatch({ patterns: ['GAATTC', 'GGATCC'], ignoreCase: false, strategy: 'auto' });
    const out = [...em.run(lambda)];
    const r = em.record;
    for (const key of ['requested', 'selected', 'shape', 'estimates', 'why']) assert.ok(key in r, key);
    assert.equal(r.requested, 'auto');
    assert.ok(registry.has(r.selected));
    for (const key of ['n', 'sigma', 'k', 'mMin', 'mMax', 'mAvg']) assert.equal(typeof r.shape[key], 'number', key);
    assert.equal(r.shape.n, 48502);
    assert.equal(r.shape.sigma, 4);
    assert.equal(r.shape.k, 2);
    assert.deepEqual([r.shape.mMin, r.shape.mMax, r.shape.mAvg], [6, 6, 6]);
    assert.deepEqual(Object.keys(r.estimates).sort(), registry.names().sort());
    assert.equal(typeof r.why, 'string');
    assert.ok(r.why.length > 20);
    assert.deepEqual(out, oracle(lambda, ['GAATTC', 'GGATCC']));
    // record is plain JSON
    assert.doesNotThrow(() => JSON.parse(JSON.stringify(r)));
  });

  it('selects the atom with the cheapest estimate', () => {
    for (const [entries, pats] of [
      [lambda, ['GAATTC']],
      [lambda, Array.from({ length: 80 }, (_, i) => lambda[0].seq.slice(i * 500, i * 500 + 10))],
      [ecoli, ['MKK', 'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL']],
    ]) {
      const em = new ExactMatch({ patterns: pats });
      const r = em.decide(entries[0]);
      const finite = Object.entries(r.estimates).filter(([, v]) => v !== null);
      const min = Math.min(...finite.map(([, v]) => v));
      assert.equal(r.estimates[r.selected], min);
      assert.equal(r.ranking[0], r.selected);
    }
  });

  it('decides on the FIRST record and keeps the atom for the whole stream', () => {
    const entries = [{ header: '>tiny', seq: 'ACGT' }, ...lambda];
    const em = new ExactMatch({ patterns: ['ACGT'] });
    const gen = em.run(entries);
    gen.next();
    const first = em.record.selected;
    assert.equal(em.record.shape.n, 4);
    [...gen];
    assert.equal(em.record.selected, first);
    assert.equal(em.atom.constructor.manifest.name, first);
  });

  it('empty stream: no matches, still a record', () => {
    const em = new ExactMatch({ patterns: ['A'] });
    assert.deepEqual([...em.run([])], []);
    assert.equal(em.record.shape.n, 0);
    assert.ok(em.record.selected);
  });

  it('rejects bad parameters like an atom does', () => {
    assert.throws(() => new ExactMatch({ patterns: [] }));
    assert.throws(() => new ExactMatch({ patterns: [''] }));
  });
});

describe('ExactMatch: forced strategies', () => {
  const rng = mulberry32(99);
  const text = randomText('dna', 30000, rng);
  const entries = toEntries(text, 3, 'forced');
  const pats = [...makePatterns(text, 'dna', 5, 9, rng), 'ACGT', 'ACGT', 'A'.repeat(40)];
  const expected = oracle(entries, pats);

  for (const name of registry.names()) {
    it(`strategy '${name}' gives the oracle's result`, () => {
      const em = new ExactMatch({ patterns: pats, strategy: name });
      assert.deepEqual([...em.run(entries)], expected);
      assert.equal(em.record.selected, name);
      assert.equal(em.record.requested, name);
    });
  }

  it('auto gives the oracle result on real data too', () => {
    const pats2 = ['MKK', 'GG', 'LLL', 'MKK'];
    assert.deepEqual([...new ExactMatch({ patterns: pats2, ignoreCase: true }).run(ecoli)], oracle(ecoli, pats2, true));
  });

  it('unknown strategy throws and lists the valid options', () => {
    assert.throws(() => new ExactMatch({ patterns: ['A'], strategy: 'Quantum' }), (e) => {
      assert.match(e.message, /Quantum/);
      for (const n of registry.names()) assert.ok(e.message.includes(n), n);
      assert.match(e.message, /auto/);
      return true;
    });
  });
});

describe('ExactMatch: extensibility (molecule code unchanged)', () => {
  it('a fake atom added to the registry inside the test can be selected', () => {
    const reg = registry.clone();
    const Fake = fakeAtom('FakeTurboSearch');
    reg.register(Fake);
    const em = new ExactMatch({ patterns: ['ACGT'] }, { registry: reg });
    const out = [...em.run(lambda)];
    assert.equal(em.record.selected, 'FakeTurboSearch');
    assert.equal(em.record.estimates.FakeTurboSearch, 1e-12);
    assert.deepEqual(out, oracle(lambda, ['ACGT']));
    // and it is also forceable by name
    assert.equal(new ExactMatch({ patterns: ['A'], strategy: 'FakeTurboSearch' }, { registry: reg }).decide(lambda[0]).selected, 'FakeTurboSearch');
  });

  it('the fake atom also works through the global registerAtom()', async () => {
    const { registerAtom } = await import('../../src/registry.js');
    const Fake = fakeAtom('FakeGlobalSearch');
    registerAtom(Fake);
    try {
      const em = new ExactMatch({ patterns: ['GG'] });
      em.decide(lambda[0]);
      assert.equal(em.record.selected, 'FakeGlobalSearch');
    } finally {
      registry.unregister('FakeGlobalSearch');
    }
    assert.ok(!registry.has('FakeGlobalSearch'));
  });

  it('an atom that declares itself not applicable is never selected', () => {
    const reg = registry.clone();
    reg.register(fakeAtom('FakeBrokenSearch', { cost: 0, applicable: 'only works on Tuesdays' }));
    const rng = mulberry32(5);
    for (let i = 0; i < 25; i++) {
      const alpha = ['dna', 'protein', 'text'][i % 3];
      const t = randomText(alpha, 200 + ((rng() * 5000) | 0), rng);
      const em = new ExactMatch({ patterns: makePatterns(t, alpha, 1 + i, 3 + i, rng) }, { registry: reg });
      const r = em.decide({ header: '>x', seq: t });
      assert.notEqual(r.selected, 'FakeBrokenSearch');
      assert.equal(r.estimates.FakeBrokenSearch, null);
      assert.equal(r.excluded.FakeBrokenSearch, 'only works on Tuesdays');
    }
  });

  it('NaiveSearch (oracle) is never auto-selected; ShiftOr is skipped when m > 32', () => {
    const em = new ExactMatch({ patterns: ['A'.repeat(33)] });
    const r = em.decide(lambda[0]);
    assert.ok(r.excluded.NaiveSearch);
    assert.ok(r.excluded.ShiftOrSearch);
    assert.notEqual(r.selected, 'ShiftOrSearch');
  });

  it('dependency injection: a custom cost model changes the decision', () => {
    const atomsCal = {};
    for (const n of registry.names()) atomsCal[n] = { coef: { enc: 1, scan: 1, prep: 1, out: 1, verify: 1 } };
    atomsCal.KmpSearch = { coef: {} }; // free → must win
    const em = new ExactMatch({ patterns: ['GAATTC'] }, { costModel: new CostModel({ meta: { version: 'test' }, atoms: atomsCal }) });
    assert.equal(em.decide(lambda[0]).selected, 'KmpSearch');
  });

  it('registry rejects malformed atoms', () => {
    const reg = new AtomRegistry();
    assert.throws(() => reg.register(class {}));
    assert.throws(() => reg.register(class extends ExactSearchAtom { static manifest = { name: 'X', kind: 'atom', task: 'other' }; }));
  });
});

describe('shape', () => {
  it('has n, σ, k and pattern length statistics', () => {
    const s = new ShapeBuilder().withPatterns(['AC', 'ACGTA', 'ac'], true).withText('acgtnACGTN').build();
    assert.deepEqual(
      { n: s.n, sigma: s.sigma, k: s.k, kDistinct: s.kDistinct, mMin: s.mMin, mMax: s.mMax, mAvg: s.mAvg },
      { n: 10, sigma: 5, k: 3, kDistinct: 2, mMin: 2, mMax: 5, mAvg: 3 },
    );
    assert.ok(!Object.keys(s).includes('freq'));
    assert.ok(s.freq instanceof Map);
  });
});
