/**
 * Builds the report/site figures as standalone SVG files (no dependencies).
 *   docs/figures/fig1-winners.svg      fastest atom on the calibration grid (m × k per alphabet × n)
 *   docs/figures/fig2-policies.svg     geometric-mean slowdown per policy (validation)
 *   docs/figures/fig3-cdf.svg          slowdown distribution (ECDF) of the main policies
 *   docs/figures/fig4-accuracy.svg     predicted vs measured time (validation, all atoms)
 * Colours: fixed categorical order (an atom always has the same colour), validated
 * palette; every cell also carries a text code so identity is never colour-only.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CALIBRATION } from '../src/selection/coefficients.js';
import { chooseFromStored } from './fit.js';

const OUT = new URL('../docs/figures/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const cal = JSON.parse(readFileSync(new URL('./results/calibration.json', import.meta.url), 'utf8'));
let val = null;
try { val = JSON.parse(readFileSync(new URL('./results/validation.json', import.meta.url), 'utf8')); } catch { /* validation not run yet */ }

const INK = '#0b0b0b', INK2 = '#52514e', MUTED = '#8a8984', GRIDC = '#e6e5e0', SURF = '#fcfcfb', GRAY = '#b9b8b2';
export const ATOM_STYLE = {
  WuManberSearch: { code: 'WM', color: '#2a78d6' },
  AhoCorasickSearch: { code: 'AC', color: '#eb6834' },
  Bm4DnaDsSearch: { code: 'DS', color: '#1baf7a' },
  HorspoolSearch: { code: 'HP', color: '#eda100' },
  Bm4DnaHmbsSearch: { code: 'HM', color: '#e87ba4' },
  ShiftOrSearch: { code: 'SO', color: '#008300' },
  RabinKarpSearch: { code: 'RK', color: '#6250d6' },
  SuffixArraySearch: { code: 'SA', color: '#e34948' },
  BoyerMooreSearch: { code: 'BM', color: GRAY },
  KmpSearch: { code: 'KM', color: GRAY },
  FmIndexSearch: { code: 'FM', color: GRAY },
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="${w}" height="${h}" fill="${SURF}"/>${body}</svg>`;
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 11}" fill="${o.fill ?? INK2}" text-anchor="${o.anchor ?? 'start'}"${o.weight ? ` font-weight="${o.weight}"` : ''}>${esc(s)}</text>`;
const lum = (hex) => { const v = parseInt(hex.slice(1), 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; };

/* ---------------- fig 1: winners on the calibration grid ---------------- */
function fig1() {
  const { alphabets, n: ns, m: ms, k: ks } = cal.grid;
  const cell = 34, gap = 2, pw = ks.length * (cell + gap), ph = ms.length * (cell + gap);
  const left = 92, top = 64, colGap = 46, rowGap = 40;
  const W = left + ns.length * (pw + colGap) + 10, H = top + alphabets.length * (ph + rowGap) + 70;
  let b = txt(left, 22, 'Kalibrasyon ızgarasında en hızlı atom (satır: desen uzunluğu m, sütun: desen sayısı k)', { size: 13, fill: INK, weight: 600 });
  b += txt(left, 40, 'Halka: uydurulan maliyet modelinin farklı bir atom seçtiği hücre (örnek içi).', { size: 11 });
  const used = new Set();
  let wrong = 0;
  alphabets.forEach((a, ai) => {
    ns.forEach((n, ni) => {
      const x0 = left + ni * (pw + colGap), y0 = top + ai * (ph + rowGap) + 16;
      if (ai === 0) b += txt(x0 + pw / 2, top + 4, `n = ${n.toExponential(0).replace('e+', 'e')}`, { anchor: 'middle', fill: INK, weight: 600 });
      if (ni === 0) b += txt(14, y0 + ph / 2, a, { fill: INK, weight: 600, size: 12 });
      ms.forEach((m, mi) => {
        if (ni === 0) b += txt(x0 - 6, y0 + mi * (cell + gap) + cell / 2 + 4, `m=${m}`, { anchor: 'end', size: 10 });
        ks.forEach((k, ki) => {
          if (mi === 0) b += txt(x0 + ki * (cell + gap) + cell / 2, y0 - 4, `k=${k}`, { anchor: 'middle', size: 9, fill: MUTED });
          const c = cal.cases.find((q) => q.alphabet === a && q.n === n && q.m === m && q.k === k);
          if (!c) return;
          const st = ATOM_STYLE[c.fastest];
          used.add(c.fastest);
          const choice = chooseFromStored(CALIBRATION.atoms, c);
          const x = x0 + ki * (cell + gap), y = y0 + mi * (cell + gap);
          const sd = c.times[choice] / c.times[c.fastest];
          b += `<g><title>${esc(`${a}, n=${n}, m=${m}, k=${k}\nfastest: ${c.fastest} ${c.times[c.fastest].toFixed(3)} ms\nmodel picks: ${choice} (${sd.toFixed(2)}×)`)}</title>`;
          b += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="4" fill="${st.color}"/>`;
          b += txt(x + cell / 2, y + cell / 2 + 4, st.code, { anchor: 'middle', size: 10, weight: 600, fill: lum(st.color) > 0.55 ? INK : '#ffffff' });
          if (choice !== c.fastest) { wrong++; b += `<rect x="${x + 2.5}" y="${y + 2.5}" width="${cell - 5}" height="${cell - 5}" rx="3" fill="none" stroke="${INK}" stroke-width="2"/>`; }
          b += '</g>';
        });
      });
    });
  });
  // legend
  let lx = left, ly = H - 34;
  for (const [name, st] of Object.entries(ATOM_STYLE)) {
    if (!used.has(name)) continue;
    b += `<rect x="${lx}" y="${ly - 10}" width="12" height="12" rx="3" fill="${st.color}"/>` + txt(lx + 16, ly, `${st.code} ${name.replace('Search', '')}`, { size: 10.5 });
    lx += 150;
    if (lx > W - 120) { lx = left; ly += 18; }
  }
  writeFileSync(new URL('fig1-winners.svg', OUT), svg(W, H + 10, b, 'Fastest atom per calibration case'));
  return { wrong, total: cal.cases.length };
}

/* ---------------- fig 2: policies ---------------- */
function fig2() {
  const rows = val.tables.ALL.filter((r) => !r.policy.startsWith('ExactMatch end')).sort((a, b) => a.geoMean - b.geoMean);
  const W = 720, rowH = 24, left = 250, top = 54, H = top + rows.length * rowH + 50;
  const maxV = Math.max(...rows.map((r) => r.geoMean));
  const lx = (v) => left + (Math.log(v) / Math.log(maxV * 1.15)) * (W - left - 80);
  let b = txt(16, 22, `Doğrulama (${val.results.length} görülmemiş vaka): en hızlı atoma göre geometrik ortalama yavaşlama`, { size: 13, fill: INK, weight: 600 });
  b += txt(16, 40, 'log ölçek; 1,0 = her zaman en hızlı; düşük daha iyi', { size: 11 });
  for (const t of [1, 1.5, 2, 3, 5, 10, 20, 50].filter((t) => t <= maxV * 1.15)) {
    b += `<line x1="${lx(t)}" x2="${lx(t)}" y1="${top - 6}" y2="${top + rows.length * rowH}" stroke="${GRIDC}"/>` + txt(lx(t), top + rows.length * rowH + 14, `${t}×`, { anchor: 'middle', size: 10, fill: MUTED });
  }
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const isEM = r.policy.startsWith('ExactMatch'), isA = r.policy.startsWith('Allmer');
    const color = isEM ? '#2a78d6' : isA ? '#eb6834' : GRAY;
    const w = Math.max(3, lx(r.geoMean) - left);
    b += `<g><title>${esc(`${r.policy}\ngeo-mean ${r.geoMean.toFixed(3)}, worst ${r.worst.toFixed(2)}×, picks fastest ${(r.pickFastest * 100).toFixed(1)}%`)}</title>`;
    b += txt(left - 8, y + 15, r.policy.replace('Search', '').replace('always ', 'hep ').replace('Allmer 2016 rule', 'Allmer 2016 kuralı'), { anchor: 'end', size: 11, fill: isEM || isA ? INK : INK2, weight: isEM ? 600 : undefined });
    b += `<path d="M${left} ${y + 5}h${w - 4}a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h${-(w - 4)}z" fill="${color}"/>`;
    b += txt(left + w + 6, y + 15, r.geoMean.toFixed(2), { size: 10.5, fill: INK });
    b += '</g>';
  });
  writeFileSync(new URL('fig2-policies.svg', OUT), svg(W, H, b, 'Geometric-mean slowdown per policy'));
}

/* ---------------- fig 3: slowdown ECDF ---------------- */
function fig3() {
  const res = val.results;
  const bestSingle = val.tables.ALL.filter((r) => r.policy.startsWith('always')).sort((a, b) => a.geoMean - b.geoMean)[0].policy.replace('always ', '');
  const series = [
    ['ExactMatch (auto)', (r) => r.times[r.chosen] / r.bestMs, '#2a78d6'],
    ['Allmer 2016 kuralı', (r) => r.times[r.allmer] / r.bestMs, '#eb6834'],
    [`hep ${bestSingle.replace('Search', '')} (en iyi sabit atom)`, (r) => r.times[bestSingle] / r.bestMs, '#1baf7a'],
  ];
  const W = 720, H = 360, left = 60, right = 24, top = 48, bottom = 48;
  const maxS = Math.min(20, Math.max(...series.flatMap(([, f]) => res.map(f))));
  const x = (v) => left + (Math.log(v) / Math.log(maxS)) * (W - left - right);
  const y = (p) => top + (1 - p) * (H - top - bottom);
  let b = txt(16, 22, 'Belirli bir yavaşlamanın altında kalan vaka oranı (ECDF; sol üst daha iyi)', { size: 13, fill: INK, weight: 600 });
  for (const t of [1, 1.1, 1.5, 2, 3, 5, 10, 20].filter((t) => t <= maxS)) b += `<line x1="${x(t)}" x2="${x(t)}" y1="${top}" y2="${H - bottom}" stroke="${GRIDC}"/>` + txt(x(t), H - bottom + 16, `${t}×`, { anchor: 'middle', size: 10, fill: MUTED });
  for (const p of [0, 0.25, 0.5, 0.75, 1]) b += `<line x1="${left}" x2="${W - right}" y1="${y(p)}" y2="${y(p)}" stroke="${GRIDC}"/>` + txt(left - 6, y(p) + 4, `${p * 100}%`, { anchor: 'end', size: 10, fill: MUTED });
  series.forEach(([name, f, color], si) => {
    const v = res.map(f).map((s) => Math.min(Math.max(s, 1), maxS)).sort((a, b) => a - b);
    let d = `M${x(1)} ${y(0)}`;
    v.forEach((s, i) => { d += `H${x(s)}V${y((i + 1) / v.length)}`; });
    d += `H${x(maxS)}`;
    b += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2"/>`;
    const at11 = v.filter((s) => s <= 1.1).length / v.length;
    b += `<rect x="${W - 300}" y="${H - bottom - 76 + si * 18}" width="12" height="3" fill="${color}"/>` + txt(W - 282, H - bottom - 71 + si * 18, `${name}: %${(at11 * 100).toFixed(0)} vaka %10 içinde`, { size: 10.5, fill: INK });
  });
  b += txt(left + (W - left - right) / 2, H - 10, 'yavaşlama = seçilen süre / en hızlı süre (log ölçek)', { anchor: 'middle', size: 10.5 });
  writeFileSync(new URL('fig3-cdf.svg', OUT), svg(W, H, b, 'Slowdown distribution'));
}

/* ---------------- fig 4: predicted vs measured ---------------- */
function fig4() {
  const pts = [];
  for (const r of val.results) for (const [name, t] of Object.entries(r.times)) if (r.estimates[name] != null) pts.push([r.estimates[name], t, name === r.chosen, name, r.id]);
  const W = 520, H = 440, left = 64, right = 20, top = 48, bottom = 52;
  const lo = Math.min(...pts.flatMap((p) => [p[0], p[1]]).filter((v) => v > 0)), hi = Math.max(...pts.flatMap((p) => [p[0], p[1]]));
  const L0 = Math.floor(Math.log10(Math.max(lo, 1e-3))), L1 = Math.ceil(Math.log10(hi));
  const sx = (v) => left + ((Math.log10(Math.max(v, 10 ** L0)) - L0) / (L1 - L0)) * (W - left - right);
  const sy = (v) => H - bottom - ((Math.log10(Math.max(v, 10 ** L0)) - L0) / (L1 - L0)) * (H - top - bottom);
  let b = txt(16, 22, 'Maliyet modeli: tahmin ve ölçülen süre (bütün atomlar, doğrulama)', { size: 13, fill: INK, weight: 600 });
  for (let e = L0; e <= L1; e++) {
    const lab = e >= 0 ? `${10 ** e} ms` : `${(10 ** e).toFixed(-e)} ms`;
    b += `<line x1="${sx(10 ** e)}" x2="${sx(10 ** e)}" y1="${top}" y2="${H - bottom}" stroke="${GRIDC}"/>` + txt(sx(10 ** e), H - bottom + 14, lab, { anchor: 'middle', size: 9.5, fill: MUTED });
    b += `<line x1="${left}" x2="${W - right}" y1="${sy(10 ** e)}" y2="${sy(10 ** e)}" stroke="${GRIDC}"/>` + txt(left - 4, sy(10 ** e) + 3, lab, { anchor: 'end', size: 9.5, fill: MUTED });
  }
  b += `<line x1="${sx(10 ** L0)}" y1="${sy(10 ** L0)}" x2="${sx(10 ** L1)}" y2="${sy(10 ** L1)}" stroke="${INK2}" stroke-dasharray="4 4"/>`;
  for (const [p, t, chosen] of pts) if (!chosen) b += `<circle cx="${sx(p).toFixed(1)}" cy="${sy(t).toFixed(1)}" r="2.2" fill="${GRAY}" fill-opacity="0.7"/>`;
  for (const [p, t, chosen, name, id] of pts) if (chosen) b += `<circle cx="${sx(p).toFixed(1)}" cy="${sy(t).toFixed(1)}" r="4" fill="#2a78d6" stroke="${SURF}" stroke-width="1.5"><title>${esc(`${id} ${name}: predicted ${p} ms, measured ${t} ms`)}</title></circle>`;
  b += txt(left + (W - left - right) / 2, H - 14, 'tahmin (ms)', { anchor: 'middle', size: 10.5 });
  b += `<text transform="translate(16 ${(top + H - bottom) / 2}) rotate(-90)" font-size="10.5" fill="${INK2}" text-anchor="middle">ölçülen (ms)</text>`;
  b += `<circle cx="${left + 12}" cy="${top + 8}" r="4" fill="#2a78d6"/>` + txt(left + 22, top + 12, 'ExactMatch\'in seçtiği atom', { size: 10.5, fill: INK });
  b += `<circle cx="${left + 12}" cy="${top + 26}" r="3" fill="${GRAY}"/>` + txt(left + 22, top + 30, 'diğer atomlar; kesikli çizgi = kusursuz tahmin', { size: 10.5, fill: INK });
  writeFileSync(new URL('fig4-accuracy.svg', OUT), svg(W, H, b, 'Predicted vs measured time'));
}

const f1 = fig1();
console.log(`fig1: model differs from the fastest atom in ${f1.wrong}/${f1.total} calibration cells`);
if (val) { fig2(); fig3(); fig4(); console.log('fig2–fig4 written'); } else console.log('validation.json missing: run npm run bench first');
