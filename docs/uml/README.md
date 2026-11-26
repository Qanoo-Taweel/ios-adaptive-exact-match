# UML diagrams

Rendered images (`.png`, `.svg`) are generated from the Mermaid sources (`.mmd`) with `node scripts/render-uml.mjs <mermaid.min.js>`. The same full class diagram is also available as PlantUML: [`class-diagram.puml`](class-diagram.puml). For drawing by hand, see [`hand-drawable.md`](hand-drawable.md).

| Diagram | Image | Source |
|---|---|---|
| Full class diagram | [png](00-full.png) · [svg](00-full.svg) | [00-full.mmd](00-full.mmd) |
| Architecture overview | [png](01-overview.png) · [svg](01-overview.svg) | [01-overview.mmd](01-overview.mmd) |
| Atoms (Template Method + Strategy) | [png](02-atoms.png) · [svg](02-atoms.svg) | [02-atoms.mmd](02-atoms.mmd) |
| Molecule and selection (Chain of Responsibility, Factory Method, Registry, Builder) | [png](03-molecule.png) · [svg](03-molecule.svg) | [03-molecule.mmd](03-molecule.mmd) |
| CLI (Facade + Command) | [png](04-cli.png) · [svg](04-cli.svg) | [04-cli.mmd](04-cli.mmd) |
| Sequence diagram: explain | [png](05-sequence-explain.png) · [svg](05-sequence-explain.svg) | [05-sequence-explain.mmd](05-sequence-explain.mmd) |
| Hand-drawable version | [png](06-hand-drawable.png) · [svg](06-hand-drawable.svg) | [06-hand-drawable.mmd](06-hand-drawable.mmd) |

GitHub renders the Mermaid sources directly:

## Full class diagram

