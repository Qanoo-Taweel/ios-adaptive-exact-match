# Core classes (simplified class diagram)

The full class diagram ([`00-full`](00-full.svg)) has 30 classes. The view below
keeps the 9 classes that carry the architecture, with their main methods.
The rendered version is [`06-core-classes`](06-core-classes.svg).

```
                 ┌────────────────────────┐
                 │ IoSFacade      «Facade» │
                 │ + run(fasta, opts)      │
                 │ + explain(fasta, opts)  │
                 └───────────┬────────────┘
                             │ creates
                             ▼
┌──────────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐
│ ShapeBuilder     │◄··│ ExactMatch   «molecule»   │──►│ SelectionHandler «abs»│◄─┐ next
│ «Builder»        │   │ + record                  │   │ «Chain of Resp.»      │──┘
│ + withPatterns(p)│   │ + decide(firstEntry)      │   │ + setNext(h)          │
│ + withText(t)    │   │ + run(entries)            │   │ + handle(ctx)         │
│ + build()        │   │ # createAtom(name, params)│   └──────────┬───────────┘
└──────────────────┘   │   «Factory Method»        │              ┆ uses
                       └──────┬─────────────┬──────┘              ▼
                              │             │            ┌──────────────────────┐
                              ▼             ◇ holds 1    │ CostModel            │
                 ┌──────────────────┐       │            │ + estimate(Atom,shape)│
                 │ AtomFactory      │       │            └──────────────────────┘
                 │ + create(name,p) │       ▼
                 └────────┬─────────┘  ┌─────────────────────────────┐
                          ▼            │ ExactSearchAtom «abstract»   │
                 ┌──────────────────┐  │ «Template Method, Strategy»  │
                 │ AtomRegistry     │  │ + process(entry)             │
                 │ «Registry»       │  │ # prepare(patterns)          │
                 │ + register(Atom) │  │ # findAll(text, hits)  {abs} │
                 │ + get(name)      │  └──────────────△──────────────┘
                 │ + atoms()        │                 │ extends
                 └──────────────────┘  ┌──────────────┴──────────────┐
                                       │ XxxSearch (12 atoms)         │
                                       │ # prepare(patterns)          │
                                       │ # findAll(text, hits)        │
                                       └─────────────────────────────┘
```

Notation: `──►` association (holds a reference), `··►` dependency (uses), `◇` aggregation, `△` inheritance.

**Selection handlers** (subclasses of `SelectionHandler`, in chain order):
`ForcedStrategyHandler → ApplicabilityHandler → CostEstimationHandler → CheapestAtomHandler`.

**Atoms** (subclasses of `ExactSearchAtom`): Horspool, Boyer-Moore, bm4DNADS, bm4DNAHMbs,
Shift-Or, KMP, Rabin-Karp, Aho-Corasick, Wu-Manber, suffix array, FM-index and Naive (reference oracle).

## Responsibilities

| Class | Responsibility | Pattern |
|---|---|---|
| `IoSFacade` | Single entry point for the CLI and the web demo: FASTA text in, matches or decision out. | Facade |
| `ExactMatch` | Inspects the first record, obtains the cheapest atom from the selection chain and runs it on the whole stream. | Strategy (context), Factory Method |
| `SelectionHandler` | One step of the atom selection: forced strategy, applicability, cost estimation, cheapest atom. | Chain of Responsibility |
| `CostModel` | Estimated time = Σ coefficient × feature, with coefficients fitted on the 240-case calibration grid. | |
| `ShapeBuilder` | Computes the data shape of the first record: n, σ, k, minimum/maximum/mean pattern length, character frequencies. | Builder |
| `AtomRegistry` | Holds the available atoms by name; `register()` adds an atom without changing the molecule. | Registry |
| `AtomFactory` | Creates an atom instance from its registered name. | Factory Method |
| `ExactSearchAtom` | Fixed `process()` skeleton (validate, fold case, `findAll()`, sort, expand duplicates). | Template Method, Strategy |
| `XxxSearch` | One concrete algorithm: implements `prepare()` and `findAll()`. | Concrete strategy |
