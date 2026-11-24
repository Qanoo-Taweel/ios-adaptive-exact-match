// Site logic. The demo imports the real library (copied to docs/lib/src by scripts/build-site.js)
// and talks to it only through IoSFacade (Facade pattern), exactly like the CLI does.
import { IoSFacade } from '../lib/src/IoSFacade.js';
import { registry } from '../lib/src/registry.js';
import { parseFasta } from '../lib/src/fasta.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (s) => s.replace('Search', '');
const fmt = (ms) => (ms == null ? '–' : ms >= 100 ? `${ms.toFixed(0)} ms` : ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(ms < 0.01 ? 1 : 0)} µs`);

/* ---------------- theme ---------------- */
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };
const savedTheme = store.get('theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$('#theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('theme', next);
});

/* ---------------- atom catalogue ---------------- */
const ATOMS = {
  WuManberSearch: { code: 'WM', slot: 1, group: 'C · bonus', cx: 'ön işlem O(Σm+2^{bB}), arama ~n/(ℓmin−B+1)', text: 'Çok desen, blok kayması. En kısa desen uzunluğu kadar zıplayabilir; desen sayısı arttıkça da alt doğrusal kalır.' },
  AhoCorasickSearch: { code: 'AC', slot: 2, group: 'C', cx: 'O(Σm·S) / O(n + occ)', text: 'Bütün desenler tek geçişte, tam DFA tablosuyla. Çok sayıda kısa desende rakipsiz.' },
  Bm4DnaDsSearch: { code: 'DS', slot: 3, group: 'A', cx: 'O(m+S) / alt doğrusal', text: 'Allmer\'in ayarlı Boyer-Moore\'u: nöbetçi ve 3 kez açılmış atlama döngüsü. Kısa ve orta tek desenler.' },
  HorspoolSearch: { code: 'HP', slot: 4, group: 'A', cx: 'O(m+S) / O(n/m)–O(nm)', text: 'Yalnızca son karakterin kötü karakter kayması. Büyük alfabelerde uzun kaymalar.' },
  Bm4DnaHmbsSearch: { code: 'HM', slot: 5, group: 'A', cx: 'O(m+2^{bq}) / ~n/(m−q+1)', text: 'Bit paketli q-gram özetleriyle kayma. Küçük alfabede (DNA) uzun desenlerin uzmanı. Güvenli kayma m−q+1.' },
  ShiftOrSearch: { code: 'SO', slot: 6, group: 'A', cx: 'O(Σm+S) / O(n·kelime)', text: 'Bit paralel; kısa desenler tek 32 bit kelimeye paketlenir. m > 32 için kendini uygulanamaz ilan eder.' },
  RabinKarpSearch: { code: 'RK', slot: 7, group: 'B', cx: 'O(Σm) / O(n·farklı uzunluk)', text: 'Kayan özet; aynı uzunluktaki bütün desenler tek geçişte. Eşit özette her zaman doğrulama.' },
  SuffixArraySearch: { code: 'SA', slot: 8, group: 'D', cx: 'O(n log n) / O(m log n)', text: 'Metni bir kez indeksler, her deseni ikili aramayla bulur. Kısa metin + çok desen.' },
  BoyerMooreSearch: { code: 'BM', slot: 0, group: 'örnek', cx: 'O(m+S) / alt doğrusal', text: 'Başlangıç paketindeki tam örnek: kötü karakter + güçlü iyi sonek.' },
  KmpSearch: { code: 'KM', slot: 0, group: 'B', cx: 'O(m) / O(n)', text: 'Metinde geri dönmez; en kötü durumda doğrusal, akış dostu.' },
  FmIndexSearch: { code: 'FM', slot: 0, group: 'D · bonus', cx: 'O(n log n) / O(m + occ)', text: 'BWT + geriye doğru arama. Sayma maliyeti n\'den bağımsız; indeksi kurmak pahalı.' },
  NaiveSearch: { code: 'NV', slot: 0, group: 'oracle', cx: '– / O(nm)', text: 'Kaba kuvvet referans. Testlerin oracle\'ı; otomatik seçimde kendini uygulanamaz ilan eder.' },
};
const color = (name) => `var(--s${ATOMS[name]?.slot ?? 0})`;

/* ---------------- results ---------------- */
let RES = null;
try {
  RES = await (await fetch('data/results.json')).json();
} catch { $('#machine').textContent = 'Sonuç dosyası yüklenemedi.'; }

if (RES) {
  const T = RES.tables;
  const em = T.ALL.find((r) => r.policy === 'ExactMatch (auto)');
  const al = T.ALL.find((r) => r.policy === 'Allmer 2016 rule');
  const best = T.ALL.filter((r) => r.policy.startsWith('always')).sort((a, b) => a.geoMean - b.geoMean)[0];
  document.querySelector('[data-k="em"]').textContent = `${em.geoMean.toFixed(3)}×`;
  document.querySelector('[data-k="allmer"]').textContent = `${al.geoMean.toFixed(3)}×`;
  document.querySelector('[data-k="best"]').textContent = `${best.geoMean.toFixed(3)}×`;
  document.querySelector('[data-k="bestname"]').textContent = `en iyi sabit atom (hep ${short(best.policy.replace('always ', ''))})`;
  const mc = RES.machine;
  $('#machine').textContent = `${RES.results.length} doğrulama vakası, kalibrasyonda kullanılmadı. Ölçüm: ${mc.cpu}, ${mc.cores} çekirdek, Node ${mc.node}. Her süre = ısınma + 3 tekrarın ortancası. Yavaşlama = seçilen atomun süresi / o vakadaki en hızlı atomun süresi.`;

  const notes = {
    ALL: 'Bütün kümeler birlikte.',
    V: '120 çok desenli sentetik vaka: yeni tohumlar, ızgara noktaları arasından n/m/k, karışık desen uzunlukları, 1–4 kayıt, kalibrasyonda olmayan ikili / alfanümerik / RNA alfabeleri.',
    S: '40 tek desenli vaka (k = 1), Allmer kuralının asıl alanı.',
    R: '24 gerçek veri vakası: lambda genomu ve E. coli proteinleri (126 kayıtlık akış dahil).',
  };
  const renderSet = (set) => {
    const rows = [...T[set]].filter((r) => !r.policy.startsWith('ExactMatch end')).sort((a, b) => a.geoMean - b.geoMean);
    const pct = (x) => `${(x * 100).toFixed(1)}%`;
    $('#policyRows').innerHTML = rows.map((r) => `<tr class="${r.policy.startsWith('ExactMatch') ? 'hl' : ''}"><td>${esc(r.policy.replace('always ', 'hep ').replace('Allmer 2016 rule', 'Allmer 2016 kuralı'))}</td><td>${pct(r.pickFastest)}</td><td>${pct(r.within10)}</td><td>${r.geoMean.toFixed(3)}</td><td>${r.worst.toFixed(2)}×</td><td>${r.totalRatio.toFixed(3)}</td></tr>`).join('');
    const e2e = T[set].find((r) => r.policy.startsWith('ExactMatch end'));
    $('#setNote').textContent = `${notes[set]} Karar süresi dahil ölçülen uçtan uca ExactMatch: geo. ort. ${e2e.geoMean.toFixed(3)}.`;
    document.querySelectorAll('#setTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.set === set)));
  };
  document.querySelectorAll('#setTabs button').forEach((b) => b.addEventListener('click', () => renderSet(b.dataset.set)));
  renderSet('ALL');

  const worst = [...RES.results].sort((a, b) => b.times[b.chosen] / b.bestMs - a.times[a.chosen] / a.bestMs).slice(0, 8);
  $('#worstRows').innerHTML = worst.map((r) => `<tr><td>${r.id}</td><td>${r.alphabet}</td><td>${r.n.toLocaleString('tr-TR')}</td><td>${r.records}</td><td>${r.k}</td><td>${r.mMin}–${r.mMax}</td><td>${short(r.fastest)} (${fmt(r.bestMs)})</td><td>${short(r.chosen)} (${fmt(r.times[r.chosen])})</td><td>${(r.times[r.chosen] / r.bestMs).toFixed(2)}×</td></tr>`).join('');

  // calibration grid explorer
  const C = RES.calibration;
  $('#gridAlpha').innerHTML = C.grid.alphabets.map((a) => `<option>${a}</option>`).join('');
  $('#gridN').innerHTML = C.grid.n.map((n) => `<option value="${n}">${n.toLocaleString('tr-TR')}</option>`).join('');
  $('#gridN').value = String(C.grid.n[Math.min(2, C.grid.n.length - 1)]);
  const tip = $('#gridTip');
  const drawGrid = () => {
    const a = $('#gridAlpha').value, n = Number($('#gridN').value);
    const g = $('#grid');
    g.style.gridTemplateColumns = `auto repeat(${C.grid.k.length}, auto)`;
    let h = '<div class="hdr"></div>' + C.grid.k.map((k) => `<div class="hdr">k=${k}</div>`).join('');
    for (const m of C.grid.m) {
      h += `<div class="hdr rowh">m=${m}</div>`;
      for (const k of C.grid.k) {
        const c = C.cases.find((q) => q.alphabet === a && q.n === n && q.m === m && q.k === k);
        const st = ATOMS[c.fastest];
        const light = [3, 4, 5].includes(st.slot) || st.slot === 0;
        h += `<div class="cell${light ? ' light' : ''}" tabindex="0" data-id="${c.id}" style="background:${color(c.fastest)}" aria-label="m=${m}, k=${k}: ${c.fastest}">${st.code}</div>`;
      }
    }
    g.innerHTML = h;
  };
  const showTip = (el) => {
    const c = C.cases.find((q) => String(q.id) === el.dataset.id);
    const rows = Object.entries(c.times).sort((x, y) => x[1] - y[1]);
    tip.innerHTML = `<b>${c.alphabet}, n=${c.n.toLocaleString('tr-TR')}, m=${c.m}, k=${c.k}</b> · ${c.matches} eşleşme<table>${rows.map(([nm, t], i) => `<tr class="${i === 0 ? 'best' : ''}"><td><span class="sw" style="display:inline-block;background:${color(nm)}"></span> ${short(nm)}</td><td>${fmt(t)}</td><td>${(t / rows[0][1]).toFixed(2)}×</td></tr>`).join('')}</table>`;
    tip.hidden = false;
    const wrap = $('.gridwrap').getBoundingClientRect(), r = el.getBoundingClientRect();
    let left = r.right - wrap.left + 8;
    if (left + 240 > wrap.width) left = Math.max(0, r.left - wrap.left - 248);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, r.top - wrap.top - 40)}px`;
  };
  $('#grid').addEventListener('mouseover', (e) => { if (e.target.classList.contains('cell')) showTip(e.target); });
  $('#grid').addEventListener('focusin', (e) => { if (e.target.classList.contains('cell')) showTip(e.target); });
  $('#grid').addEventListener('mouseleave', () => { tip.hidden = true; });
  $('#grid').addEventListener('focusout', () => { tip.hidden = true; });
  $('#gridAlpha').addEventListener('change', drawGrid);
  $('#gridN').addEventListener('change', drawGrid);
  drawGrid();
  const winners = new Set(C.cases.map((c) => c.fastest));
  $('#legend').innerHTML = Object.entries(ATOMS).filter(([n]) => winners.has(n)).map(([n, s]) => `<span><i class="sw" style="background:${color(n)}"></i>${s.code} ${short(n)}</span>`).join('');

  // atom cards
  const wins = {};
  for (const c of C.cases) wins[c.fastest] = (wins[c.fastest] ?? 0) + 1;
  $('#atomCards').innerHTML = registry.atoms().map((A) => A.manifest).sort((x, y) => (wins[y.name] ?? 0) - (wins[x.name] ?? 0)).map((m) => {
    const s = ATOMS[m.name] ?? { code: '?', group: '', cx: '', text: '' };
    return `<article class="card"><div class="card-h"><span class="sw" style="background:${color(m.name)}"></span><h4>${esc(short(m.name))}</h4><span class="badge">${esc(s.group)}</span></div><p>${esc(s.text)}</p><div class="meta"><span>${esc(m.references.join('; '))}</span><span>${wins[m.name] ?? 0}/${C.cases.length}</span></div><div class="meta"><span>${esc(s.cx)}</span></div></article>`;
  }).join('');
}

