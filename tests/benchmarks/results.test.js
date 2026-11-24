// Checks on the stored measurement results (bench/results/). Run with `npm run test:bench`.
// They verify the experiment design required by Task 4, not the timings themselves.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(`../../bench/results/${f}`, import.meta.url), 'utf8'));

describe('calibration results', () => {
  const cal = load('calibration.json');
  it('covers ≥ 3 alphabets × 3 n (10^4..10^6) × 5 m × 4 k', () => {
    assert.ok(cal.grid.alphabets.length >= 3);
    assert.deepEqual(cal.grid.n, [1e4, 1e5, 1e6]);
    assert.ok(cal.grid.m.length >= 5 && cal.grid.k.length >= 4);
    assert.equal(cal.cases.length, cal.grid.alphabets.length * 3 * cal.grid.m.length * cal.grid.k.length);
  });
  it('measures every atom on every case and records the machine', () => {
    for (const c of cal.cases) assert.ok(Object.keys(c.times).length >= 11);
    assert.ok(cal.machine.cpu && cal.machine.node);
  });
});

describe('validation results', () => {
  const val = load('validation.json');
  const cal = load('calibration.json');
  it('has ≥ 100 cases that are not calibration cases', () => {
    const synth = val.results.filter((r) => r.set !== 'R');
    assert.ok(synth.length >= 100);
    const calSeeds = new Set(cal.cases.map((c) => c.seed));
    for (const r of synth) assert.ok(!calSeeds.has(r.seed), `seed ${r.seed} reused`);
  });
  it('includes at least one alphabet never used in calibration', () => {
    const unseen = new Set(val.results.map((r) => r.alphabet).filter((a) => !cal.grid.alphabets.includes(a)));
    assert.ok(unseen.size >= 1);
  });
  it('reports all metrics for ExactMatch, the Allmer rule and every single atom', () => {
    const t = val.tables.ALL;
    for (const p of ['ExactMatch (auto)', 'Allmer 2016 rule']) assert.ok(t.find((r) => r.policy === p));
    assert.ok(t.filter((r) => r.policy.startsWith('always ')).length >= 11);
    for (const r of t.filter((x) => !x.policy.startsWith('ExactMatch end'))) {
      for (const k of ['pickFastest', 'within10', 'geoMean', 'worst', 'totalRatio']) assert.equal(typeof r[k], 'number', `${r.policy}.${k}`);
    }
  });
  it('the molecule beats the Allmer rule and every fixed atom on geometric-mean slowdown', () => {
    const t = val.tables.ALL;
    const em = t.find((r) => r.policy === 'ExactMatch (auto)').geoMean;
    for (const r of t.filter((x) => x.policy.startsWith('always') || x.policy.startsWith('Allmer'))) assert.ok(em < r.geoMean, `${r.policy}: ${r.geoMean} ≤ ${em}`);
  });
});