```mermaid
---
title: Full class diagram (all classes, methods and relations) — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
classDiagram
  direction TB
  class ExactSearchAtom {
    <<abstract>>
    +manifest Manifest$
    +selection Selection$
    +params Params
    #original string[]
    #unique string[]
    #owners number[][]
    +constructor(params)
    +validateParams(params)$ Params
    #prepare(patterns) void
    #findAll(text, hits)* void
    +process(entry) Iterable~Match~
    +run(entries) Iterable~Match~
  }
  class HitCollector {
    -keys Float64Array
    +add(unique, position) void
    +ordered() Iterable~pair~
    +count number
  }
  class NaiveSearch { +findAll(text, hits) }
  class BoyerMooreSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class HorspoolSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class Bm4DnaDsSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class Bm4DnaHmbsSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class ShiftOrSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class KmpSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class RabinKarpSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class AhoCorasickSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class WuManberSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class SuffixArraySearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class FmIndexSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  ExactSearchAtom ..> HitCollector : creates per entry
  ExactSearchAtom <|-- NaiveSearch
  ExactSearchAtom <|-- BoyerMooreSearch
  ExactSearchAtom <|-- HorspoolSearch
  ExactSearchAtom <|-- Bm4DnaDsSearch
  ExactSearchAtom <|-- Bm4DnaHmbsSearch
  ExactSearchAtom <|-- ShiftOrSearch
  ExactSearchAtom <|-- KmpSearch
  ExactSearchAtom <|-- RabinKarpSearch
  ExactSearchAtom <|-- AhoCorasickSearch
  ExactSearchAtom <|-- WuManberSearch
  ExactSearchAtom <|-- SuffixArraySearch
  ExactSearchAtom <|-- FmIndexSearch
  note for ExactSearchAtom "Template Method: process() is fixed;<br>subclasses fill prepare() + findAll().<br>Strategy: all 12 subclasses are interchangeable (LSP)."
  class ExactMatch {
    +manifest Manifest$
    +params Params
    +record Record
    -atom ExactSearchAtom
    +constructor(params, deps)
    +decide(firstEntry) Record
    +run(entries) Iterable~Match~
    +process(entry) Iterable~Match~
    #createAtom(name, params) ExactSearchAtom
  }
  class AtomRegistry {
    -atoms Map
    +register(AtomClass) AtomRegistry
    +unregister(name) boolean
    +get(name) AtomClass
    +has(name) boolean
    +names() string[]
    +atoms() AtomClass[]
    +clone() AtomRegistry
    +size number
  }
  class AtomFactory {
    +registry AtomRegistry
    +create(name, params) ExactSearchAtom
  }
  class CostModel {
    +calibration Calibration
    +coefficientsFor(AtomClass) Coef
    +estimate(AtomClass, shape) Estimate
    +version string
    +expectedRecords(shape)$ number
  }
  class ShapeBuilder {
    +withPatterns(patterns, ignoreCase) ShapeBuilder
    +withText(text) ShapeBuilder
    +build() Shape
  }
  class SelectionHandler {
    <<abstract>>
    +next SelectionHandler
    +setNext(handler) SelectionHandler
    +handle(ctx) Context
  }
  class ForcedStrategyHandler { +handle(ctx) }
  class ApplicabilityHandler { +handle(ctx) }
  class CostEstimationHandler { +handle(ctx) }
  class CheapestAtomHandler { +handle(ctx) }
  SelectionHandler <|-- ForcedStrategyHandler
  SelectionHandler <|-- ApplicabilityHandler
  SelectionHandler <|-- CostEstimationHandler
  SelectionHandler <|-- CheapestAtomHandler
  SelectionHandler --> SelectionHandler : next
  ExactMatch --> SelectionHandler : chain
  ExactMatch --> AtomRegistry : registry
  ExactMatch --> CostModel : costModel
  ExactMatch --> AtomFactory : factory
  ExactMatch ..> ShapeBuilder : shapeOf()
  ExactMatch o--> ExactSearchAtom : chosen atom
  AtomFactory --> AtomRegistry
  AtomRegistry o--> "1..*" ExactSearchAtom : registered classes
  CostEstimationHandler ..> CostModel
  note for ExactMatch "Open/Closed: never names a concrete atom.<br>Dependency Inversion: registry, cost model,<br>factory and chain are injected."
  note for SelectionHandler "Chain of Responsibility:<br>Forced → Applicability → CostEstimation → Cheapest"
  class IoSFacade {
    +registry AtomRegistry
    +listComponents() Manifest[]
    +createMolecule(component, opts) ExactMatch
    +run(fastaText, opts, component) RunResult
    +explain(fastaText, opts, component) Record
    +runJsonl(fastaText, opts, component) Iterable~string~
  }
  class Command {
    <<abstract>>
    +args string[]
    +execute(io)* Promise~number~
  }
  class RunCommand { +execute(io) }
  class ExplainCommand { +execute(io) }
  class ListCommand { +execute(io) }
  class HelpCommand { +execute(io) }
  class CommandFactory {
    -commands Map$
    +create(argv)$ Command
  }
  class FastaReader {
    <<module>>
    +parseFasta(text) Iterable~Entry~
    +readFasta(text) Entry[]
    +formatFasta(entries, width) string
  }
  Command <|-- RunCommand
  Command <|-- ExplainCommand
  Command <|-- ListCommand
  Command <|-- HelpCommand
  CommandFactory ..> Command : creates
  RunCommand ..> IoSFacade
  ExplainCommand ..> IoSFacade
  ListCommand ..> IoSFacade
  IoSFacade ..> FastaReader
  IoSFacade ..> ExactMatch : creates
  note for IoSFacade "Facade: CLI and web demo use only this class."
```

## Architecture overview

```mermaid
---
title: Architecture overview (IoS layers) — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
flowchart LR
  subgraph CLI["Interface layer"]
    bin["bin/ios.js"] --> cmd["CommandFactory → Run / Explain / List"]
    cmd --> fac["IoSFacade"]
    web["docs/demo (browser)"] --> fac
  end
  subgraph MOL["Molecule layer"]
    em["ExactMatch"] --> chain["Selection chain"]
    chain --> cm["CostModel + coefficients.js"]
    em --> sb["ShapeBuilder"]
    em --> af["AtomFactory"]
    af --> reg["AtomRegistry"]
  end
  subgraph ATOM["Atom layer (12 atoms)"]
    base["ExactSearchAtom (Template Method)"]
    a1["Horspool · BM · bm4DNADS · bm4DNAHMbs · Shift-Or"]
    a2["KMP · Rabin-Karp · Aho-Corasick · Wu-Manber"]
    a3["Suffix array · FM-index · Naive (oracle)"]
    base --- a1 & a2 & a3
  end
  subgraph FN["Function layer (pure)"]
    f["src/functions/*.js: algorithm cores, alphabet, hits, costs"]
  end
  fac --> em
  reg --> base
  a1 & a2 & a3 --> f
  bench["bench/calibrate.js"] -. writes .-> cm
```

## Atoms (Template Method + Strategy)

