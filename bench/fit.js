/**
 * Fits the cost model: for every atom, non-negative coefficients c_f with
 *     time ≈ Σ_f c_f · feature_f
 * minimising the squared RELATIVE error Σ ((pred − t) / t)², so a 0.1 ms case
 * counts as much as a 500 ms case (we care about ratios between atoms).
 * Non-negativity: exhaustive search over feature subsets (≤ 5 features ⇒
 * ≤ 31 subsets), keeping the best subset whose least-squares solution is
 * all ≥ 0 (an exact NNLS for this size).
 */
import { writeFileSync } from 'node:fs';
import { registry } from '../src/registry.js';

const TIME_UNIT = 1e-3; // measured ms → model seconds

function solve(A, b) { // Gaussian elimination with partial pivoting; A is square
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** rows: [{ x: {f: value}, t }] → { coef, err } */
export function nnlsRelative(rows, featureNames) {
  let best = null;
  const F = featureNames.length;
  for (let mask = 1; mask < 1 << F; mask++) {
    const fs = featureNames.filter((_, i) => mask & (1 << i));
    // scale columns to unit max for conditioning
    const scale = fs.map((f) => Math.max(1e-30, ...rows.map((r) => Math.abs(r.x[f] ?? 0) / r.t)));
    const XtX = fs.map(() => fs.map(() => 0));
    const Xty = fs.map(() => 0);
    for (const r of rows) {
      const xi = fs.map((f, j) => (r.x[f] ?? 0) / r.t / scale[j]); // divide by t: relative error
      for (let a = 0; a < fs.length; a++) {
        Xty[a] += xi[a]; // y = t / t = 1
        for (let c = 0; c < fs.length; c++) XtX[a][c] += xi[a] * xi[c];
      }
    }
    for (let a = 0; a < fs.length; a++) XtX[a][a] += 1e-9; // ridge for stability
    const sol = solve(XtX, Xty);
    if (!sol || sol.some((v) => !(v >= 0))) continue;
    const coef = {};
    fs.forEach((f, j) => { coef[f] = sol[j] / scale[j]; });
    let err = 0;
    for (const r of rows) {
      let p = 0;
      for (const f of fs) p += coef[f] * (r.x[f] ?? 0);
      err += ((p - r.t) / r.t) ** 2;
    }
    if (!best || err < best.err) best = { coef, err };
  }
  return best;
}

export function fitAll(raw) {
  const atoms = {};
  for (const A of registry.atoms()) {
    const name = A.manifest.name;
    if (name === 'NaiveSearch') continue;
    const rows = [];
    for (const c of raw.cases) {
      if (c.times[name] === undefined) continue;
      const verdict = A.selection.applicable(c.shape);
      if (verdict !== true) continue; // fit only where the atom may be chosen
      rows.push({ x: { ...c.features[name], base: 1 }, t: c.times[name] * TIME_UNIT }); // base = fixed per-run overhead
    }
    if (!rows.length) continue;
    const featureNames = Object.keys(rows[0].x);
    const best = nnlsRelative(rows, featureNames);
    const coef = {};
    for (const f of featureNames) coef[f] = Number((best.coef[f] ?? 0).toPrecision(5));
    const rel = rows.map((r) => {
      let p = 0;
      for (const f of featureNames) p += coef[f] * (r.x[f] ?? 0);
      return Math.abs(p - r.t) / r.t;
    }).sort((a, b) => a - b);
    atoms[name] = { coef, rows: rows.length, medianRelErr: rel[rel.length >> 1] };
  }
  // in-sample selection quality (uses the features stored with each case)
  let hit = 0, logSum = 0;
  for (const c of raw.cases) {
    const choice = chooseFromStored(atoms, c);
    const best = Math.min(...Object.values(c.times));
    if (choice === c.fastest) hit++;
    logSum += Math.log(c.times[choice] / best);
  }
  return { atoms, inSample: { hit: hit / raw.cases.length, geo: Math.exp(logSum / raw.cases.length) } };
}

/**
 * Same logic as the selection chain, on a stored case (features were computed
 * from the full shape at measurement time; stored shapes lose hidden fields).
 */
export function chooseFromStored(atomCoefs, c) {
  let best = null, bestS = Infinity;
  for (const A of registry.atoms()) {
    const name = A.manifest.name;
    if (!c.features[name] || A.selection.applicable(c.shape) !== true) continue;
    const coef = atomCoefs[name]?.coef ?? A.selection.defaults;
    let s = coef.base ?? 0;
    for (const [f, v] of Object.entries(c.features[name])) s += (coef[f] ?? 0) * v;
    if (s < bestS) { bestS = s; best = name; }
  }
  return best;
}

export function writeCoefficients(fit, raw) {
  const meta = {
    version: `calibrated ${new Date().toISOString().slice(0, 10)}`,
    source: 'bench/results/calibration.json',
    machine: raw.machine,
    cases: raw.cases.length,
    inSample: fit.inSample,
  };
  const atoms = {};
  for (const [name, f] of Object.entries(fit.atoms)) atoms[name] = { coef: f.coef, rows: f.rows, medianRelErr: Number(f.medianRelErr.toFixed(4)) };
  const body = `// GENERATED by \`npm run calibrate\` (bench/calibrate.js + bench/fit.js). Do not edit by hand.
// Coefficients are seconds per unit of each feature returned by the atom's selection.features(shape).
export const CALIBRATION = ${JSON.stringify({ meta, atoms }, null, 2)};
`;
  writeFileSync(new URL('../src/selection/coefficients.js', import.meta.url), body);
}

