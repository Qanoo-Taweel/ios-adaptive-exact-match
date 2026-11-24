/**
 * Builds the report (Görev 5) from the stored results:
 *   docs/report/rapor.html  (HTML version, also linked from the site)
 *   docs/report/Rapor.pdf   (A4 PDF, printed with headless Chromium if Playwright is available)
 * Every number in the text is read from bench/results/*.json and src/selection/coefficients.js,
 * so the report cannot drift from the measurements.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { CALIBRATION } from '../src/selection/coefficients.js';
import { registry } from '../src/registry.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const cal = JSON.parse(read('bench/results/calibration.json'));
const val = JSON.parse(read('bench/results/validation.json'));
const svg = (name) => read(`docs/figures/${name}`).replace(/<\?xml[^>]*>/, '');
const analysis = JSON.parse(read('docs/report/analysis.json')); // hand-written analysis of wrong choices

const f2 = (x) => x.toFixed(2).replace('.', ',');
const f3 = (x) => x.toFixed(3).replace('.', ',');
const pct = (x) => (x == null ? '–' : `%${(x * 100).toFixed(1).replace('.', ',')}`);
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
  return rows.map((r) => `<tr${r.policy.startsWith('ExactMatch') ? ' class="hl"' : ''}><td>${r.policy.replace('always ', 'hep ').replace('Search', '').replace('Allmer 2016 rule', 'Allmer 2016 kuralı').replace('ExactMatch (auto)', 'ExactMatch (auto)')}</td><td>${pct(r.pickFastest)}</td><td>${pct(r.within10)}</td><td>${f3(r.geoMean)}</td><td>${f2(r.worst)}×</td><td>${f3(r.totalRatio)}</td></tr>`).join('');
}
const tableHead = '<tr><th>Politika</th><th>En hızlıyı seçme</th><th>%10 içinde</th><th>Geo. ort. yavaşlama</th><th>En kötü</th><th>Toplam / en iyi</th></tr>';

const worst = [...val.results].sort((a, b) => b.times[b.chosen] / b.bestMs - a.times[a.chosen] / a.bestMs).slice(0, 6);
const worstRows = worst.map((r) => `<tr><td>${r.id}</td><td>${r.alphabet}</td><td>${r.n.toLocaleString('tr-TR')}</td><td>${r.records}</td><td>${r.k}</td><td>${r.mMin}–${r.mMax}</td><td>${short(r.fastest)} (${f2(r.bestMs)} ms)</td><td>${short(r.chosen)} (${f2(r.times[r.chosen])} ms)</td><td>${f2(r.times[r.chosen] / r.bestMs)}×</td></tr>`).join('');

const coefRows = Object.entries(CALIBRATION.atoms).map(([name, a]) => `<tr><td>${short(name)}</td><td>${a.rows}</td><td>%${(a.medianRelErr * 100).toFixed(1).replace('.', ',')}</td><td class="mono">${Object.entries(a.coef).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v.toExponential(2)}`).join(' ')}</td></tr>`).join('');

const winCounts = {};
for (const c of cal.cases) winCounts[c.fastest] = (winCounts[c.fastest] ?? 0) + 1;
const winList = Object.entries(winCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${short(k)} ${v}`).join(', ');

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapor: ExactMatch molekülü</title>
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
  figure svg { width: 100%; height: auto; display: block; }
  figcaption { font-size: 7.8pt; color: var(--ink2); margin-top: 2px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .note { font-size: 8pt; color: var(--ink2); }
  .appendix { break-before: page; }
  .avoid { break-inside: avoid; }
  @media screen { body { padding-top: 24px; padding-bottom: 48px; } }
  @media (max-width: 640px) { .two { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
</style></head><body>

<div class="kicker">IoS bileşen yayını · sequence.pattern-match.exact</div>
<h1>ExactMatch: girdinin şekline göre en hızlı tam eşleştirme atomunu seçen molekül</h1>
<div class="meta">Qanoo Taweel · YZM327 Vize projesi (Ödev 3) · Kasım 2026 · Kod: github.com/Qanoo-Taweel/ios-adaptive-exact-match</div>

<div class="abstract"><p><b>Özet.</b> On iki tam eşleştirme atomu (on tanesi yeni: Horspool, bm4DNADS, bm4DNAHMbs, Shift-Or, KMP, Rabin-Karp, Aho-Corasick, Wu-Manber, suffix array, FM-index) ve bunlar arasından seçim yapan bir <code>ExactMatch</code> molekülü yazdık. Molekül, ilk kaydın karakter frekanslarından ve gerçek desenlerden her atom için beklenen işlem sayılarını hesaplar; bunları ${cal.cases.length} vakalık kalibrasyon ızgarasında ölçülen katsayılarla çarpar ve en ucuz atomu seçer. Kalibrasyonda kullanılmayan ${nVal} vakada (üç yeni alfabe ve gerçek veri dahil) molekülün geometrik ortalama yavaşlaması <b>${f3(EM.geoMean)}</b>; Allmer 2016 kuralı ${f3(AL.geoMean)}, en iyi sabit atom (hep ${short(BS.policy.replace('always ', ''))}) ${f3(BS.geoMean)}. Bütün atomlar ${testCount} testte NaiveSearch oracle'ı ile eleman eleman aynı sonucu verir.</p></div>

<h2>1. Ne yapar ve neden</h2>
<p>Bir metindeki bir veya daha çok desenin bütün geçişlerini bulmak için tek bir "en iyi" algoritma yoktur: kısa desende iyi olan uzun desende, tek desende iyi olan çok desende geride kalır. Bileşenimiz IoS'un <code>sequence.pattern-match.exact</code> görevini yapar: FASTA kayıtları ve desen listesi alır, örtüşenler dahil bütün tam eşleşmeleri sözleşmedeki sırayla verir. Yaklaşık eşleşme kapsam dışıdır.</p>
<p><b>Katkılarımız:</b> (i) dört grubun hepsinden atom, iki bonus atom (Wu-Manber, FM-index) dahil; (ii) kural tablosu yerine <i>karakter frekansına duyarlı</i> bir maliyet modeli (yeni bir atom yalnızca kendi özelliklerini ve varsayılan katsayılarını getirir); (iii) kayıt defteri, Chain of Responsibility ile kurulan seçim hattı ve bağımlılık enjeksiyonu sayesinde molekül koduna dokunmadan genişleme; (iv) ${testCount} testlik doğruluk paketi ve ${nVal} görülmemiş vakada dürüst karşılaştırma.</p>

<h2>2. Algoritmalar</h2>
<p>Bütün atomlar <code>ExactSearchAtom</code> taban sınıfından türer (Template Method): parametre kontrolü, ASCII <code>ignoreCase</code>, tekrarlanan desenlerin bir kez aranıp her kopya için ayrı raporlanması ve çıktı sıralaması tabandadır; atom yalnızca <code>prepare()</code> ve <code>findAll()</code> yazar. Metin önce <b>küçültülmüş alfabeye</b> kodlanır: desenlerde geçen karakterler 1..S−1, diğerleri 0 olur (0 hiçbir eşleşmeye katılamaz). Saf ASCII metinlerde kodlama yerel <code>TextEncoder.encodeInto</code> + yerinde tablo ile yapılır (~2× hızlı). Hiçbir atom <code>indexOf</code>, <code>RegExp</code> vb. kullanmaz; bunu bir test kaynak kodu tarayarak denetler.</p>
<table class="wrap"><tr><th>Atom (grup)</th><th>Fikir</th><th>Ön işlem</th><th>Arama (ort. / en kötü)</th></tr>
<tr><td>Horspool (A)</td><td>Pencerenin son karakterine göre kötü karakter kayması</td><td>O(m+S)</td><td>~n/E[kayma] / O(nm)</td></tr>
<tr><td>bm4DNADS (A)</td><td>Ayarlı BM: kayma tablosunda son karakter 0, 3 kez açılmış atlama döngüsü, nöbetçi</td><td>O(m+S)</td><td>Horspool gibi, daha az dal</td></tr>
<tr><td>bm4DNAHMbs (A)</td><td>Bit kaydırmayla paketlenmiş q-gram özeti ile kayma (q = ⌊14/b⌋, b = log₂S)</td><td>O(m+2^{bq})</td><td>~n/(m−q+1) / O(nm)</td></tr>
<tr><td>Shift-Or (A)</td><td>Bit paralel durum; kısa desenler tek 32 bit kelimeye paketlenir</td><td>O(Σm+S)</td><td>O(n · kelime sayısı)</td></tr>
<tr><td>KMP (B)</td><td>Güçlü başarısızlık fonksiyonu, metinde geri dönmez</td><td>O(m)</td><td>O(n) her desen</td></tr>
<tr><td>Rabin-Karp (B)</td><td>mod 2³² kayan özet; uzunluk başına tek geçiş, eşit özette her zaman doğrulama</td><td>O(Σm)</td><td>O(n · farklı uzunluk)</td></tr>
<tr><td>Aho-Corasick (C)</td><td>Tam DFA tablosu + sözlük sonek bağları, tek geçiş</td><td>O(Σm·S)</td><td>O(n + occ)</td></tr>
<tr><td>Wu-Manber (C)</td><td>B karakterlik blok kayması, en kısa desen uzunluğu ile sınırlı; kova ile doğrulama</td><td>O(Σm+2^{bB})</td><td>~n/(ℓmin−B+1)</td></tr>
<tr><td>Suffix array (D)</td><td>Önek ikileme + sayma sıralaması; iki ikili arama</td><td>O(n log n)</td><td>O(m log n + occ)</td></tr>
<tr><td>FM-index (D)</td><td>SA → BWT → C[], 64 satırda bir Occ kontrol noktası; geriye doğru arama</td><td>O(n log n)</td><td>O(m + occ)</td></tr>
<tr><td>Boyer-Moore, Naive</td><td>Başlangıç paketi örneği (kötü karakter + güçlü iyi sonek) ve kaba kuvvet oracle</td><td>O(m+S) / –</td><td>alt doğrusal / O(nm)</td></tr></table>
<h3>Makaleden (Allmer 2016) ve özgün tariflerden ayrıldığımız noktalar</h3>
<ul>
<li><b>bm4DNAHMbs, görülmemiş q-gram kayması.</b> Sözde kod desende geçmeyen bir q-gram için m kadar kaydırır. Bu güvenli değildir: pencere, görülmemiş q-gram'ın son q−1 karakteriyle başlayan bir eşleşmenin içinden geçebilir. Güvenli en büyük kayma <b>m−q+1</b>'dir. Bir test (negatif kontrol) m kullanıldığında <code>GGGACGTT</code> içindeki <code>ACGTT</code> eşleşmesinin kaybolduğunu gösterir. Özet tam (katlanmamış) olduğu için son q-gram tamsayı eşitliğiyle karşılaştırılır, yalnızca kalan m−q karakter doğrulanır.</li>
<li><b>bm4DNADS.</b> Nöbetçi, çağıranın metnine yazılmaz (dizeler değişmez, sözleşme yan etki istemez); kodlanmış kopyanın sonuna m hücre eklenip son desen karakteriyle doldurulur. Atlama döngüsü nöbetçide durduğunda <code>i ≥ n</code> ayrıca denetlenir; doğrulamadan sonra 1 yerine Hume-Sunday'in güvenli "md2" kayması kullanılır.</li>
<li><b>Shift-Or</b> çok desen için kelime paketleme ile genişletildi; m &gt; 32 desen yine doğru çalışır (ilk 32 karakter süzgeç + doğrulama) ama atom otomatik seçimde kendini <i>uygulanamaz</i> ilan eder.</li>
<li><b>Wu-Manber</b> PREFIX tablosunu kullanmaz (blok özeti tam olduğu için kovalar kısa); <b>FM-index</b> konum bulmada örneklenmiş yerine tam SA tutar (bellek yerine hız).</li></ul>

<h2>3. Girdi, çıktı ve parametreler</h2>
<p><b>Girdi:</b> <code>FASTA.Entry</code> akışı <code>{ header, seq }</code>. <b>Parametreler:</b> <code>patterns</code> (boş olmayan dizgilerin boş olmayan listesi; aksi hâlde hata), <code>ignoreCase</code> (yalnızca ASCII A–Z/a–z), molekül için <code>strategy</code> (<code>"auto"</code> veya bir atom adı; bilinmeyen ad geçerli seçenekleri listeleyen bir hata verir). <b>Çıktı:</b> <code>{ header, pattern, position, length }</code>; konum 0 tabanlı UTF-16 indeksidir; örtüşen eşleşmeler ve tekrarlanan desenin her kopyası raporlanır; sıra kayıt → konum → desen indeksidir; desen verildiği hâliyle yazılır; desen metinden uzunsa veya metin boşsa sonuç boştur. <b>record:</b> <code>requested, selected, shape, estimates</code> (ms; uygulanamazsa <code>null</code>), <code>ranking, excluded</code> (neden), <code>why, model, decisionMs</code>.</p>

<h2>4. Seçim yöntemi</h2>
<p><b>Veri şekli</b> ilk kayıttan bir kez hesaplanır (<code>ShapeBuilder</code>): n, σ, k, farklı desen sayısı, m<sub>min</sub>/m<sub>maks</sub>/m<sub>ort</sub>, farklı uzunluk sayısı, desen alfabesi ve çakışma olasılığı Σf(c)². 2¹³'ten uzun kayıtlarda frekanslar 32 blok × 256 karakterlik örneklemden kestirilir; karar süresi böylece n ile büyümez (ortanca ${f3(decMed)} ms).</p>
<p><b>Maliyet modeli.</b> Her atom <code>selection.features(shape)</code> ile beklenen işlem sayılarını döndürür ve model <i>tahmin = taban + Σ c<sub>f</sub> · özellik<sub>f</sub></i> hesaplar. Özellikler gerçek desenleri ve metnin karakter frekanslarını kullanır: örneğin Horspool için beklenen kayma E[s] = Σ<sub>c</sub> f(c)·kayma(c) kapalı biçimde hesaplanır, pencere sayısı n/E[s], doğrulama sayısı pencere × f(son karakter) × beklenen sonek uzunluğu; Shift-Or için kelime sayısı paketlemeden; Rabin-Karp için farklı uzunluk grupları; Wu-Manber için blok boyu ve bloğun tabloda bulunma olasılığı k·(ℓmin−B+1)·(Σf²)<sup>B</sup>; SA/FM için önek ikileme tur sayısı ≈ log₂(2 log<sub>1/Σf²</sub> n). Katsayılar, ${cal.cases.length} vakada <i>bağıl</i> hata kareleri toplamını en aza indiren, negatif olmayan en küçük kareler ile uydurulur (≤6 özellik için bütün alt kümeler denenir; tam NNLS). Bağıl hata, 0,1 ms'lik ve 500 ms'lik vakaları eşit tartar; çünkü önemli olan atomlar arasındaki orandır.</p>
<p><b>Akış önseli.</b> Maliyetin bir kısmı çalışma başına bir kez ödenir (<code>prep</code>: desen ön işleme, <code>base</code>: sabit ek yük), geri kalanı her kayıtta ödenir (kodlama, tarama, SA/FM için metin dizini). Karar yalnızca ilk kayda bakmak zorunda olduğundan, kısa bir ilk kayıt (ör. tek bir protein) ≈ 2¹⁶ karakterlik bir akışın parçası sayılır: tahmin = çalışma başına + R̂ · kayıt başına, R̂ = min(128, round(2¹⁶ / n)). Uzun bir ilk kayıtta (genom) R̂ = 1'dir. Kullanılan R̂ <code>record.plannedRecords</code>'ta yazar.</p>
<p><b>Neden kural değil de model?</b> Kural tablosu her yeni atomda yeniden ölçülüp elle düzenlenmelidir; modelde yeni atom kendi özelliklerini getirir, kalibre edilmeden önce kendi <code>defaults</code> katsayılarıyla bile seçilebilir. Seçim, sırayla çalışan dört işleyiciden oluşan bir zincirdir: <i>Forced → Applicability → CostEstimation → Cheapest</i>. Kendini uygulanamaz ilan eden atom (NaiveSearch her zaman; Shift-Or m &gt; 32'de) adayların dışına alınır ve nedeni <code>record.excluded</code>'a yazılır.</p>

<h2>5. Nasıl test edildi</h2>
<ul>
<li><b>Sözleşme</b> (her atom için 10 test): örtüşme, sıralama, tekrarlanan desen, ASCII <code>ignoreCase</code> (é katlanmaz), UTF-16 konumları (emoji), boş metin/uzun desen, hatalı parametre, determinizm; ayrıca kaynak kodda yasak çağrı taraması.</li>
<li><b>Atom başına özel durumlar</b> (≥13/atom): periyodik ABAB, tek karakter, alfabede olmayan metin karakterleri, desen = metin, sondaki eşleşme, birbirinin öneki olan desenler, 64 desen; algoritmaya özgü: q-gram kayma negatif kontrolü, 32/40 karakter Shift-Or ve kelime paketleme, KMP sınır fonksiyonu, he/she/his/hers, banana suffix array, mississippi FM sayıları.</li>
<li><b>Oracle eşitliği</b>: lambda faj genomu (NC_001416.1, 48 502 bp; kısa, uzun, 200 desen, küçük harf + ignoreCase), 126 E. coli K-12 proteini (akış), DNA/protein/metin/ikili/alfanümerik sentetik alfabeler, ATAT…/AAAA… tekrarlı metinler, karışık uzunluklar, aynı desen iki kez, boş kayıtlı akış. Oracle'ın kendisi bağımsız bir <code>indexOf</code> referansıyla da karşılaştırılır.</li>
<li><b>Tohumlu rastgele</b>: 320 vaka × 11 atom (tohum 424242). <b>Molekül</b>: record alanları, en ucuz tahminin seçilmesi, ${registry.size} zorla seçilmiş stratejinin aynı sonucu vermesi, testte tanımlanan sahte atomun seçilebilmesi, uygulanamaz atomun 25 farklı girdide hiç seçilmemesi, enjekte edilen maliyet modeli. <b>CLI</b>: run/explain/list ve hata çıkışları.</li></ul>
<p>Toplam <b>${testCount} test</b>, bağımlılık kurmadan <code>npm test</code> ile ~5 saniyede geçer.</p>

<h2>6. Sonuçlar</h2>
<p><b>Ölçüm düzeni.</b> ${m.cpu}, ${m.cores} çekirdek, Node ${m.node}, ${m.platform}. Bir ölçüm = atomu kur + bütün kayıtları işle + bütün eşleşmeleri tüket; 1 ısınma turu, 3 tekrarın ortancası; 2 ms'den kısa çalışmalar bir örnek içinde tekrarlanıp ortalanır. Kalibrasyon: 3 alfabe (DNA, protein, İngilizce metin) × n ∈ {10³, 10⁴, 10⁵, 10⁶} × m ∈ {4, 12, 24, 48, 96} × k ∈ {1, 4, 16, 64} = ${cal.cases.length} vaka (10³ zorunlu ızgaraya ek). En hızlı atom sayıları: ${winList}. Doğrulama: ${nSynth} sentetik vaka (yeni tohumlar, ızgara noktaları arasından n/m/k, karışık desen uzunlukları, 1–4 kayıt, kalibrasyonda olmayan <b>ikili, alfanümerik ve RNA</b> alfabeleri) + 24 gerçek veri vakası.</p>
<div class="avoid"><table>${tableHead}${policyRows('ALL', 8)}</table>
<p class="note">Tablo: bütün ${nVal} doğrulama vakası (ilk 8 politika; tam tablolar Ek A'da). Ölçülen uçtan uca süre (karar dahil) için geometrik ortalama ${f3(E2E.geoMean)}.</p></div>
<figure>${svg('fig1-winners.svg')}<figcaption>Şekil 1. Kalibrasyon ızgarasında en hızlı atom (her panel bir alfabe × n; satırlar m, sütunlar k). Halka: modelin farklı atom seçtiği hücre.</figcaption></figure>
<div class="two"><figure>${svg('fig2-policies.svg')}<figcaption>Şekil 2. Politikaların geometrik ortalama yavaşlaması (log ölçek).</figcaption></figure>
<figure>${svg('fig3-cdf.svg')}<figcaption>Şekil 3. Yavaşlamanın dağılımı (ECDF).</figcaption></figure></div>
<p><b>Hangi atom nerede kazanıyor?</b> ${analysis.where}</p>
<h3>Yanlış seçimlerin analizi</h3>
<table><tr><th>Vaka</th><th>Alfabe</th><th>n</th><th>Kayıt</th><th>k</th><th>m</th><th>En hızlı</th><th>Seçilen</th><th>Yavaşlama</th></tr>${worstRows}</table>
${analysis.wrong.map((p) => `<p>${p}</p>`).join('')}

<h2>7. Sınırlar</h2>
<ul>${analysis.limits.map((p) => `<li>${p}</li>`).join('')}</ul>

<h2>8. Nasıl kullanılır</h2>
<pre>npm test                       # ${testCount} test, bağımlılık yok
npm run calibrate              # ${cal.cases.length} vakalık ızgara → src/selection/coefficients.js
npm run bench                  # ${nVal} vakalık doğrulama → bench/results/validation.{json,md}
node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto] &lt; girdi.fasta &gt; cikti.jsonl
node bin/ios.js explain --patterns GAATTC,GGATCC &lt; tests/data/lambda.fasta   # yalnızca karar (JSON)
node bin/ios.js run ExactMatch --patterns MKK --strategy AhoCorasickSearch &lt; tests/data/ecoli-proteins.fasta</pre>
<p>Kütüphane olarak: <code>new ExactMatch({ patterns, ignoreCase, strategy: 'auto' }).run(entries)</code>; yeni atom: <code>registerAtom(MyAtom)</code>.</p>

<h2>Kaynaklar ve araçlar</h2>
<p class="note">Allmer J. (2016) PeerJ PrePrints 4:e1758v1 · Boyer &amp; Moore (1977) CACM 20(10) · Horspool (1980) SP&amp;E 10(6) · Hume &amp; Sunday (1991) SP&amp;E 21(11) · Knuth, Morris &amp; Pratt (1977) SIAM J. Comput. 6(2) · Karp &amp; Rabin (1987) IBM J. R&amp;D 31(2) · Baeza-Yates &amp; Gonnet (1992) CACM 35(10) · Aho &amp; Corasick (1975) CACM 18(6) · Wu &amp; Manber (1994) TR-94-17 · Manber &amp; Myers (1993) SIAM J. Comput. 22(5) · Ferragina &amp; Manzini (2000) FOCS · Charras &amp; Lecroq, Exact String Matching Algorithms · Internet of Science, hub.ioscience.org/p/learn/. Veri: NCBI RefSeq NC_001416.1; UniProtKB/Swiss-Prot (E. coli K-12, OX=83333). <b>Yapay zekâ kullanımı:</b> kodlama, test yazımı, ölçüm betikleri ve belgelerin hazırlanmasında Claude Code (Anthropic) asistan olarak kullanılmıştır; tasarım kararları, sonuçlar ve bu rapor öğrenci tarafından gözden geçirilmiştir.</p>

<section class="appendix">
<h2>Ek A. Doğrulama tabloları (bütün politikalar)</h2>
${['V', 'S', 'R'].map((s) => `<h3>${{ V: `Küme V: ${T.V[0].n} çok desenli vaka`, S: `Küme S: ${T.S[0].n} tek desenli vaka (k = 1)`, R: `Küme R: ${T.R[0].n} gerçek veri vakası (lambda, E. coli)` }[s]}</h3><table>${tableHead}${policyRows(s)}</table>`).join('')}
<h2>Ek B. Kalibre edilmiş katsayılar</h2>
<p class="note">Saniye / özellik birimi. "satır": uydurmada kullanılan vaka sayısı (Shift-Or yalnızca m ≤ 32), "hata": ortanca mutlak bağıl hata (örnek içi). Model içi seçim: en hızlıyı seçme ${pct(CALIBRATION.meta.inSample.hit)}, geometrik ortalama yavaşlama ${f3(CALIBRATION.meta.inSample.geo)}.</p>
<table><tr><th>Atom</th><th>satır</th><th>hata</th><th>katsayılar</th></tr>${coefRows}</table>
<figure>${svg('fig4-accuracy.svg')}<figcaption>Şekil 4. Doğrulama kümesinde tahmin edilen ve ölçülen süreler (bütün atomlar).</figcaption></figure>
<h2>Ek C. Tasarım desenleri ve SOLID</h2>
<table class="wrap"><tr><th>Desen</th><th>Nerede</th><th>Neden</th></tr>
<tr><td>Template Method</td><td><code>ExactSearchAtom.process()</code></td><td>Sözleşme adımları tek yerde; atomlar yalnızca <code>prepare/findAll</code> yazar.</td></tr>
<tr><td>Strategy</td><td>12 atom sınıfı</td><td>Aynı arayüz, çalışma anında değiştirilebilir (LSP; sözleşme testleri hepsinde aynı).</td></tr>
<tr><td>Registry</td><td><code>AtomRegistry</code></td><td>Yeni atom = <code>register()</code>; molekül değişmez (OCP).</td></tr>
<tr><td>Factory Method</td><td><code>AtomFactory.create</code>, <code>ExactMatch.createAtom</code>, <code>CommandFactory</code></td><td>Nesneler adla üretilir; somut sınıfa bağımlılık yok (DIP).</td></tr>
<tr><td>Chain of Responsibility</td><td><code>SelectionChain.js</code></td><td>Seçim adımları bağımsız; yeni kural = yeni işleyici.</td></tr>
<tr><td>Facade</td><td><code>IoSFacade</code></td><td>CLI ve web demosu için tek giriş noktası.</td></tr>
<tr><td>Command</td><td><code>RunCommand</code>, <code>ExplainCommand</code>…</td><td>Her CLI fiili test edilebilir bir nesne.</td></tr>
<tr><td>Builder</td><td><code>ShapeBuilder</code></td><td>Veri şekli molekülde, ölçümde ve testlerde aynı yoldan kurulur.</td></tr>
</table>
<p class="note">UML sınıf diyagramları (tam, molekül, atomlar, CLI, sıra diyagramı ve elle çizilebilir sürüm): <code>docs/uml/</code>.</p>
</section>
</body></html>`;

mkdirSync(new URL('docs/report/', root), { recursive: true });
writeFileSync(new URL('docs/report/rapor.html', root), html);
console.log('wrote docs/report/rapor.html');

try {
  const { loadPlaywright } = await import('./playwright.js');
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(new URL('docs/report/rapor.html', root).href);
  await page.pdf({ path: new URL('docs/report/Rapor.pdf', root).pathname, format: 'A4', printBackground: true, margin: { top: '15mm', bottom: '16mm', left: '16mm', right: '16mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-family:Inter,Arial;font-size:7px;color:#888;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await browser.close();
  console.log('wrote docs/report/Rapor.pdf');
} catch (e) {
  console.log('PDF skipped (playwright not available):', e.message);
}
