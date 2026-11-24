/**
 * Task 4.2–4.4: validation on cases NOT used in calibration.
 *
 *   Set V  (multi-pattern, 120 cases): new seeds, n / m / k drawn BETWEEN grid
 *          points, 6 alphabets of which 3 (binary, alnum, rna) never appear in
 *          calibration; 1–4 records per case.
 *   Set S  (single pattern, 40 cases): k = 1, n and m between grid points.
 *   Set R  (real data, 24 cases): lambda genome and E. coli proteins.
 *
 * Policies compared: ExactMatch (auto), Allmer 2016 rule (m < 50 → bm4DNADS,
 * else bm4DNAHMbs), and "always atom X" for every atom.
 * Metrics: pick-fastest rate, within-10 % rate, geometric-mean slowdown,
 * worst slowdown, total time / best total.
 * Writes bench/results/validation.json and bench/results/validation.md.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { mulberry32, randomText, makePatterns, toEntries } from './data.js';
import { measureCase, timedAtoms } from './runner.js';
import { machineInfo, measure, drain, nowMs, median } from './timing.js';
import { ExactMatch } from '../src/molecules/ExactMatch.js';
import { readFasta } from '../src/fasta.js';
import { GRID } from './grid.js';

const QUICK = process.argv.includes('--quick');
const SEED_V = 7_770_000, SEED_S = 8_880_000, SEED_R = 9_990_000;

const gridN = GRID.n, gridM = GRID.m, gridK = GRID.k;
function between(value, grid, tol) {
  // move a value off grid points (relative tolerance)
  for (const g of grid) if (Math.abs(value - g) / g < tol) return Math.round(value * (value < g ? 1 - tol : 1 + tol));
  return value;
}
function logUniform(rng, lo, hi) { return Math.round(Math.exp(Math.log(lo) + rng() * (Math.log(hi) - Math.log(lo)))); }

function syntheticCase(set, i, seed, single) {
  const rng = mulberry32(seed);
  const alphabets = ['dna', 'protein', 'text', 'binary', 'alnum', 'rna'];
  const alphabet = alphabets[i % alphabets.length];
  const n = between(logUniform(rng, 6000, 1_500_000), gridN, 0.15);
  let m = 3 + ((rng() * 118) | 0);
  while (gridM.includes(m)) m++;
  let k = 1;
  if (!single) { k = logUniform(rng, 2, 100); while (gridK.includes(k)) k++; }
  const records = 1 + ((rng() * 4) | 0);
  const text = randomText(alphabet, n, rng);
  // pattern lengths vary around m (mixed lengths), half of them taken from the text
  const patterns = [];
  for (let j = 0; j < k; j++) {
    const mj = Math.max(2, Math.round(m * (0.6 + 0.8 * rng())));
    patterns.push(...makePatterns(text, alphabet, 1, single ? m : mj, rng, 0.5));
  }
  return { set, id: `${set}${i}`, alphabet, n, m, k, records, seed, patterns, entries: toEntries(text, records, `${set}${i}`) };
}

function realCases() {
  const lambda = readFasta(readFileSync(new URL('../tests/data/lambda.fasta', import.meta.url), 'utf8'));
  const ecoli = readFasta(readFileSync(new URL('../tests/data/ecoli-proteins.fasta', import.meta.url), 'utf8'));
  const L = lambda[0].seq;
  const big = [{ header: '>ecoli_concat', seq: ecoli.map((e) => e.seq).join('') }];
  const cases = [];
  const rng = mulberry32(SEED_R);
  const specs = [[1, 6], [1, 20], [1, 60], [1, 150], [5, 8], [20, 10], [60, 15], [200, 12], [8, 40], [30, 25], [3, 4], [100, 6]];
  specs.forEach(([k, m], i) => {
    for (const [name, entries, src] of [['lambda', lambda, L], ['ecoli', i % 2 ? ecoli : big, big[0].seq]]) {
      const patterns = Array.from({ length: k }, () => {
        if (rng() < 0.5) { const s = (rng() * (src.length - m)) | 0; return src.slice(s, s + m); }
        return randomText(name === 'lambda' ? 'dna' : 'protein', m, rng);
      });
      cases.push({ set: 'R', id: `R${cases.length}`, alphabet: name, n: entries[0].seq.length, m, k, records: entries.length, seed: SEED_R, patterns, entries });
    }
  });
  return cases;
}

function allmerRule(patterns) {
  const m = Math.max(...patterns.map((p) => p.length));
  return m < 50 ? 'Bm4DnaDsSearch' : 'Bm4DnaHmbsSearch';
}

const cases = [];
const nV = QUICK ? 8 : 120, nS = QUICK ? 4 : 40;
for (let i = 0; i < nV; i++) cases.push(syntheticCase('V', i, SEED_V + i, false));
for (let i = 0; i < nS; i++) cases.push(syntheticCase('S', i, SEED_S + i, true));
cases.push(...(QUICK ? realCases().slice(0, 4) : realCases()));

const results = [];
const t0 = nowMs();
for (const c of cases) {
  const { times, matches } = measureCase(c.entries, c.patterns, { reps: 3 });
  const em = new ExactMatch({ patterns: c.patterns });
  const rec = em.decide(c.entries[0]);
  // decision overhead: median of repeated decisions
  const dec = [];
  for (let r = 0; r < 5; r++) { const s = nowMs(); new ExactMatch({ patterns: c.patterns }).decide(c.entries[0]); dec.push(nowMs() - s); }
  const e2e = measure(() => drain(new ExactMatch({ patterns: c.patterns }).run(c.entries)), { reps: 3 }).ms;
  const best = Object.entries(times).sort((a, b) => a[1] - b[1])[0];
  results.push({
    set: c.set, id: c.id, alphabet: c.alphabet, n: c.n, m: c.m, k: c.k, records: c.records, seed: c.seed,
    mMin: rec.shape.mMin, mMax: rec.shape.mMax, sigma: rec.shape.sigma, matches,
    times, fastest: best[0], bestMs: best[1],
    chosen: rec.selected, estimates: rec.estimates, allmer: allmerRule(c.patterns),
    decisionMs: median(dec), endToEndMs: e2e,
  });
  process.stderr.write(`\r[validate] ${results.length}/${cases.length} ${c.id} ${c.alphabet} n=${c.n} m=${c.m} k=${c.k} best=${best[0]} chose=${rec.selected} ${((nowMs() - t0) / 1000).toFixed(0)}s     `);
}
process.stderr.write('\n');

/* --------------------------- metrics --------------------------- */
export function metrics(rows, pick) {
  let hit = 0, within = 0, logSum = 0, worst = 1, worstId = null, total = 0, bestTotal = 0;
  for (const r of rows) {
    const name = pick(r);
    const t = r.times[name];
    const s = t / r.bestMs;
    if (name === r.fastest) hit++;
    if (s <= 1.10) within++;
    logSum += Math.log(s);
    if (s > worst) { worst = s; worstId = r.id; }
    total += t;
    bestTotal += r.bestMs;
  }
  const N = rows.length;
  return { n: N, pickFastest: hit / N, within10: within / N, geoMean: Math.exp(logSum / N), worst, worstId, totalRatio: total / bestTotal };
}

