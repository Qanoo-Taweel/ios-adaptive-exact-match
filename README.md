# IoS · `sequence.pattern-match.exact` — adaptive exact pattern matching

**Hazırlayanlar:** Qunoo A K Taweel (23291712) · Zeynep Arıcan (24290319)

Internet of Science (IoS) bileşeni: **12 tam eşleştirme atomu** ve girdinin
şekline bakıp en hızlı atomu seçen, **kalibre edilmiş maliyet modelli
`ExactMatch` molekülü**. Saf JavaScript, Node.js ≥ 22, ES modülleri,
**sıfır bağımlılık**.

**Site:** https://qanoo-taweel.github.io/ios-adaptive-exact-match/ · **Rapor (PDF):** [`docs/report/Rapor.pdf`](docs/report/Rapor.pdf) · **UML:** [`docs/uml/`](docs/uml/) ([yazdırmaya hazır PDF](docs/uml/UML-diagrams.pdf)) · **Tasarım desenleri:** [`docs/design-patterns.md`](docs/design-patterns.md)

| | |
|---|---|
| Atomlar | Horspool, bm4DNADS, bm4DNAHMbs, Shift-Or (grup A) · KMP, Rabin-Karp (B) · Aho-Corasick, **Wu-Manber** (C) · Suffix array, **FM-index** (D) · Boyer-Moore (örnek) · Naive (oracle) |
| Seçim | Atom başına beklenen işlem sayıları (karakter frekanslarından) × 240 vakalık ızgarada ölçülen katsayılar; en ucuz tahmin kazanır |
| Doğruluk | 518 test: sözleşme, atom başına özel durumlar, lambda faj genomu + 126 E. coli proteini, 320 tohumlu rastgele vaka, molekül ve CLI |
| Doğrulama | 184 görülmemiş vaka (3 yeni alfabe dahil); molekül hem Allmer 2016 kuralını hem de her sabit atomu geçer (bkz. [`bench/results/validation.md`](bench/results/validation.md)) |

## Kurulum ve komutlar

Kurulacak bir şey yok (npm paketi kullanılmaz).

```bash
git clone https://github.com/Qanoo-Taweel/ios-adaptive-exact-match.git
cd ios-adaptive-exact-match
npm test              # 518 birim testi (node:test), temiz kopyada ~5 sn
npm run calibrate     # Görev 4.1: 240 vakalık kalibrasyon ızgarası (zorunlu 180 + n=10³) → src/selection/coefficients.js (~4 dk)
npm run bench         # Görev 4.2–4.4: 184 vakalık doğrulama + karşılaştırma → bench/results/ (~4 dk)
npm run figures       # rapor/site şekilleri → docs/figures/*.svg
npm run test:bench    # ölçüm sonuçlarının deney tasarımına uygunluğu
```

`npm run calibrate -- --fit-only` ölçmeden yeniden uydurur; `-- --quick` küçük bir duman testi yapar.

## Komut satırı (§4.5)

```bash
node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto] < girdi.fasta > cikti.jsonl
node bin/ios.js explain --patterns ACGT,GGCC < girdi.fasta      # yalnızca kararı JSON olarak yazar
node bin/ios.js list                                             # bütün bileşenler
```

Örnek (lambda genomu):

```bash
$ node bin/ios.js explain --patterns GAATTC,GGATCC < tests/data/lambda.fasta
{
  "requested": "auto",
  "selected": "WuManberSearch",
  "shape": { "n": 48502, "sigma": 4, "k": 2, "mMin": 6, "mMax": 6, "mAvg": 6, "collision": 0.250454, "sampled": true, … },
  "estimates": { "WuManberSearch": …, "ShiftOrSearch": 0.2411, "AhoCorasickSearch": 0.3116, …, "NaiveSearch": null },
  "excluded": { "NaiveSearch": "reference oracle (O(n·m) brute force); used only for testing or when forced" },
  "why": "cheapest estimated cost: WuManberSearch ≈ 0.219 ms for n=48502, σ=4, k=2, m=6..6; next best ShiftOrSearch ≈ 0.241 ms (1.10× slower); 1 atom(s) not applicable: NaiveSearch",
  "plannedRecords": 1, "decisionMs": …
}
```

## Kütüphane olarak

```js
import { ExactMatch } from './src/molecules/ExactMatch.js';
const em = new ExactMatch({ patterns: ['ACGT', 'GGCC'], ignoreCase: false, strategy: 'auto' });
for (const match of em.run(entries)) { /* { header, pattern, position, length } */ }
em.record; // { requested, selected, shape, estimates, why, ranking, excluded, model, decisionMs }
```

Yeni bir atom eklemek (molekül değişmez):

```js
import { registerAtom } from './src/registry.js';
registerAtom(MyNewSearch);   // static manifest + static selection { features, defaults, applicable }
```

## Depo yapısı

```
src/functions/     algoritma çekirdekleri (saf fonksiyonlar) + alfabe, sonuç toplayıcı, maliyet özellikleri
src/atomic/        ExactSearchAtom (Template Method) + 12 atom sınıfı
src/molecules/     ExactMatch.js (molekül)
src/selection/     AtomFactory, CostModel, SelectionChain (Chain of Responsibility), coefficients.js (üretilir)
src/registry.js    atom kayıt defteri          src/shape.js   ShapeBuilder (veri şekli)
src/IoSFacade.js   Facade                       src/cli/       Command + CommandFactory
bin/ios.js         komut satırı
bench/             data.js, timing.js, calibrate.js, fit.js, validate.js, figures.js, results/
tests/unit/        sözleşme, atom, oracle, rastgele, molekül, CLI testleri
tests/benchmarks/  ölçüm sonuçlarının kontrolü
tests/data/        lambda.fasta (NC_001416.1), ecoli-proteins.fasta (126 UniProt K-12 kaydı)
docs/              GitHub Pages sitesi, rapor, UML, şekiller
```

## Tasarım (kısa)

| Desen / ilke | Nerede |
|---|---|
| Template Method + Strategy | `ExactSearchAtom.process()` sabit; atomlar `prepare()` / `findAll()` yazar |
| Registry, Factory Method | `AtomRegistry`, `AtomFactory.create()`, `ExactMatch.createAtom()`, `CommandFactory` |
| Chain of Responsibility | `ForcedStrategy → Applicability → CostEstimation → CheapestAtom` |
| Facade, Command, Builder | `IoSFacade`, CLI komutları, `ShapeBuilder` |
| SOLID | ayrıntılar ve kanıtlar: [`docs/design-patterns.md`](docs/design-patterns.md) |

## Test verisi kaynakları

* `tests/data/lambda.fasta`: Enterobacteria phage lambda, complete genome (NCBI RefSeq NC_001416.1, 48 502 bp), Bowtie2 örnek verisindeki kopyasından.
* `tests/data/ecoli-proteins.fasta`: UniProtKB/Swiss-Prot *Escherichia coli* (strain K12, OX=83333) kayıtlarından ilk 126 protein (52 676 amino asit).

## Grup üyeleri ve katkılar

Bu proje bireysel olarak hazırlanmıştır.

| Üye | Katkı |
|---|---|
| Qanoo Taweel ([@Qanoo-Taweel](https://github.com/Qanoo-Taweel)) | Bütün bileşenler: atomlar, molekül, seçim yöntemi, testler, kalibrasyon/doğrulama, rapor, UML, site |

Yapay zekâ kullanımı: kodlama, test ve belgelemede Claude Code (Anthropic) asistan olarak kullanılmıştır; ayrıntı raporun "Kaynaklar ve araçlar" bölümündedir.

## Lisans

MIT
