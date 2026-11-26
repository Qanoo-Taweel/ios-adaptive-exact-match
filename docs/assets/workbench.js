// Workbench: an IoS-style workflow editor for the ExactMatch component.
// FASTA input → ExactMatch (or a forced atom) → matches. It uses the real library
// (docs/lib/src, copied from src/ by scripts/build-site.js) only through IoSFacade.
import { IoSFacade } from '../lib/src/IoSFacade.js';
import { registry } from '../lib/src/registry.js';
import { parseFasta } from '../lib/src/fasta.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (s) => s.replace(/Search$/, '');
const fmt = (ms) => (ms == null ? '–' : ms >= 100 ? `${ms.toFixed(0)} ms` : ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(ms < 0.01 ? 1 : 0)} µs`);
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } } };
const facade = new IoSFacade();

/* ---------------- catalogue ---------------- */
const INFO = {
  ExactMatch: { code: 'EM', group: 'molekül', text: 'İlk kaydın şekline bakar, her atomun süresini kalibre edilmiş maliyet modeliyle tahmin eder ve en ucuzunu bütün akış için çalıştırır.' },
  HorspoolSearch: { code: 'HP', group: 'A', text: 'Pencerenin son karakterine göre kötü karakter kayması.' },
  Bm4DnaDsSearch: { code: 'DS', group: 'A', text: 'Allmer\'in ayarlı Boyer-Moore\'u: nöbetçi ve 3 kez açılmış atlama döngüsü.' },
  Bm4DnaHmbsSearch: { code: 'HM', group: 'A', text: 'Bit paketli q-gram özetleriyle kayma; güvenli kayma m − q + 1.' },
  ShiftOrSearch: { code: 'SO', group: 'A', text: 'Bit paralel arama; m ≤ 32 desenler tek 32 bit kelimeye sığar.' },
  KmpSearch: { code: 'KM', group: 'B', text: 'Başarısızlık tablosu; metinde geri dönmez, en kötü durumda doğrusal.' },
  RabinKarpSearch: { code: 'RK', group: 'B', text: 'Kayan özet; eşit özette her zaman doğrulama.' },
  AhoCorasickSearch: { code: 'AC', group: 'C', text: 'Bütün desenler tek geçişte, tam DFA ile.' },
  WuManberSearch: { code: 'WM', group: 'C', text: 'Çok desenli blok kayması; kayma en kısa desen boyunca büyür.' },
  SuffixArraySearch: { code: 'SA', group: 'D', text: 'Metni sonek dizisiyle indeksler, desenleri ikili aramayla bulur.' },
  FmIndexSearch: { code: 'FM', group: 'D', text: 'BWT ve geriye doğru arama; sayma maliyeti n\'den bağımsız.' },
  BoyerMooreSearch: { code: 'BM', group: 'örnek', text: 'Kötü karakter + güçlü iyi sonek; ödevdeki örnek atom.' },
  NaiveSearch: { code: 'NV', group: 'oracle', text: 'Kaba kuvvet referans; testlerde doğruluk ölçütü (oracle).' },
};
const GROUPS = [
  { key: 'A', title: 'Grup A · tek desen, atlamalı' },
  { key: 'B', title: 'Grup B · klasik tek desen' },
  { key: 'C', title: 'Grup C · çok desen' },
  { key: 'D', title: 'Grup D · metin indeksi' },
  { key: 'örnek', title: 'Örnek ve referans' },
];
const atoms = registry.atoms().map((A) => A.manifest);
const manifestOf = (name) => (name === 'ExactMatch' ? facade.listComponents()[0] : registry.get(name).manifest);

const SAMPLES = {
  lambda: { label: 'Lambda faj genomu (48 502 bp)', url: 'data/lambda.fasta', patterns: 'GAATTC,GGATCC', name: 'Lambda: EcoRI + BamHI' },
  ecoli: { label: 'E. coli K-12, 126 protein', url: 'data/ecoli-proteins.fasta', patterns: 'MKK,LLL,GGG,KR', name: 'E. coli: protein motifleri' },
  many: { label: 'Lambda + 120 kısa desen', url: 'data/lambda.fasta', patterns: null, name: 'Lambda: 120 kısa desen' },
  custom: { label: 'Kendi FASTA metniniz', url: null, patterns: 'ACGT', name: 'Özel girdi' },
};

/* ---------------- state ---------------- */
const S = {
  sample: 'lambda', text: '', patterns: SAMPLES.lambda.patterns, ignoreCase: false, component: 'ExactMatch',
  record: null, matches: [], total: 0, runMs: null, bench: null, status: 'idle', error: null,
  sel: null, ptab: 'main', zoom: 1, pan: { x: 0, y: 0 },
  nodes: matchMedia('(max-width: 900px)').matches
    ? { in: { x: 20, y: 20 }, comp: { x: 70, y: 150 }, out: { x: 120, y: 280 } }
    : { in: { x: 40, y: 150 }, comp: { x: 320, y: 130 }, out: { x: 600, y: 150 } },
};
const cache = {};
async function loadSample(key) {
  const s = SAMPLES[key];
  if (!s.url) return S.text || '>benim_dizim\nACGTACGTTTGACGTACGT\n';
  if (!cache[s.url]) cache[s.url] = await (await fetch(s.url)).text();
  return cache[s.url];
}
function manyPatterns(text) {
  // 120 deterministic 6-mers taken from the genome (a fixed stride), as in the site demo.
  const seq = [...parseFasta(text)][0].seq;
  const out = [];
  for (let i = 0; out.length < 120; i += 397) out.push(seq.slice(i % (seq.length - 6), (i % (seq.length - 6)) + 6));
  return out.join(',');
}
const patternList = () => S.patterns.split(/[\s,]+/).map((p) => p.trim()).filter(Boolean);
const opts = () => ({ patterns: patternList(), ignoreCase: S.ignoreCase, strategy: 'auto' });

/* ---------------- theme, menu, panels ---------------- */
const savedTheme = store.get('theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$('#themeBtn').addEventListener('click', () => {
  const cur = document.documentElement.dataset.theme;
  const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  store.set('theme', dark ? 'light' : 'dark');
});
const shell = $('#shell');
const setMenu = (open) => { shell.classList.toggle('menu', open); $('#scrim').hidden = !open; };
$('#menuBtn').addEventListener('click', () => setMenu(!shell.classList.contains('menu')));
$('#scrim').addEventListener('click', () => setMenu(false));
$('#propsBtn').addEventListener('click', () => { shell.classList.toggle('no-props'); requestAnimationFrame(drawEdges); });
$('#propsClose').addEventListener('click', () => { shell.classList.add('no-props'); requestAnimationFrame(drawEdges); });
$('#railWorkflow').addEventListener('click', (e) => { e.preventDefault(); select(null); setMenu(false); });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search').focus(); }
  if (e.key === 'Escape') setMenu(false);
});
const markDirty = () => $('#dirty').classList.remove('clean');
$('#wfName').addEventListener('input', () => { markDirty(); if (!S.sel) renderProps(); });

/* ---------------- component tree ---------------- */
function itemHtml(name, kind) {
  const info = INFO[name] || {};
  const c = kind === 'mol' ? 'var(--c-mol)' : 'var(--c-atom)';
  return `<button type="button" class="item${S.component === name ? ' sel' : ''}" draggable="true" data-comp="${esc(name)}" style="--c:${c}" title="${esc(info.text || '')}">
    <span class="code${kind === 'mol' ? ' mol' : ''}">${esc(info.code || '?')}</span><span class="nm">${esc(kind === 'mol' ? name : short(name))}</span><span class="tag">${kind === 'mol' ? 'MOL' : 'ATOM'}</span></button>`;
}
function renderTree() {
  const q = ($('#filter').value + ' ' + $('#search').value).trim().toLowerCase();
  const hit = (name) => !q || q.split(/\s+/).every((w) => (name + ' ' + (INFO[name]?.group || '') + ' ' + (INFO[name]?.text || '') + ' ' + manifestOf(name).title).toLowerCase().includes(w));
  let html = '';
  let shown = 0;
  const ioHit = !q || 'fasta girdi çıktı eşleşme jsonl'.split(' ').some((w) => q.split(/\s+/).every((x) => w.includes(x) || 'fasta girdi çıktı eşleşme jsonl'.includes(x)));
  if (ioHit) {
    html += `<details class="grp" open><summary>Dosyalar ve tablolar<span class="n">2</span></summary>
      <div class="item" style="--c:var(--c-in);cursor:default" data-pick="in"><span class="code io">FA</span><span class="nm">FASTA girdisi</span><span class="tag">GİRDİ</span></div>
      <div class="item" style="--c:var(--c-out);cursor:default" data-pick="out"><span class="code out">JL</span><span class="nm">Eşleşmeler (JSONL)</span><span class="tag">ÇIKTI</span></div></details>`;
  }
  const mol = hit('ExactMatch');
  const groups = GROUPS.map((g) => ({ ...g, items: atoms.filter((m) => INFO[m.name]?.group === g.key || (g.key === 'örnek' && ['örnek', 'oracle'].includes(INFO[m.name]?.group))).filter((m) => hit(m.name)) }));
  const nAtoms = groups.reduce((s, g) => s + g.items.length, 0);
  if (mol || nAtoms) {
    html += `<details class="grp" open><summary>Dizi analizi <span class="badge">${atoms.length} atom · 1 molekül</span><span class="n">${atoms.length + 1}</span></summary>`;
    html += `<details class="grp" open style="margin-left:6px"><summary>Desen eşleştirme · tam<span class="n">${(mol ? 1 : 0) + nAtoms}</span></summary>`;
    if (mol) { html += `<p class="sub-h">Moleküller</p>${itemHtml('ExactMatch', 'mol')}`; shown++; }
    for (const g of groups) {
      if (!g.items.length) continue;
      html += `<p class="sub-h">${esc(g.title)}</p>` + g.items.map((m) => itemHtml(m.name, 'atom')).join('');
      shown += g.items.length;
    }
    html += '</details></details>';
  }
  $('#treeBody').innerHTML = html || '<p class="empty" style="padding:8px 4px">Eşleşen bileşen yok.</p>';
  $('#treeCount').textContent = `${shown} / ${atoms.length + 1}`;
  $$('#treeBody .item[data-comp]').forEach((el) => {
    el.addEventListener('click', () => showComponent(el.dataset.comp));
    el.addEventListener('dblclick', () => useComponent(el.dataset.comp));
    el.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', el.dataset.comp); e.dataTransfer.effectAllowed = 'copy'; });
  });
  $$('#treeBody [data-pick]').forEach((el) => el.addEventListener('click', () => { select(el.dataset.pick); setMenu(false); }));
}
$('#filter').addEventListener('input', renderTree);
$('#search').addEventListener('input', renderTree);
$('#search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const first = $('#treeBody .item[data-comp]');
  if (first) { showComponent(first.dataset.comp); if (matchMedia('(max-width: 900px)').matches) setMenu(true); }
});

let previewComp = null; // a component shown in the properties panel from the tree, not yet placed
function showComponent(name) { previewComp = name; S.sel = 'preview'; S.ptab = 'main'; renderNodes(); renderProps(); }
function useComponent(name) {
  S.component = name; S.record = null; S.matches = []; S.total = 0; S.runMs = null; S.status = 'idle';
  previewComp = null; markDirty(); renderTree(); select('comp'); toast(`${name === 'ExactMatch' ? 'ExactMatch molekülü' : short(name) + ' atomu'} iş akışına yerleştirildi.`);
}

/* ---------------- canvas ---------------- */
const world = $('#world');
const canvas = $('#canvas');
const NODE_DEF = {
  in: () => ({ c: 'var(--c-in)', code: 'FA', cls: 'io', title: 'FASTA girdisi', sub: SAMPLES[S.sample].label, ports: ['', 'kayıtlar'] }),
  comp: () => {
    const isMol = S.component === 'ExactMatch';
    const sub = S.record ? `seçilen: ${short(S.record.selected)}` : isMol ? 'strateji: otomatik' : 'zorunlu atom';
    return { c: isMol ? 'var(--c-mol)' : 'var(--c-atom)', code: INFO[S.component].code, cls: isMol ? 'mol' : '', title: isMol ? 'ExactMatch' : short(S.component), sub, ports: ['kayıtlar', 'eşleşmeler'] };
  },
  out: () => ({ c: 'var(--c-out)', code: 'JL', cls: 'out', title: 'Eşleşmeler', sub: S.runMs != null ? `${S.total.toLocaleString('tr-TR')} eşleşme` : 'Sequence.Match · JSONL', ports: ['eşleşmeler', ''] }),
};
function renderNodes() {
  $$('.node', world).forEach((n) => n.remove());
  for (const id of ['in', 'comp', 'out']) {
    const d = NODE_DEF[id]();
    const p = S.nodes[id];
    const st = S.status === 'run' ? 'run' : S.status === 'err' ? 'err' : S.status === 'ok' ? 'ok' : '';
    const el = document.createElement('div');
    el.className = `node${S.sel === id ? ' sel' : ''}`;
    el.dataset.id = id;
    el.style.cssText = `--c:${d.c};left:${p.x}px;top:${p.y}px`;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${d.title} düğümü`);
    el.innerHTML = `<div class="node-h"><span class="chev">›</span><span class="code ${d.cls}">${esc(d.code)}</span><span class="st ${st}"></span><span class="t">${esc(d.title)}</span></div>
      <div class="node-s">${esc(d.sub)}</div><div class="node-p"><span>${esc(d.ports[0])}</span><span>${esc(d.ports[1])}</span></div>
      ${id !== 'in' ? '<span class="port in"></span>' : ''}${id !== 'out' ? '<span class="port out"></span>' : ''}`;
    world.appendChild(el);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } });
    dragNode(el, id);
  }
  drawEdges();
}
function drawEdges() {
  const pt = (id, side) => {
    const el = $(`.node[data-id="${id}"]`, world);
    if (!el) return { x: 0, y: 0 };
    const p = S.nodes[id];
    return { x: p.x + (side === 'out' ? el.offsetWidth : 0), y: p.y + el.offsetHeight / 2 };
  };
  const path = (a, b) => { const dx = Math.max(40, (b.x - a.x) / 2); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };
  const live = S.status === 'run' ? ' class="live"' : '';
  $('#edges').innerHTML = `<path${live} d="${path(pt('in', 'out'), pt('comp', 'in'))}"/><path${live} d="${path(pt('comp', 'out'), pt('out', 'in'))}"/>`;
}
function applyView() {
  world.style.transform = `translate(${S.pan.x}px, ${S.pan.y}px) scale(${S.zoom})`;
  $('#zoomVal').textContent = `${Math.round(S.zoom * 100)} %`;
}
function setZoom(z, cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2) {
  z = Math.min(2, Math.max(0.4, z));
  S.pan.x = cx - ((cx - S.pan.x) * z) / S.zoom;
  S.pan.y = cy - ((cy - S.pan.y) * z) / S.zoom;
  S.zoom = z; applyView();
}
function fit() {
  const nodes = $$('.node', world);
  if (!nodes.length) return;
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (const n of nodes) { const p = S.nodes[n.dataset.id]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + n.offsetWidth); y1 = Math.max(y1, p.y + n.offsetHeight); }
  const pad = 40; const w = canvas.clientWidth; const h = canvas.clientHeight;
  const z = Math.min(1, Math.max(0.4, Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0))));
  S.zoom = z; S.pan.x = (w - (x1 - x0) * z) / 2 - x0 * z; S.pan.y = (h - (y1 - y0) * z) / 2 - y0 * z; applyView();
}
$('#zoomIn').addEventListener('click', () => setZoom(S.zoom * 1.2));
$('#zoomOut').addEventListener('click', () => setZoom(S.zoom / 1.2));
$('#zoomFit').addEventListener('click', fit);
canvas.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  setZoom(S.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

function dragNode(el, id) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, nx: S.nodes[id].x, ny: S.nodes[id].y };
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = (ev.clientX - start.x) / S.zoom; const dy = (ev.clientY - start.y) / S.zoom;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      S.nodes[id] = { x: Math.round(start.nx + dx), y: Math.round(start.ny + dy) };
      el.style.left = `${S.nodes[id].x}px`; el.style.top = `${S.nodes[id].y}px`;
      drawEdges();
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); if (moved) markDirty(); else select(id); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}
canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('.node, .zoom')) return;
  const start = { x: e.clientX, y: e.clientY, px: S.pan.x, py: S.pan.y };
  let moved = false;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('panning');
  const move = (ev) => { const dx = ev.clientX - start.x; const dy = ev.clientY - start.y; if (Math.hypot(dx, dy) > 3) moved = true; S.pan.x = start.px + dx; S.pan.y = start.py + dy; applyView(); };
  const up = () => { canvas.classList.remove('panning'); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up); if (!moved) select(null); };
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
});
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drop'); $('.node[data-id="comp"]', world)?.classList.add('drop-target'); });
canvas.addEventListener('dragleave', (e) => { if (!canvas.contains(e.relatedTarget)) { canvas.classList.remove('drop'); $('.node[data-id="comp"]', world)?.classList.remove('drop-target'); } });
canvas.addEventListener('drop', (e) => {
  e.preventDefault(); canvas.classList.remove('drop');
  const name = e.dataTransfer.getData('text/plain');
  if (INFO[name]) useComponent(name);
});