/* ---------------- demo ---------------- */
const facade = new IoSFacade();
$('#strategy').innerHTML += registry.names().map((n) => `<option value="${n}">${n}</option>`).join('');

function mulberry32(a) { return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randomText(chars, n, seed, weights) {
  const rng = mulberry32(seed);
  const cum = []; let acc = 0; const tot = weights ? weights.reduce((x, y) => x + y, 0) : chars.length;
  for (let i = 0; i < chars.length; i++) { acc += (weights ? weights[i] : 1) / tot; cum.push(acc); }
  const out = new Array(n);
  for (let i = 0; i < n; i++) { const r = rng(); let j = 0; while (j < cum.length - 1 && r > cum[j]) j++; out[i] = chars[j]; }
  return out.join('');
}
const cache = {};
async function datasetText(name) {
  if (cache[name]) return cache[name];
  if (name === 'lambda') cache[name] = await (await fetch('data/lambda.fasta')).text();
  else if (name === 'ecoli') cache[name] = await (await fetch('data/ecoli-proteins.fasta')).text();
  else if (name === 'random-dna') cache[name] = '>random DNA (seed 1)\n' + randomText('ACGT', 1_000_000, 1);
  else if (name === 'random-text') cache[name] = '>random English text (seed 2)\n' + randomText(' ETAOINSHRDLCUMWFGYPBVKJXQZ', 200_000, 2, [18.3, 10.2, 7.7, 6.8, 6.6, 5.7, 5.7, 5.3, 5, 5, 3.5, 3.4, 2.3, 2.3, 2, 1.9, 1.8, 1.6, 1.6, 1.5, 1.3, 0.8, 0.6, 0.15, 0.15, 0.1, 0.07]);
  return cache[name];
}
const DEFAULT_PATTERNS = { lambda: 'GAATTC,GGATCC,AAGCTT', ecoli: 'MKK,LLLL,W,GG', 'random-dna': 'ACGTACGT,GATTACA', 'random-text': 'THE ,AND ,ING', custom: 'ACGT' };
$('#dataset').addEventListener('change', () => {
  const v = $('#dataset').value;
  $('#customWrap').hidden = v !== 'custom';
  $('#patterns').value = DEFAULT_PATTERNS[v];
});
document.querySelectorAll('.presets button').forEach((b) => b.addEventListener('click', async () => {
  if (b.dataset.p !== 'many') { $('#patterns').value = b.dataset.p; return; }
  const txt = await currentFasta();
  const seq = [...parseFasta(txt)].map((e) => e.seq).join('');
  const rng = mulberry32(7);
  const pats = Array.from({ length: 120 }, () => { const m = 5 + ((rng() * 8) | 0); const s = (rng() * Math.max(1, seq.length - m)) | 0; return seq.slice(s, s + m) || 'A'; });
  $('#patterns').value = pats.join(',');
}));
async function currentFasta() {
  const v = $('#dataset').value;
  return v === 'custom' ? $('#fasta').value : datasetText(v);
}
function opts() {
  return { patterns: $('#patterns').value.split(',').map((s) => s.trim()).filter(Boolean), ignoreCase: $('#ignoreCase').checked, strategy: $('#strategy').value };
}
const nextFrame = () => new Promise((r) => setTimeout(r, 16));

let lastRecord = null;
function renderShape(s) {
  $('#shape').innerHTML = [['n', s.n.toLocaleString('tr-TR')], ['σ', s.sigma], ['k', s.k], ['m', `${s.mMin}–${s.mMax}`], ['m̄', s.mAvg], ['Σf²', s.collision], ...(s.sampled ? [['örneklem', 'evet']] : [])].map(([k, v]) => `<span>${k}=${esc(v)}</span>`).join('');
}
function renderBars(record, measured = null) {
  const names = registry.names();
  const vals = names.map((n) => record.estimates[n]).concat(measured ? Object.values(measured) : []).filter((v) => v > 0);
  const lo = Math.min(...vals) / 1.5, hi = Math.max(...vals) * 1.2;
  const x = (v) => `${Math.max(0.5, (Math.log(v / lo) / Math.log(hi / lo)) * 100)}%`;
  const order = [...names].sort((a, b) => (record.estimates[a] ?? Infinity) - (record.estimates[b] ?? Infinity));
  $('#bars').innerHTML = order.map((n) => {
    const est = record.estimates[n];
    const ex = record.excluded?.[n];
    const meas = measured?.[n];
    return `<div class="bar${n === record.selected ? ' sel' : ''}${ex ? ' ex' : ''}" role="listitem" title="${esc(ex ? `uygulanamaz: ${ex}` : `${n}: tahmin ${fmt(est)}${meas ? `, ölçülen ${fmt(meas)}` : ''}`)}"><span class="name">${esc(short(n))}</span><span class="track">${est != null ? `<span class="fill" style="width:${x(est)}"></span>` : ''}${meas ? `<span class="meas" style="left:${x(meas)}"></span>` : ''}</span><span class="val">${ex ? 'uygulanamaz' : `${fmt(est)}${meas ? ` · ${fmt(meas)}` : ''}`}</span></div>`;
  }).join('');
}

$('#run').addEventListener('click', async () => {
  const btn = $('#run'); btn.disabled = true; $('#status').textContent = 'Çalışıyor…';
  await nextFrame();
  try {
    const fasta = await currentFasta();
    const o = opts();
    const t0 = performance.now();
    const { molecule, matches } = facade.run(fasta, o);
    const rows = [];
    let count = 0;
    for (const m of matches) { if (rows.length < 300) rows.push(m); count++; }
    const ms = performance.now() - t0;
    const r = molecule.record;
    lastRecord = r;
    $('#selected').textContent = r.selected;
    $('#timing').textContent = `toplam ${fmt(ms)} · karar ${fmt(r.decisionMs)}`;
    $('#why').textContent = r.why;
    renderShape(r.shape);
    $('#record').textContent = JSON.stringify(r, null, 2);
    $('#benchNote').textContent = '(log ölçek; çubuk = tahmin)';
    renderBars(r);
    $('#matchCount').textContent = `${count.toLocaleString('tr-TR')}${count > 300 ? ' (ilk 300 gösteriliyor)' : ''}`;
    $('#matches').innerHTML = rows.map((m) => `<tr><td>${esc(m.header.slice(0, 40))}</td><td>${esc(m.pattern.length > 24 ? m.pattern.slice(0, 24) + '…' : m.pattern)}</td><td>${m.position}</td><td>${m.length}</td></tr>`).join('');
    $('#status').textContent = 'Bitti.';
  } catch (e) {
    $('#status').textContent = `Hata: ${e.message}`;
  } finally { btn.disabled = false; }
});

$('#bench').addEventListener('click', async () => {
  const btn = $('#bench'); btn.disabled = true;
  try {
    const fasta = await currentFasta();
    const o = opts();
    const entries = [...parseFasta(fasta)];
    const record = facade.explain(fasta, { ...o, strategy: 'auto' });
    const measured = {};
    for (const A of registry.atoms()) {
      const name = A.manifest.name;
      if (name === 'NaiveSearch') continue;
      $('#status').textContent = `Ölçülüyor: ${name}…`;
      await nextFrame();
      const run = () => { let c = 0; for (const _ of new A({ patterns: o.patterns, ignoreCase: o.ignoreCase }).run(entries)) c++; return c; };
      run(); // warm-up
      const ts = [];
      for (let i = 0; i < 3; i++) { const t = performance.now(); run(); ts.push(performance.now() - t); }
      measured[name] = ts.sort((a, b) => a - b)[1];
    }
    const fastest = Object.entries(measured).sort((a, b) => a[1] - b[1])[0];
    $('#selected').textContent = record.selected;
    $('#timing').textContent = `karar ${fmt(record.decisionMs)}`;
    $('#why').textContent = record.why;
    renderShape(record.shape);
    $('#record').textContent = JSON.stringify(record, null, 2);
    $('#matchCount').textContent = '(ölçüm modunda listelenmez; Çalıştır\'a basın)';
    $('#matches').innerHTML = '';
    $('#benchNote').textContent = '(log ölçek; çubuk = tahmin, siyah çizgi = tarayıcınızda ölçülen ortanca)';
    renderBars(record, measured);
    const ratio = measured[record.selected] / fastest[1];
    $('#status').textContent = `Tarayıcınızda en hızlı: ${fastest[0]} (${fmt(fastest[1])}). Molekülün seçimi ${record.selected}: ${ratio.toFixed(2)}× (katsayılar Node.js'te kalibre edildi; tarayıcı motoru farklı olabilir).`;
  } catch (e) {
    $('#status').textContent = `Hata: ${e.message}`;
  } finally { btn.disabled = false; }
});