```mermaid
---
title: Atoms — Template Method + Strategy — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
classDiagram
  direction TB
  class ExactSearchAtom {
    <<abstract>>
    +manifest Manifest$
    +selection Selection$
    +params Params
    #original string[]
    #unique string[]
    #owners number[][]
    +constructor(params)
    +validateParams(params)$ Params
    #prepare(patterns) void
    #findAll(text, hits)* void
    +process(entry) Iterable~Match~
    +run(entries) Iterable~Match~
  }
  class HitCollector {
    -keys Float64Array
    +add(unique, position) void
    +ordered() Iterable~pair~
    +count number
  }
  class NaiveSearch { +findAll(text, hits) }
  class BoyerMooreSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class HorspoolSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class Bm4DnaDsSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class Bm4DnaHmbsSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class ShiftOrSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class KmpSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class RabinKarpSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class AhoCorasickSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class WuManberSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class SuffixArraySearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  class FmIndexSearch {
    #prepare(patterns)
    +findAll(text, hits)
  }
  ExactSearchAtom ..> HitCollector : creates per entry
  ExactSearchAtom <|-- NaiveSearch
  ExactSearchAtom <|-- BoyerMooreSearch
  ExactSearchAtom <|-- HorspoolSearch
  ExactSearchAtom <|-- Bm4DnaDsSearch
  ExactSearchAtom <|-- Bm4DnaHmbsSearch
  ExactSearchAtom <|-- ShiftOrSearch
  ExactSearchAtom <|-- KmpSearch
  ExactSearchAtom <|-- RabinKarpSearch
  ExactSearchAtom <|-- AhoCorasickSearch
  ExactSearchAtom <|-- WuManberSearch
  ExactSearchAtom <|-- SuffixArraySearch
  ExactSearchAtom <|-- FmIndexSearch
  note for ExactSearchAtom "Template Method: process() is fixed;<br>subclasses fill prepare() + findAll().<br>Strategy: all 12 subclasses are interchangeable (LSP)."
```

## Molecule and selection (Chain of Responsibility, Factory Method, Registry, Builder)

```mermaid
---
title: ExactMatch molecule — Chain of Responsibility, Factory Method, Registry, Builder — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
classDiagram
  direction LR
  class ExactMatch {
    +manifest Manifest$
    +params Params
    +record Record
    -atom ExactSearchAtom
    +constructor(params, deps)
    +decide(firstEntry) Record
    +run(entries) Iterable~Match~
    +process(entry) Iterable~Match~
    #createAtom(name, params) ExactSearchAtom
  }
  class AtomRegistry {
    -atoms Map
    +register(AtomClass) AtomRegistry
    +unregister(name) boolean
    +get(name) AtomClass
    +has(name) boolean
    +names() string[]
    +atoms() AtomClass[]
    +clone() AtomRegistry
    +size number
  }
  class AtomFactory {
    +registry AtomRegistry
    +create(name, params) ExactSearchAtom
  }
  class CostModel {
    +calibration Calibration
    +coefficientsFor(AtomClass) Coef
    +estimate(AtomClass, shape) Estimate
    +version string
    +expectedRecords(shape)$ number
  }
  class ShapeBuilder {
    +withPatterns(patterns, ignoreCase) ShapeBuilder
    +withText(text) ShapeBuilder
    +build() Shape
  }
  class SelectionHandler {
    <<abstract>>
    +next SelectionHandler
    +setNext(handler) SelectionHandler
    +handle(ctx) Context
  }
  class ForcedStrategyHandler { +handle(ctx) }
  class ApplicabilityHandler { +handle(ctx) }
  class CostEstimationHandler { +handle(ctx) }
  class CheapestAtomHandler { +handle(ctx) }
  class ExactSearchAtom { <<abstract>> }
  SelectionHandler <|-- ForcedStrategyHandler
  SelectionHandler <|-- ApplicabilityHandler
  SelectionHandler <|-- CostEstimationHandler
  SelectionHandler <|-- CheapestAtomHandler
  SelectionHandler --> SelectionHandler : next
  ExactMatch --> SelectionHandler : chain
  ExactMatch --> AtomRegistry : registry
  ExactMatch --> CostModel : costModel
  ExactMatch --> AtomFactory : factory
  ExactMatch ..> ShapeBuilder : shapeOf()
  ExactMatch o--> ExactSearchAtom : chosen atom
  AtomFactory --> AtomRegistry
  AtomRegistry o--> "1..*" ExactSearchAtom : registered classes
  CostEstimationHandler ..> CostModel
  note for ExactMatch "Open/Closed: never names a concrete atom.<br>Dependency Inversion: registry, cost model,<br>factory and chain are injected."
  note for SelectionHandler "Chain of Responsibility:<br>Forced → Applicability → CostEstimation → Cheapest"
```