let toastTimer = 0;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }

/* ---------------- run / explain / bench ---------------- */
function setStatus(st, label) {
  S.status = st;
  const p = $('#status');
  p.className = `pill ${st === 'run' ? 'run' : st === 'ok' ? 'ok' : st === 'err' ? 'err' : ''}`;
  $('span', p).textContent = label;
}
const busy = (on) => ['#runBtn', '#explainBtn', '#benchBtn'].forEach((s) => { $(s).disabled = on; });
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function ensureText() {
  if (!S.text) S.text = await loadSample(S.sample);
  if (S.sample === 'many' && !S.patterns) S.patterns = manyPatterns(S.text);
}
async function run() {
  busy(true); setStatus('run', 'çalışıyor…'); renderNodes();
  await nextFrame();
  try {
    await ensureText();
    const t0 = performance.now();
    const { molecule, matches } = facade.run(S.text, opts(), S.component);
    const keep = []; let total = 0;
    for (const m of matches) { if (keep.length < 500) keep.push(m); total++; }
    S.runMs = performance.now() - t0;
    S.record = molecule.record; S.matches = keep; S.total = total; S.error = null;
    setStatus('ok', `bitti · ${fmt(S.runMs)}`);
    $('#dirty').classList.add('clean');
    toast(`${total.toLocaleString('tr-TR')} eşleşme · ${short(S.record.selected)} · ${fmt(S.runMs)}`);
    if (!S.sel || S.sel === 'preview') S.sel = 'out';
  } catch (err) {
    S.error = err.message; setStatus('err', 'hata'); toast(`Hata: ${err.message}`);
  }
  busy(false); renderNodes(); renderProps();
}
async function explain() {
  busy(true); await nextFrame();
  try {
    await ensureText();
    S.record = facade.explain(S.text, opts(), S.component); S.error = null;
    toast(`Karar: ${short(S.record.selected)} (${fmt(S.record.decisionMs)} içinde)`);
    S.sel = 'comp'; S.ptab = 'main';
  } catch (err) { S.error = err.message; toast(`Hata: ${err.message}`); }
  busy(false); renderNodes(); renderProps();
}
async function bench() {
  busy(true); setStatus('run', 'ölçülüyor…'); renderNodes();
  try {
    await ensureText();
    const decision = facade.explain(S.text, opts(), 'ExactMatch');
    const names = atoms.map((m) => m.name).filter((n) => n !== 'NaiveSearch');
    const times = {};
    for (const n of names) {
      await nextFrame();
      const once = () => { const t0 = performance.now(); let c = 0; for (const _ of facade.run(S.text, opts(), n).matches) c++; return performance.now() - t0; };
      once();
      const r = [once(), once(), once()].sort((a, b) => a - b);
      times[n] = r[1];
    }
    S.record = decision; S.bench = times;
    const fastest = Object.entries(times).sort((a, b) => a[1] - b[1])[0];
    setStatus('ok', 'ölçüm bitti');
    toast(`En hızlı: ${short(fastest[0])} (${fmt(fastest[1])}) · model seçimi: ${short(decision.selected)} (${fmt(times[decision.selected])})`);
    S.sel = 'comp'; S.ptab = 'main';
  } catch (err) { setStatus('err', 'hata'); toast(`Hata: ${err.message}`); }
  busy(false); renderNodes(); renderProps();
}
$('#runBtn').addEventListener('click', run);
$('#explainBtn').addEventListener('click', explain);
$('#benchBtn').addEventListener('click', bench);
$('#newBtn').addEventListener('click', async () => {
  S.sample = 'custom'; S.text = '>yeni_kayit\nACGTACGTTTGACGTACGTAAACGT\n'; S.patterns = 'ACGT,GTA'; S.component = 'ExactMatch';
  S.record = null; S.matches = []; S.total = 0; S.bench = null; S.runMs = null; setStatus('idle', 'çalışmadı');
  $('#wfName').value = 'Yeni iş akışı'; markDirty(); renderTree(); select('in');
});

