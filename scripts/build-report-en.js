/**
 * Builds the English version of the report (Görev 5) from the same stored results:
 *   docs/report/report-en.html  (HTML version)
 *   docs/report/Report-EN.pdf   (A4 PDF, printed with headless Chromium if Playwright is available)
 * The Turkish version is built by scripts/build-report.js. Every number is read from
 * bench/results/*.json and src/selection/coefficients.js, exactly as in the Turkish report.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CALIBRATION } from '../src/selection/coefficients.js';
import { registry } from '../src/registry.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const cal = JSON.parse(read('bench/results/calibration.json'));
const val = JSON.parse(read('bench/results/validation.json'));
const analysis = JSON.parse(read('docs/report/analysis.en.json')); // hand-written analysis of wrong choices (English)

// The figures are generated with Turkish labels (bench/figures.js); translate the labels for this version.
const FIG_EN = [
  ['Kalibrasyon ızgarasında en hızlı atom (satır: desen uzunluğu m, sütun: desen sayısı k)', 'Fastest atom on the calibration grid (rows: pattern length m, columns: number of patterns k)'],
  ['Halka: uydurulan maliyet modelinin farklı bir atom seçtiği hücre (örnek içi).', 'Ring: cell where the fitted cost model chooses a different atom (in-sample).'],
  [/Doğrulama \((\d+) görülmemiş vaka\): en hızlı atoma göre geometrik ortalama yavaşlama/g, 'Validation ($1 unseen cases): geometric-mean slowdown relative to the fastest atom'],
  ['log ölçek; 1,0 = her zaman en hızlı; düşük daha iyi', 'log scale; 1.0 = always the fastest; lower is better'],
  ['Belirli bir yavaşlamanın altında kalan vaka oranı (ECDF; sol üst daha iyi)', 'Share of cases below a given slowdown (ECDF; top left is better)'],
  ['yavaşlama = seçilen süre / en hızlı süre (log ölçek)', 'slowdown = chosen time / fastest time (log scale)'],
  [/: %(\d+) vaka %10 içinde/g, ': $1% of cases within 10%'],
  ['(en iyi sabit atom)', '(best fixed atom)'],
  ['Allmer 2016 kuralı', 'Allmer 2016 rule'],
  [/>hep /g, '>always '],
  ['Maliyet modeli: tahmin ve ölçülen süre (bütün atomlar, doğrulama)', 'Cost model: predicted and measured time (all atoms, validation)'],
  ["ExactMatch'in seçtiği atom", 'atom chosen by ExactMatch'],
  ['diğer atomlar; kesikli çizgi = kusursuz tahmin', 'other atoms; dashed line = perfect prediction'],
  ['tahmin (ms)', 'predicted (ms)'],
  ['ölçülen (ms)', 'measured (ms)'],
];
const svg = (name) => FIG_EN.reduce((s, [a, b]) => (typeof a === 'string' ? s.split(a).join(b) : s.replace(a, b)), read(`docs/figures/${name}`).replace(/<\?xml[^>]*>/, ''));

const f2 = (x) => x.toFixed(2);
const f3 = (x) => x.toFixed(3);
const pct = (x) => (x == null ? '–' : `${(x * 100).toFixed(1)}%`);
const short = (s) => s.replace('Search', '');
const T = val.tables;
const get = (set, policy) => T[set].find((r) => r.policy === policy);
const bestSingle = (set) => T[set].filter((r) => r.policy.startsWith('always')).sort((a, b) => a.geoMean - b.geoMean)[0];
const EM = get('ALL', 'ExactMatch (auto)');
const AL = get('ALL', 'Allmer 2016 rule');
const BS = bestSingle('ALL');
const E2E = get('ALL', 'ExactMatch end-to-end (measured, incl. decision)');
const m = val.machine;
const decisions = val.results.map((r) => r.decisionMs).sort((a, b) => a - b);
const decMed = decisions[decisions.length >> 1];
const nVal = val.results.length;
const nSynth = val.results.filter((r) => r.set !== 'R').length;
const testCount = 518;

function policyRows(set, limit = 99) {
  const rows = [...T[set]].filter((r) => !r.policy.startsWith('ExactMatch end')).sort((a, b) => a.geoMean - b.geoMean).slice(0, limit);
  return rows.map((r) => `<tr${r.policy.startsWith('ExactMatch') ? ' class="hl"' : ''}><td>${r.policy.replace('Search', '')}</td><td>${pct(r.pickFastest)}</td><td>${pct(r.within10)}</td><td>${f3(r.geoMean)}</td><td>${f2(r.worst)}×</td><td>${f3(r.totalRatio)}</td></tr>`).join('');
}
const tableHead = '<tr><th>Policy</th><th>Picks fastest</th><th>Within 10%</th><th>Geo-mean slowdown</th><th>Worst</th><th>Total / best</th></tr>';

const worst = [...val.results].sort((a, b) => b.times[b.chosen] / b.bestMs - a.times[a.chosen] / a.bestMs).slice(0, 6);
const worstRows = worst.map((r) => `<tr><td>${r.id}</td><td>${r.alphabet}</td><td>${r.n.toLocaleString('en-US')}</td><td>${r.records}</td><td>${r.k}</td><td>${r.mMin}–${r.mMax}</td><td>${short(r.fastest)} (${f2(r.bestMs)} ms)</td><td>${short(r.chosen)} (${f2(r.times[r.chosen])} ms)</td><td>${f2(r.times[r.chosen] / r.bestMs)}×</td></tr>`).join('');

const coefRows = Object.entries(CALIBRATION.atoms).map(([name, a]) => `<tr><td>${short(name)}</td><td>${a.rows}</td><td>${(a.medianRelErr * 100).toFixed(1)}%</td><td class="mono">${Object.entries(a.coef).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v.toExponential(2)}`).join(' ')}</td></tr>`).join('');

const winCounts = {};
for (const c of cal.cases) winCounts[c.fastest] = (winCounts[c.fastest] ?? 0) + 1;
const winList = Object.entries(winCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${short(k)} ${v}`).join(', ');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Report: the ExactMatch molecule</title>
<style>
  @page { size: A4; margin: 15mm 16mm 16mm 16mm; }
  :root { --ink:#141414; --ink2:#4a4945; --muted:#7a7974; --rule:#dcdbd5; --accent:#1c5cab; --hl:#eef4fc; }
  * { box-sizing: border-box; }
  body { font-family: 'Bitstream Charter', 'Charter', Georgia, serif; font-size: 9.6pt; line-height: 1.38; color: var(--ink); margin: 0 auto; max-width: 820px; padding: 0 16px; background: #fff; }
  h1, h2, h3, th, .meta, figcaption, .kicker { font-family: Inter, 'Helvetica Neue', Arial, sans-serif; }
  h1 { font-size: 17pt; line-height: 1.2; margin: 0 0 4px; letter-spacing: -0.01em; }
  .kicker { color: var(--accent); font-size: 8pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; margin-top: 4px; }
  .meta { color: var(--ink2); font-size: 8.4pt; margin-bottom: 8px; }
  .abstract { border-left: 3px solid var(--accent); padding: 6px 10px; background: #f7f9fc; margin: 8px 0 10px; }
  h2 { font-size: 11.2pt; margin: 12px 0 4px; padding-top: 4px; border-top: 1px solid var(--rule); }
  h3 { font-size: 9.6pt; margin: 8px 0 2px; }
  p { margin: 0 0 5px; text-align: justify; hyphens: auto; }
  ul { margin: 2px 0 6px 0; padding-left: 16px; } li { margin: 1px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 8pt; margin: 4px 0 8px; font-variant-numeric: tabular-nums; }
  th { text-align: left; font-weight: 600; font-size: 7.6pt; color: var(--ink2); border-bottom: 1px solid var(--ink); padding: 2px 4px; }
  td { border-bottom: 1px solid var(--rule); padding: 2px 4px; vertical-align: top; }
  td:not(:first-child) { white-space: nowrap; }
  table.wrap td { white-space: normal; }
  tr.hl td { background: var(--hl); font-weight: 600; }
  code, .mono { font-family: 'JetBrains Mono', 'DejaVu Sans Mono', monospace; font-size: 7.8pt; }
  pre { font-family: 'JetBrains Mono', monospace; font-size: 7.6pt; background: #f5f5f2; padding: 6px 8px; border-radius: 4px; overflow-x: auto; margin: 4px 0 8px; white-space: pre-wrap; }
  figure { margin: 6px 0 8px; break-inside: avoid; }
  h2, h3 { break-after: avoid; page-break-after: avoid; }
  figure svg { width: 100%; height: auto; display: block; }
  figcaption { font-size: 7.8pt; color: var(--ink2); margin-top: 2px; }
  .two { display: grid; grid-template-columns: 1fr; gap: 6px; }
  .two figure svg { width: 84%; margin: 0 auto; }
  table { break-inside: avoid; }
  .note { font-size: 8pt; color: var(--ink2); }
  .appendix { break-before: page; }
  .avoid { break-inside: avoid; }
  @media screen { body { padding-top: 24px; padding-bottom: 48px; } }
  @media (max-width: 640px) { .two { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
</style></head><body>

<div class="kicker">IoS component publication · sequence.pattern-match.exact</div>
<h1>ExactMatch: a molecule that picks the fastest exact-matching atom for the shape of its input</h1>
<div class="meta">Qunoo A K Taweel (23291712) · Zeynep Arıcan (24290319) · YZM327 Midterm project (Assignment 3) · November 2026 · Code: github.com/Qanoo-Taweel/ios-adaptive-exact-match</div>

<div class="abstract"><p><b>Abstract.</b> We wrote twelve exact-matching atoms (ten of them new: Horspool, bm4DNADS, bm4DNAHMbs, Shift-Or, KMP, Rabin-Karp, Aho-Corasick, Wu-Manber, suffix array, FM-index) and an <code>ExactMatch</code> molecule that chooses among them. From the character frequencies of the first record and the actual patterns, the molecule computes the expected operation counts of every atom, multiplies them by coefficients measured on a ${cal.cases.length}-case calibration grid, and picks the cheapest atom. On ${nVal} cases not used in calibration (including three new alphabets and real data), the molecule's geometric-mean slowdown is <b>${f3(EM.geoMean)}</b>; the Allmer 2016 rule reaches ${f3(AL.geoMean)} and the best fixed atom (always ${short(BS.policy.replace('always ', ''))}) ${f3(BS.geoMean)}. In ${testCount} tests every atom gives, element by element, the same result as the NaiveSearch oracle.</p></div>

<h2>1. What it does and why</h2>
<p>There is no single "best" algorithm for finding all occurrences of one or more patterns in a text: an algorithm that is good for short patterns falls behind on long ones, and one that is good for a single pattern falls behind on many. Our component performs the IoS task <code>sequence.pattern-match.exact</code>: it takes FASTA records and a list of patterns and returns all exact matches, overlapping ones included, in the order defined by the contract. Approximate matching is out of scope.</p>
<p><b>Our contributions:</b> (i) atoms from all four groups, including two bonus atoms (Wu-Manber, FM-index); (ii) a <i>character-frequency-aware</i> cost model instead of a rule table (a new atom brings only its own features and default coefficients); (iii) extension without touching the molecule's code, thanks to the registry, a selection pipeline built with Chain of Responsibility, and dependency injection; (iv) a correctness suite of ${testCount} tests and an honest comparison on ${nVal} unseen cases.</p>

<h2>2. Algorithms</h2>
<p>All atoms derive from the base class <code>ExactSearchAtom</code> (Template Method): parameter checks, ASCII <code>ignoreCase</code>, searching duplicate patterns once and reporting each copy separately, and output ordering live in the base class; an atom only implements <code>prepare()</code> and <code>findAll()</code>. The text is first encoded into a <b>reduced alphabet</b>: characters that occur in the patterns become 1..S−1 and all others become 0 (0 can take part in no match). For pure ASCII texts the encoding uses the native <code>TextEncoder.encodeInto</code> plus an in-place table (~2× faster). No atom uses <code>indexOf</code>, <code>RegExp</code> or similar; a test checks this by scanning the source code.</p>
<table class="wrap"><tr><th>Atom (group)</th><th>Idea</th><th>Preprocessing</th><th>Search (avg. / worst)</th></tr>
<tr><td>Horspool (A)</td><td>Bad-character shift on the last character of the window</td><td>O(m+S)</td><td>~n/E[shift] / O(nm)</td></tr>
<tr><td>bm4DNADS (A)</td><td>Tuned BM: last character 0 in the shift table, skip loop unrolled 3 times, sentinel</td><td>O(m+S)</td><td>like Horspool, fewer branches</td></tr>
<tr><td>bm4DNAHMbs (A)</td><td>Shift on a q-gram digest packed with bit shifts (q = ⌊14/b⌋, b = log₂S)</td><td>O(m+2^{bq})</td><td>~n/(m−q+1) / O(nm)</td></tr>
<tr><td>Shift-Or (A)</td><td>Bit-parallel state; short patterns are packed into one 32-bit word</td><td>O(Σm+S)</td><td>O(n · number of words)</td></tr>
<tr><td>KMP (B)</td><td>Strong failure function, never moves back in the text</td><td>O(m)</td><td>O(n) per pattern</td></tr>
<tr><td>Rabin-Karp (B)</td><td>Rolling hash mod 2³²; one pass per length, always verifies on equal hashes</td><td>O(Σm)</td><td>O(n · distinct lengths)</td></tr>
<tr><td>Aho-Corasick (C)</td><td>Full DFA table + dictionary suffix links, single pass</td><td>O(Σm·S)</td><td>O(n + occ)</td></tr>
<tr><td>Wu-Manber (C)</td><td>Block shift of B characters, bounded by the shortest pattern length; verification through buckets</td><td>O(Σm+2^{bB})</td><td>~n/(ℓmin−B+1)</td></tr>
<tr><td>Suffix array (D)</td><td>Prefix doubling + counting sort; two binary searches</td><td>O(n log n)</td><td>O(m log n + occ)</td></tr>
<tr><td>FM-index (D)</td><td>SA → BWT → C[], an Occ checkpoint every 64 rows; backward search</td><td>O(n log n)</td><td>O(m + occ)</td></tr>
<tr><td>Boyer-Moore, Naive</td><td>Starter-package example (bad character + strong good suffix) and brute-force oracle</td><td>O(m+S) / –</td><td>sublinear / O(nm)</td></tr></table>
<h3>Where we deviate from the paper (Allmer 2016) and the original descriptions</h3>
<ul>
<li><b>bm4DNAHMbs, shift for an unseen q-gram.</b> The pseudocode shifts by m for a q-gram that does not occur in the pattern. This is not safe: the window can pass over a match that starts with the last q−1 characters of the unseen q-gram. The largest safe shift is <b>m−q+1</b>. A test (negative control) shows that with m the match <code>ACGTT</code> in <code>GGGACGTT</code> is lost. Because the digest is exact (not folded), the last q-gram is compared by integer equality and only the remaining m−q characters are verified.</li>
<li><b>bm4DNADS.</b> The sentinel is not written into the caller's text (strings are immutable and the contract forbids side effects); m cells are appended to the encoded copy and filled with the last pattern character. When the skip loop stops on the sentinel, <code>i ≥ n</code> is checked separately; after a verification, Hume-Sunday's safe "md2" shift is used instead of 1.</li>
<li><b>Shift-Or</b> was extended to multiple patterns with word packing; patterns with m &gt; 32 still work correctly (the first 32 characters act as a filter, followed by verification), but in automatic selection the atom declares itself <i>not applicable</i>.</li>
<li><b>Wu-Manber</b> does not use the PREFIX table (the block digest is exact, so buckets are short); <b>FM-index</b> keeps the full SA instead of a sampled one for locating matches (speed over memory).</li></ul>

<h2>3. Inputs, outputs and parameters</h2>
<p><b>Input:</b> a stream of <code>FASTA.Entry</code> <code>{ header, seq }</code>. <b>Parameters:</b> <code>patterns</code> (a non-empty list of non-empty strings; otherwise an error), <code>ignoreCase</code> (ASCII A–Z/a–z only), and for the molecule <code>strategy</code> (<code>"auto"</code> or an atom name; an unknown name raises an error that lists the valid options). <b>Output:</b> <code>{ header, pattern, position, length }</code>; the position is a 0-based UTF-16 index; overlapping matches and every copy of a repeated pattern are reported; the order is record → position → pattern index; the pattern is written as given; if the pattern is longer than the text or the text is empty, the result is empty. <b>record:</b> <code>requested, selected, shape, estimates</code> (ms; <code>null</code> if not applicable), <code>ranking, excluded</code> (with the reason), <code>why, model, decisionMs</code>.</p>

<h2>4. Selection method</h2>
<p>The <b>data shape</b> is computed once from the first record (<code>ShapeBuilder</code>): n, σ, k, number of distinct patterns, m<sub>min</sub>/m<sub>max</sub>/m<sub>avg</sub>, number of distinct lengths, the pattern alphabet and the collision probability Σf(c)². For records longer than 2¹³ the frequencies are estimated from a sample of 32 blocks × 256 characters, so the decision time does not grow with n (median ${f3(decMed)} ms).</p>
<p><b>Cost model.</b> Each atom returns expected operation counts through <code>selection.features(shape)</code>, and the model computes <i>estimate = base + Σ c<sub>f</sub> · feature<sub>f</sub></i>. The features use the actual patterns and the character frequencies of the text: for Horspool, for example, the expected shift E[s] = Σ<sub>c</sub> f(c)·shift(c) is computed in closed form, the number of windows is n/E[s], and the number of verifications is windows × f(last character) × expected suffix length; for Shift-Or the word count comes from the packing; for Rabin-Karp from the groups of distinct lengths; for Wu-Manber from the block size and the probability that a block is in the table, k·(ℓmin−B+1)·(Σf²)<sup>B</sup>; for SA/FM the number of prefix-doubling rounds ≈ log₂(2 log<sub>1/Σf²</sub> n). The coefficients are fitted with non-negative least squares that minimise the sum of squared <i>relative</i> errors over ${cal.cases.length} cases (all subsets are tried for ≤ 6 features; exact NNLS). Relative error weighs 0.1 ms and 500 ms cases equally, because what matters is the ratio between atoms.</p>
<p><b>Stream prior.</b> Part of the cost is paid once per run (<code>prep</code>: pattern preprocessing, <code>base</code>: fixed overhead), and the rest is paid for every record (encoding, scanning, the text index for SA/FM). Because the decision may only look at the first record, a short first record (e.g. a single protein) is treated as part of a stream of ≈ 2¹⁶ characters: estimate = per run + R̂ · per record, with R̂ = min(128, round(2¹⁶ / n)). For a long first record (a genome) R̂ = 1. The R̂ used is written to <code>record.plannedRecords</code>.</p>
<p><b>Why a model rather than a rule?</b> A rule table has to be re-measured and edited by hand for every new atom; in the model a new atom brings its own features and can be selected with its own <code>defaults</code> coefficients even before calibration. Selection is a chain of four handlers that run in order: <i>Forced → Applicability → CostEstimation → Cheapest</i>. An atom that declares itself not applicable (NaiveSearch always; Shift-Or when m &gt; 32) is removed from the candidates, and the reason is written to <code>record.excluded</code>.</p>

<h2>5. How it was tested</h2>
<ul>
<li><b>Contract</b> (10 tests per atom): overlaps, ordering, repeated patterns, ASCII <code>ignoreCase</code> (é is not folded), UTF-16 positions (emoji), empty text/long pattern, invalid parameters, determinism; plus a scan of the source code for forbidden calls.</li>
<li><b>Per-atom special cases</b> (≥ 13 per atom): periodic ABAB, single character, text characters outside the alphabet, pattern = text, match at the end, patterns that are prefixes of each other, 64 patterns; algorithm-specific: the q-gram shift negative control, 32/40-character Shift-Or and word packing, the KMP border function, he/she/his/hers, the banana suffix array, mississippi FM counts.</li>
<li><b>Oracle equality</b>: the lambda phage genome (NC_001416.1, 48,502 bp; short, long, 200 patterns, lower case + ignoreCase), 126 E. coli K-12 proteins (stream), synthetic DNA/protein/text/binary/alphanumeric alphabets, repetitive ATAT…/AAAA… texts, mixed lengths, the same pattern twice, a stream with empty records. The oracle itself is also compared with an independent <code>indexOf</code> reference.</li>
<li><b>Seeded random</b>: 320 cases × 11 atoms (seed 424242). <b>Molecule</b>: record fields, choosing the cheapest estimate, ${registry.size} forced strategies giving the same result, a fake atom defined in the test being selectable, a not-applicable atom never being chosen on 25 different inputs, an injected cost model. <b>CLI</b>: run/explain/list and error exits.</li></ul>
<p>In total <b>${testCount} tests</b> pass with <code>npm test</code> in ~5 seconds without installing any dependency.</p>

<h2>6. Results</h2>
<p><b>Measurement setup.</b> ${m.cpu}, ${m.cores} cores, Node ${m.node}, ${m.platform}. One measurement = build the atom + process all records + consume all matches; 1 warm-up run, median of 3 repetitions; runs shorter than 2 ms are repeated inside one sample and averaged. Calibration: 3 alphabets (DNA, protein, English text) × n ∈ {10³, 10⁴, 10⁵, 10⁶} × m ∈ {4, 12, 24, 48, 96} × k ∈ {1, 4, 16, 64} = ${cal.cases.length} cases (10³ in addition to the required grid). Number of wins per atom: ${winList}. Validation: ${nSynth} synthetic cases (new seeds, n/m/k between the grid points, mixed pattern lengths, 1–4 records, <b>binary, alphanumeric and RNA</b> alphabets not used in calibration) + 24 real-data cases.</p>
<div class="avoid"><table>${tableHead}${policyRows('ALL', 8)}</table>
<p class="note">Table: all ${nVal} validation cases (first 8 policies; full tables in Appendix A). Geometric mean for the measured end-to-end time (decision included): ${f3(E2E.geoMean)}.</p></div>
<figure>${svg('fig1-winners.svg')}<figcaption>Figure 1. Fastest atom on the calibration grid (each panel is one alphabet × n; rows m, columns k). Ring: cell where the model chooses a different atom.</figcaption></figure>
<div class="two"><figure>${svg('fig2-policies.svg')}<figcaption>Figure 2. Geometric-mean slowdown of the policies (log scale).</figcaption></figure>
<figure>${svg('fig3-cdf.svg')}<figcaption>Figure 3. Distribution of the slowdown (ECDF).</figcaption></figure></div>
<p><b>Which atom wins where?</b> ${analysis.where}</p>
<h3>Analysis of wrong choices</h3>
<table><tr><th>Case</th><th>Alphabet</th><th>n</th><th>Records</th><th>k</th><th>m</th><th>Fastest</th><th>Chosen</th><th>Slowdown</th></tr>${worstRows}</table>
${analysis.wrong.map((p) => `<p>${p}</p>`).join('')}

<h2>7. Limitations</h2>
<ul>${analysis.limits.map((p) => `<li>${p}</li>`).join('')}</ul>

<h2>8. How to use it</h2>
<pre>npm test                       # ${testCount} tests, no dependencies
npm run calibrate              # ${cal.cases.length}-case grid → src/selection/coefficients.js
npm run bench                  # ${nVal}-case validation → bench/results/validation.{json,md}
node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto] &lt; input.fasta &gt; output.jsonl
node bin/ios.js explain --patterns GAATTC,GGATCC &lt; tests/data/lambda.fasta   # decision only (JSON)
node bin/ios.js run ExactMatch --patterns MKK --strategy AhoCorasickSearch &lt; tests/data/ecoli-proteins.fasta</pre>
<p>As a library: <code>new ExactMatch({ patterns, ignoreCase, strategy: 'auto' }).run(entries)</code>; a new atom: <code>registerAtom(MyAtom)</code>.</p>

<h2>References and tools</h2>
<p class="note">Allmer J. (2016) PeerJ PrePrints 4:e1758v1 · Boyer &amp; Moore (1977) CACM 20(10) · Horspool (1980) SP&amp;E 10(6) · Hume &amp; Sunday (1991) SP&amp;E 21(11) · Knuth, Morris &amp; Pratt (1977) SIAM J. Comput. 6(2) · Karp &amp; Rabin (1987) IBM J. R&amp;D 31(2) · Baeza-Yates &amp; Gonnet (1992) CACM 35(10) · Aho &amp; Corasick (1975) CACM 18(6) · Wu &amp; Manber (1994) TR-94-17 · Manber &amp; Myers (1993) SIAM J. Comput. 22(5) · Ferragina &amp; Manzini (2000) FOCS · Charras &amp; Lecroq, Exact String Matching Algorithms · Internet of Science, hub.ioscience.org/p/learn/. Data: NCBI RefSeq NC_001416.1; UniProtKB/Swiss-Prot (E. coli K-12, OX=83333). <b>Use of AI:</b> Claude Code (Anthropic) was used as an assistant for coding, writing tests, measurement scripts and preparing the documents; the design decisions, the results and this report were reviewed by the students.</p>

<section class="appendix">
<h2>Appendix A. Validation tables (all policies)</h2>
${['V', 'S', 'R'].map((s) => `<h3>${{ V: `Set V: ${T.V[0].n} multi-pattern cases`, S: `Set S: ${T.S[0].n} single-pattern cases (k = 1)`, R: `Set R: ${T.R[0].n} real-data cases (lambda, E. coli)` }[s]}</h3><table>${tableHead}${policyRows(s)}</table>`).join('')}
<h2>Appendix B. Calibrated coefficients</h2>
<p class="note">Seconds per feature unit. "rows": number of cases used in the fit (Shift-Or only m ≤ 32), "error": median absolute relative error (in-sample). In-sample selection: picks the fastest ${pct(CALIBRATION.meta.inSample.hit)}, geometric-mean slowdown ${f3(CALIBRATION.meta.inSample.geo)}.</p>
<table><tr><th>Atom</th><th>rows</th><th>error</th><th>coefficients</th></tr>${coefRows}</table>
<figure>${svg('fig4-accuracy.svg')}<figcaption>Figure 4. Predicted and measured times on the validation set (all atoms).</figcaption></figure>
<h2>Appendix C. Design patterns and SOLID</h2>
<table class="wrap"><tr><th>Pattern</th><th>Where</th><th>Why</th></tr>
<tr><td>Template Method</td><td><code>ExactSearchAtom.process()</code></td><td>The contract steps live in one place; atoms only implement <code>prepare/findAll</code>.</td></tr>
<tr><td>Strategy</td><td>12 atom classes</td><td>Same interface, interchangeable at run time (LSP; the contract tests are the same for all).</td></tr>
<tr><td>Registry</td><td><code>AtomRegistry</code></td><td>New atom = <code>register()</code>; the molecule does not change (OCP).</td></tr>
<tr><td>Factory Method</td><td><code>AtomFactory.create</code>, <code>ExactMatch.createAtom</code>, <code>CommandFactory</code></td><td>Objects are created by name; no dependency on concrete classes (DIP).</td></tr>
<tr><td>Chain of Responsibility</td><td><code>SelectionChain.js</code></td><td>Selection steps are independent; a new rule = a new handler.</td></tr>
<tr><td>Facade</td><td><code>IoSFacade</code></td><td>A single entry point for the CLI and the web demo.</td></tr>
<tr><td>Command</td><td><code>RunCommand</code>, <code>ExplainCommand</code>…</td><td>Each CLI verb is a testable object.</td></tr>
<tr><td>Builder</td><td><code>ShapeBuilder</code></td><td>The data shape is built the same way in the molecule, the benchmarks and the tests.</td></tr>
</table>
<p class="note">UML class diagrams (full, molecule, atoms, CLI, sequence diagram and simplified class diagram): <code>docs/uml/</code>.</p>
</section>
</body></html>`;

mkdirSync(new URL('docs/report/', root), { recursive: true });
writeFileSync(new URL('docs/report/report-en.html', root), html);
console.log('wrote docs/report/report-en.html');

try {
  const { loadPlaywright } = await import('./playwright.js');
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(new URL('docs/report/report-en.html', root).href);
  await page.pdf({ path: new URL('docs/report/Report-EN.pdf', root).pathname, format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '16mm', left: '16mm', right: '16mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-family:Inter,Arial;font-size:7px;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await browser.close();
  console.log('wrote docs/report/Report-EN.pdf');
} catch (e) {
  console.log('PDF skipped (playwright not available):', e.message);
}