## CLI (Facade + Command)

```mermaid
---
title: Command line — Facade + Command + Factory Method — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
classDiagram
  direction LR
  class IoSFacade {
    +registry AtomRegistry
    +listComponents() Manifest[]
    +createMolecule(component, opts) ExactMatch
    +run(fastaText, opts, component) RunResult
    +explain(fastaText, opts, component) Record
    +runJsonl(fastaText, opts, component) Iterable~string~
  }
  class Command {
    <<abstract>>
    +args string[]
    +execute(io)* Promise~number~
  }
  class RunCommand { +execute(io) }
  class ExplainCommand { +execute(io) }
  class ListCommand { +execute(io) }
  class HelpCommand { +execute(io) }
  class CommandFactory {
    -commands Map$
    +create(argv)$ Command
  }
  class FastaReader {
    <<module>>
    +parseFasta(text) Iterable~Entry~
    +readFasta(text) Entry[]
    +formatFasta(entries, width) string
  }
  class ExactMatch
  Command <|-- RunCommand
  Command <|-- ExplainCommand
  Command <|-- ListCommand
  Command <|-- HelpCommand
  CommandFactory ..> Command : creates
  RunCommand ..> IoSFacade
  ExplainCommand ..> IoSFacade
  ListCommand ..> IoSFacade
  IoSFacade ..> FastaReader
  IoSFacade ..> ExactMatch : creates
  note for IoSFacade "Facade: CLI and web demo use only this class."
```

## Sequence diagram: explain

```mermaid
---
title: "Sequence: node bin/ios.js explain --patterns ACGT,GGCC < in.fasta — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)"
---
sequenceDiagram
  autonumber
  actor User
  participant CLI as bin/ios.js
  participant F as CommandFactory
  participant C as ExplainCommand
  participant Fa as IoSFacade
  participant EM as ExactMatch
  participant SB as ShapeBuilder
  participant Ch as Selection chain
  participant CM as CostModel
  participant AF as AtomFactory
  User->>CLI: argv + FASTA on stdin
  CLI->>F: create(argv)
  F-->>CLI: ExplainCommand
  CLI->>C: execute(io)
  C->>Fa: explain(fasta, {patterns})
  Fa->>EM: new ExactMatch(params)
  Fa->>EM: decide(first record)
  EM->>SB: withPatterns().withText().build()
  SB-->>EM: shape {n, σ, k, m…}
  EM->>Ch: handle(ctx)
  Note over Ch: Forced → Applicability → CostEstimation → Cheapest
  Ch->>CM: estimate(atom, shape) for each applicable atom
  CM-->>Ch: seconds
  Ch-->>EM: selected + why + estimates
  EM->>AF: create(selected, params)
  AF-->>EM: atom instance
  EM-->>Fa: record
  Fa-->>C: record
  C-->>User: JSON on stdout
```

## Hand-drawable version

```mermaid
---
title: Hand-drawable version (9 boxes, all key methods) — Qunoo A K Taweel (23291712), Zeynep Arıcan (24290319)
---
classDiagram
  direction TB
  class ExactSearchAtom {
    <<abstract>>
    +process(entry)
    #prepare(patterns)
    #findAll(text, hits)*
  }
  class XxxSearch {
    12 atoms: Horspool, BM, DS, HMbs,
    ShiftOr, KMP, RK, AC, WM, SA, FM, Naive
    #prepare(patterns)
    #findAll(text, hits)
  }
  class ExactMatch {
    +record
    +decide(firstEntry)
    +run(entries)
    #createAtom(name, params)
  }
  class AtomRegistry {
    +register(Atom)
    +get(name)
    +atoms()
  }
  class AtomFactory {
    +create(name, params)
  }
  class SelectionHandler {
    <<abstract>>
    +setNext(h)
    +handle(ctx)
  }
  class CostModel {
    +estimate(Atom, shape)
  }
  class ShapeBuilder {
    +withPatterns(p)
    +withText(t)
    +build()
  }
  class IoSFacade {
    +run(fasta, opts)
    +explain(fasta, opts)
  }
  ExactSearchAtom <|-- XxxSearch
  ExactMatch o--> ExactSearchAtom
  ExactMatch --> SelectionHandler
  ExactMatch --> AtomFactory
  ExactMatch ..> ShapeBuilder
  SelectionHandler --> SelectionHandler : next
  SelectionHandler ..> CostModel
  AtomFactory --> AtomRegistry
  IoSFacade ..> ExactMatch
```