/* ---------------- properties panel ---------------- */
$$('.ptabs button').forEach((b) => b.addEventListener('click', () => { S.ptab = b.dataset.pt; renderProps(); }));
function select(id) {
  S.sel = id; if (id !== 'preview') previewComp = null; S.ptab = 'main';
  if (id && matchMedia('(max-width: 900px)').matches) requestAnimationFrame(() => $('#props').scrollIntoView({ behavior: 'smooth', block: 'start' }));
  if (id && shell.classList.contains('no-props')) { shell.classList.remove('no-props'); requestAnimationFrame(drawEdges); }
  renderNodes(); renderProps();
}
const head = (icon, title, sub) => `<span class="ico">${icon}</span><div><h2>${esc(title)}</h2><p>${esc(sub)}</p></div>`;
const ICON_WF = '<svg viewBox="0 0 20 20"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M7 5h4a2 2 0 0 1 2 2v6"/></svg>';
const codeIcon = (name) => `<span class="code${name === 'ExactMatch' ? ' mol' : ''}">${esc(INFO[name].code)}</span>`;

function rankingHtml(rec, times) {
  const rows = rec.ranking.map((n) => [n, rec.estimates[n]]);
  const nulls = Object.keys(rec.excluded || {});
  const all = rows.map((r) => r[1]).concat(times ? Object.values(times) : []);
  const vals = all.filter((v) => v != null && v > 0);
  const lo = Math.log(Math.min(...vals) / 1.5); const hi = Math.log(Math.max(...vals));
  const w = (v) => `${Math.max(3, (100 * (Math.log(v) - lo)) / Math.max(1e-9, hi - lo)).toFixed(1)}%`;
  return `<ul class="rank">${rows.map(([n, v]) => `<li class="${n === rec.selected ? 'win' : ''}"><span>${esc(short(n))}</span><span class="bar-t"><i style="width:${w(v)}"></i>${times?.[n] != null ? `<b style="left:${w(times[n])}" title="ölçülen ${fmt(times[n])}"></b>` : ''}</span><span class="v">${fmt(v)}${times?.[n] != null ? `<br>${fmt(times[n])}` : ''}</span></li>`).join('')}
    ${nulls.map((n) => `<li><span>${esc(short(n))}</span><span class="na">uygulanamaz: ${esc(rec.excluded[n])}</span></li>`).join('')}</ul>
    <p class="legend">Logaritmik ölçek. Çubuk = modelin tahmini${times ? '; siyah çizgi ve alt satır = bu tarayıcıda ölçülen süre (3 ölçümün ortancası)' : ''}.</p>`;
}
function shapeChips(sh) {
  const c = [['n', sh.n.toLocaleString('tr-TR')], ['σ', sh.sigma], ['k', sh.k], ['m', sh.mMin === sh.mMax ? sh.mMin : `${sh.mMin}–${sh.mMax}`], ['Σf²', Number(sh.collision).toFixed(3)]];
  return `<div class="chips">${c.map(([k, v]) => `<span class="chip">${k} = ${esc(v)}</span>`).join('')}${sh.sampled ? '<span class="chip">örneklendi</span>' : ''}</div>`;
}

