/**
 * Task 4.1 — calibration grid:
 *   3 alphabets × 3 text lengths (10^4, 10^5, 10^6) × 5 pattern lengths × 4 pattern counts
 *   = 180 cases, every atom measured on each (warm-up + median of 3).
 * Writes bench/results/calibration.json (raw), then fits the cost model
 * (bench/fit.js) and writes src/selection/coefficients.js.
 *
 *   node bench/calibrate.js            full grid
 *   node bench/calibrate.js --quick    tiny grid for a smoke test
 *   node bench/calibrate.js --fit-only refit from the saved raw file
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { mulberry32, randomText, makePatterns } from './data.js';
import { measureCase, featuresFor } from './runner.js';
import { machineInfo, nowMs } from './timing.js';
import { fitAll, writeCoefficients } from './fit.js';
import { ShapeBuilder } from '../src/shape.js';

import { GRID } from './grid.js';

const RAW = new URL('./results/calibration.json', import.meta.url);
const args = new Set(process.argv.slice(2));

async function measureGrid() {
  const grid = args.has('--quick') ? { ...GRID, n: [1e4], m: [4, 24], k: [1, 16] } : GRID;
  const cases = [];
  const total = grid.alphabets.length * grid.n.length * grid.m.length * grid.k.length;
  let id = 0;
  const t0 = nowMs();
  for (const alphabet of grid.alphabets) {
    for (const n of grid.n) {
      for (const m of grid.m) {
        for (const k of grid.k) {
          const seed = grid.seed + id;
          const rng = mulberry32(seed);
          const text = randomText(alphabet, n, rng);
          const patterns = makePatterns(text, alphabet, k, m, rng, 0.5);
          const entries = [{ header: `>cal${id}`, seq: text }];
          const { times, matches, shape } = measureCase(entries, patterns, { reps: grid.reps });
          const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0][0];
          cases.push({ id, alphabet, n, m, k, seed, patterns, matches, shape, features: featuresFor(shape), times, fastest });
          id++;
          const el = ((nowMs() - t0) / 1000).toFixed(0);
          process.stderr.write(`\r[calibrate] ${id}/${total}  ${alphabet} n=${n} m=${m} k=${k} → ${fastest.padEnd(18)} ${el}s   `);
        }
      }
    }
  }
  process.stderr.write('\n');
  const raw = { machine: await machineInfo(), grid, cases };
  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  writeFileSync(RAW, JSON.stringify(raw));
  return raw;
}

/**
 * --refeature: recompute the stored feature vectors (after a change in
 * src/functions/costs.js) without re-measuring. The texts are regenerated
 * from their seeds, which is exact because the generator is deterministic.
 */
function refeature(raw) {
  for (const c of raw.cases) {
    const rng = mulberry32(c.seed);
    const text = randomText(c.alphabet, c.n, rng);
    const patterns = makePatterns(text, c.alphabet, c.k, c.m, rng, 0.5);
    if (JSON.stringify(patterns) !== JSON.stringify(c.patterns)) throw new Error(`case ${c.id}: regenerated patterns differ`);
    c.features = featuresFor(new ShapeBuilder().withPatterns(patterns).withText(text).build());
  }
  writeFileSync(RAW, JSON.stringify(raw));
  return raw;
}

let raw;
if (args.has('--fit-only')) raw = JSON.parse(readFileSync(RAW, 'utf8'));
else if (args.has('--refeature')) raw = refeature(JSON.parse(readFileSync(RAW, 'utf8')));
else raw = await measureGrid();
const fit = fitAll(raw);
writeCoefficients(fit, raw);
for (const [name, f] of Object.entries(fit.atoms)) {
  console.log(`${name.padEnd(20)} rows=${String(f.rows).padStart(3)}  median |rel err|=${(f.medianRelErr * 100).toFixed(1)}%  coef=${JSON.stringify(f.coef)}`);
}
console.log(`in-sample: picks fastest ${(fit.inSample.hit * 100).toFixed(1)}%, geo-mean slowdown ${fit.inSample.geo.toFixed(3)}`);