function policyTable(rows) {
  const policies = [['ExactMatch (auto)', (r) => r.chosen], ['Allmer 2016 rule', (r) => r.allmer]];
  for (const A of timedAtoms()) policies.push([`always ${A.manifest.name}`, (r) => A.manifest.name]);
  const out = policies.map(([name, f]) => ({ policy: name, ...metrics(rows, f) }));
  // end-to-end (decision + run, measured) for the molecule
  let logSum = 0, worst = 1, total = 0, bestTotal = 0;
  for (const r of rows) { const s = r.endToEndMs / r.bestMs; logSum += Math.log(s); worst = Math.max(worst, s); total += r.endToEndMs; bestTotal += r.bestMs; }
  out.push({ policy: 'ExactMatch end-to-end (measured, incl. decision)', n: rows.length, pickFastest: null, within10: null, geoMean: Math.exp(logSum / rows.length), worst, worstId: null, totalRatio: total / bestTotal });
  return out;
}

const sets = { V: results.filter((r) => r.set === 'V'), S: results.filter((r) => r.set === 'S'), R: results.filter((r) => r.set === 'R') };
sets.ALL = results;
const tables = Object.fromEntries(Object.entries(sets).map(([k, rows]) => [k, policyTable(rows)]));

const machine = await machineInfo();
writeFileSync(new URL('./results/validation.json', import.meta.url), JSON.stringify({ machine, seeds: { V: SEED_V, S: SEED_S, R: SEED_R }, tables, results }, null, 1));

const pct = (x) => (x === null ? '–' : `${(x * 100).toFixed(1)} %`);
let md = `# Validation results\n\nMachine: ${machine.cpu} (${machine.cores} cores), Node ${machine.node}, ${machine.platform}. Generated ${machine.date}.\n`;
md += `Each time = median of 3 runs after 1 warm-up run (construct atom + process all records + consume all matches).\n`;
const titles = { V: 'Set V: 120 multi-pattern cases (unseen seeds, between-grid values, 3 unseen alphabets)', S: 'Set S: 40 single-pattern cases', R: 'Set R: 24 real-data cases (lambda phage, E. coli proteins)', ALL: 'All 184 cases' };
for (const [k, rows] of Object.entries(tables)) {
  md += `\n## ${titles[k]}\n\n| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |\n|---|---:|---:|---:|---:|---:|\n`;
  for (const r of [...rows].sort((a, b) => a.geoMean - b.geoMean)) {
    md += `| ${r.policy} | ${pct(r.pickFastest)} | ${pct(r.within10)} | ${r.geoMean.toFixed(3)} | ${r.worst.toFixed(2)}×${r.worstId ? ` (${r.worstId})` : ''} | ${r.totalRatio.toFixed(3)} |\n`;
  }
}
md += `\n## Worst ExactMatch choices (all sets)\n\n| Case | Alphabet | n | k | m range | Fastest | Chosen | Slowdown |\n|---|---|---:|---:|---|---|---|---:|\n`;
for (const r of [...results].sort((a, b) => b.times[b.chosen] / b.bestMs - a.times[a.chosen] / a.bestMs).slice(0, 10)) {
  md += `| ${r.id} | ${r.alphabet} | ${r.n} | ${r.k} | ${r.mMin}–${r.mMax} | ${r.fastest} (${r.bestMs.toFixed(2)} ms) | ${r.chosen} (${r.times[r.chosen].toFixed(2)} ms) | ${(r.times[r.chosen] / r.bestMs).toFixed(2)}× |\n`;
}
const dec = results.map((r) => r.decisionMs);
md += `\nDecision time (shape + all estimates): median ${median(dec).toFixed(3)} ms, max ${Math.max(...dec).toFixed(3)} ms.\n`;
writeFileSync(new URL('./results/validation.md', import.meta.url), md);
console.log(md);