function renderProps() {
  $$('.ptabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.pt === S.ptab)));
  const body = $('#propsBody'); const hd = $('#propsHead');
  const adv = S.ptab === 'adv';
  if (S.sel === 'preview' && previewComp) {
    const m = manifestOf(previewComp); const info = INFO[previewComp];
    hd.innerHTML = head(codeIcon(previewComp), previewComp, `${m.kind === 'molecule' ? 'molekül' : 'atom'} · ${info.group === 'molekül' ? m.task : 'grup ' + info.group}`);
    body.innerHTML = adv ? `<pre class="json">${esc(JSON.stringify(m, null, 2))}</pre>`
      : `<p>${esc(info.text)}</p><dl class="kv"><dt>Ad</dt><dd><code>${esc(m.name)}</code></dd><dt>Başlık</dt><dd>${esc(m.title)}</dd><dt>Sürüm</dt><dd>${esc(m.version)}</dd><dt>Görev</dt><dd><code>${esc(m.task)}</code></dd><dt>Kaynak</dt><dd>${esc(m.references.join('; '))}</dd></dl>
        <div class="row-btns"><button class="btn primary" type="button" id="useBtn">İş akışında kullan</button></div>
        <p class="help">${previewComp === 'ExactMatch' ? 'Molekül, ilk kayda bakarak atomu kendisi seçer.' : 'Atom zorunlu strateji olarak çalışır; molekül seçim yapmaz.'}</p>`;
    $('#useBtn')?.addEventListener('click', () => useComponent(previewComp));
    return;
  }
  if (!S.sel) {
    hd.innerHTML = head(ICON_WF, 'İş akışı', 'iş akışı · seçili düğüm yok');
    body.innerHTML = adv ? `<pre class="json">${esc(JSON.stringify({ name: $('#wfName').value, target: 'browser', nodes: [{ id: 'in', type: 'FASTA', sample: S.sample }, { id: 'comp', component: S.component, params: opts() }, { id: 'out', type: 'Sequence.Match[]' }], edges: [['in', 'comp'], ['comp', 'out']] }, null, 2))}</pre>`
      : `<dl class="kv"><dt>Ad</dt><dd>${esc($('#wfName').value)}</dd><dt>Açıklama</dt><dd>FASTA kayıtlarında tam desen eşleştirme</dd><dt>Düğümler</dt><dd>3</dd><dt>Hedef</dt><dd>Tarayıcı</dd><dt>Son çalışma</dt><dd><span class="pill ${S.status === 'ok' ? 'ok' : ''}"><i></i>${S.status === 'ok' ? `${fmt(S.runMs)} · ${S.total.toLocaleString('tr-TR')} eşleşme` : 'çalışmadı'}</span></dd></dl>
        <p class="help">Ayarlarını görmek için bir düğüm seçin. Çalıştırma düğmeleri iş akışının kendi araç çubuğundadır.</p>`;
    return;
  }
  if (S.sel === 'in') {
    hd.innerHTML = head('<span class="code io">FA</span>', 'FASTA girdisi', 'girdi · Sequence[]');
    const recs = S.text ? [...parseFasta(S.text)] : [];
    const letters = recs.reduce((s, r) => s + r.seq.length, 0);
    body.innerHTML = adv ? `<dl class="kv"><dt>Kayıt</dt><dd>${recs.length}</dd><dt>Harf</dt><dd>${letters.toLocaleString('tr-TR')}</dd><dt>İlk başlık</dt><dd>${esc(recs[0]?.header || '–')}</dd></dl><p class="help">Molekül kararını yalnızca ilk kayda bakarak verir; seçilen atom bütün kayıtlarda çalışır.</p>`
      : `<label class="field"><span>Örnek veri</span><select id="sampleSel">${Object.entries(SAMPLES).map(([k, s]) => `<option value="${k}"${k === S.sample ? ' selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
        <label class="field"><span>FASTA metni</span><textarea id="fastaTa" spellcheck="false" ${S.sample === 'custom' ? '' : 'readonly'}>${esc(S.text.length > 6000 ? S.text.slice(0, 6000) + '\n…' : S.text)}</textarea></label>
        <p class="help">${S.sample === 'custom' ? 'Metni düzenleyebilirsiniz.' : `${recs.length} kayıt, ${letters.toLocaleString('tr-TR')} harf. Düzenlemek için "Kendi FASTA metniniz"i seçin.`}</p>`;
    $('#sampleSel')?.addEventListener('change', async (e) => {
      S.sample = e.target.value; const s = SAMPLES[S.sample];
      S.text = S.sample === 'custom' ? '>benim_dizim\nACGTACGTTTGACGTACGT\n' : await loadSample(S.sample);
      S.patterns = s.patterns ?? manyPatterns(S.text);
      $('#wfName').value = s.name; S.record = null; S.runMs = null; S.bench = null; setStatus('idle', 'çalışmadı'); markDirty(); renderNodes(); renderProps();
    });
    $('#fastaTa')?.addEventListener('input', (e) => { S.text = e.target.value; S.record = null; S.runMs = null; markDirty(); });
    return;
  }
  if (S.sel === 'comp') {
    const m = manifestOf(S.component); const isMol = S.component === 'ExactMatch';
    hd.innerHTML = head(codeIcon(S.component), isMol ? 'ExactMatch' : short(S.component), `${isMol ? 'molekül' : 'atom (zorunlu)'} · ${m.task}`);
    if (adv) { body.innerHTML = `<p class="sec">Manifest</p><pre class="json">${esc(JSON.stringify(m, null, 2))}</pre>${S.record ? `<p class="sec">Karar kaydı (record)</p><pre class="json">${esc(JSON.stringify(S.record, null, 2))}</pre>` : ''}`; return; }
    const rec = S.record;
    body.innerHTML = `<label class="field"><span>Desenler (virgülle ayrılmış)</span><textarea id="patTa" spellcheck="false" style="min-height:64px">${esc(S.patterns)}</textarea></label>
      <p class="help">${patternList().length} desen</p>
      <label class="check"><input type="checkbox" id="icChk"${S.ignoreCase ? ' checked' : ''}> ignoreCase (büyük/küçük harf duyarsız)</label>
      <label class="field"><span>Strateji</span><select id="stratSel"><option value="ExactMatch"${isMol ? ' selected' : ''}>auto (ExactMatch seçsin)</option>${atoms.map((a) => `<option value="${a.name}"${a.name === S.component ? ' selected' : ''}>${esc(short(a.name))}</option>`).join('')}</select></label>
      ${S.error ? `<p class="why" style="background:transparent;border:1px solid var(--bad)"><b style="color:var(--bad)">Hata:</b> ${esc(S.error)}</p>` : ''}
      ${rec ? `<p class="sec">Karar</p><div class="why"><b>${esc(short(rec.selected))}</b> · ${esc(rec.why)}</div>${shapeChips(rec.shape)}<p class="help" style="margin-top:0">Karar süresi ${fmt(rec.decisionMs)} · planlanan kayıt ${rec.plannedRecords}</p>
        <p class="sec">Tahmini süreler</p>${rankingHtml(rec, S.bench)}` : '<p class="empty">Kararı görmek için <b>Açıkla</b>, eşleşmeler için <b>Tarayıcıda çalıştır</b>.</p>'}`;
    $('#patTa').addEventListener('input', (e) => { S.patterns = e.target.value; S.record = null; S.bench = null; S.runMs = null; markDirty(); $('.help', body).textContent = `${patternList().length} desen`; });
    $('#icChk').addEventListener('change', (e) => { S.ignoreCase = e.target.checked; S.record = null; markDirty(); });
    $('#stratSel').addEventListener('change', (e) => useComponent(e.target.value));
    return;
  }
  if (S.sel === 'out') {
    hd.innerHTML = head('<span class="code out">JL</span>', 'Eşleşmeler', 'çıktı · Sequence.Match[] (JSONL)');
    if (S.runMs == null) { body.innerHTML = '<p class="empty">Henüz çalıştırılmadı. Araç çubuğundaki <b>Tarayıcıda çalıştır</b> düğmesine basın.</p>'; return; }
    if (adv) { body.innerHTML = `<pre class="json">${esc(S.matches.slice(0, 50).map((x) => JSON.stringify(x)).join('\n'))}</pre>`; return; }
    body.innerHTML = `<dl class="kv"><dt>Toplam</dt><dd>${S.total.toLocaleString('tr-TR')} eşleşme</dd><dt>Atom</dt><dd>${esc(S.record.selected)}</dd><dt>Süre</dt><dd>${fmt(S.runMs)} (karar dahil)</dd></dl>
      <div class="row-btns"><button class="btn" type="button" id="dlBtn">JSONL indir</button></div>
      <table class="m"><thead><tr><th>Kayıt</th><th>Desen</th><th class="r">Konum</th></tr></thead><tbody>${S.matches.slice(0, 200).map((x) => `<tr><td>${esc(x.header.slice(0, 18))}</td><td><code>${esc(x.pattern.slice(0, 14))}</code></td><td class="r">${x.position.toLocaleString('tr-TR')}</td></tr>`).join('')}</tbody></table>
      ${S.total > 200 ? `<p class="help" style="margin-top:8px">İlk 200 eşleşme gösteriliyor.</p>` : ''}`;
    $('#dlBtn').addEventListener('click', () => {
      const lines = [...facade.runJsonl(S.text, opts(), S.component)].join('\n') + '\n';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([lines], { type: 'application/x-ndjson' }));
      a.download = 'eslesmeler.jsonl'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
}

/* ---------------- start ---------------- */
renderTree();
renderNodes();
renderProps();
requestAnimationFrame(fit);
addEventListener('resize', () => requestAnimationFrame(fit));
S.text = await loadSample(S.sample);
renderProps();
