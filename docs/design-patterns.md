# Design patterns and SOLID

This page lists each design pattern and SOLID principle used in the component,
the file and class that implement it, and the reason it was chosen. Each class
also carries a short `PATTERN:` comment in its header.

> Türkçe özet: Aşağıdaki tablolar her tasarım deseninin ve SOLID ilkesinin
> hangi dosya ve sınıfta uygulandığını ve neden seçildiğini gösterir.

## Design patterns

| Pattern | Where (file → class) | Reason |
|---|---|---|
| **Template Method** | `src/atomic/ExactSearchAtom.js` → `ExactSearchAtom.process()` | The contract steps (validate, fold case, sort, report duplicates) are identical for every algorithm, so they are implemented once in `process()`; each atom implements only the hooks `prepare()` and `findAll()`. |
| **Strategy** | the 12 classes in `src/atomic/*Search.js`, used by `ExactMatch` | All atoms solve the same task through the same interface, so the molecule can select one at run time. |
| **Registry (plug-in)** | `src/registry.js` → `AtomRegistry` | Adding an atom must not require changes to the molecule; the molecule queries the registry instead of importing concrete atoms. |
| **Factory Method** | `src/selection/AtomFactory.js` → `AtomFactory.create()`, `ExactMatch.createAtom()`; `src/cli/commands.js` → `CommandFactory.create()` | Objects are created by name (`"HorspoolSearch"`, `"explain"`), so callers do not depend on concrete classes; a subclass can override `createAtom()` to wrap atoms (for example, for timing). |
| **Chain of Responsibility** | `src/selection/SelectionChain.js` → `ForcedStrategyHandler → ApplicabilityHandler → CostEstimationHandler → CheapestAtomHandler` | Atom selection is a sequence of independent steps; a new rule is added as a new handler rather than as another branch in a single method. |
| **Facade** | `src/IoSFacade.js` → `IoSFacade` | The CLI and the web demo need "FASTA text in, matches or decision out"; the facade hides the reader, registry, molecule and JSONL formatting behind four methods. |
| **Command** | `src/cli/commands.js` → `RunCommand`, `ExplainCommand`, `ListCommand`, `HelpCommand` | Each CLI verb is an object with `execute(io)`; `bin/ios.js` stays minimal and the commands can be tested without a terminal. |
| **Builder** | `src/shape.js` → `ShapeBuilder` | The data shape is assembled step by step (`withPatterns().withText().build()`), identically for the molecule, the benchmarks and the tests. |
| **Dependency Injection** | `new ExactMatch(params, { registry, costModel, factory, chain })` | Collaborators are passed in through the constructor, so tests can substitute a registry or cost model without modifying the molecule. |

## SOLID

| Principle | How the code follows it | Evidence |
|---|---|---|
| **S** (single responsibility) | Algorithm cores are pure functions in `src/functions/`; atoms only adapt them to the contract; `ShapeBuilder` only measures the input; `CostModel` only turns features into time estimates; each selection handler performs one step; `IoSFacade` only orchestrates. | One file per responsibility, see the `src/` tree |
| **O** (open/closed) | A new atom is a new class plus `registry.register()`. `ExactMatch.js` does not reference any concrete atom. | `tests/unit/molecule.test.js` → "a fake atom added to the registry inside the test can be selected" |
| **L** (Liskov substitution) | Any atom can replace any other: same input, same output, same order. | `tests/unit/contract.test.js` runs the same contract on all 12 atoms; the "forced strategies" test obtains identical output from each |
| **I** (interface segregation) | An atom exposes only `manifest`, `selection { features, defaults, applicable }`, `constructor(params)` and `process(entry)`; it has no knowledge of how it is selected. | `src/atomic/ExactSearchAtom.js` |
| **D** (dependency inversion) | The molecule depends on abstractions (registry, cost model, factory, chain) supplied through the constructor, not on concrete atoms. | `src/molecules/ExactMatch.js` constructor |

## Design rationale

* **Chain of Responsibility instead of a single conditional.** Each selection
  step can be tested in isolation, and new steps can be added without modifying
  the existing ones. For example, a rule that prefers streaming atoms for very
  large inputs would be one additional handler.
* **Facade in addition to the molecule.** The molecule has no knowledge of FASTA
  text, standard input or JSONL. The facade is the single entry point for user
  interfaces (CLI, browser demo), which therefore remain thin and consistent.
* **Factory Method.** `ExactMatch.createAtom(name, params)` is the factory
  method (overridable in a subclass); it delegates to `AtomFactory.create()`,
  which resolves the class through the registry. `CommandFactory.create(argv)`
  does the same for CLI verbs.
* **Template Method.** The contract rules (ordering, duplicate patterns,
  `ignoreCase`, empty input) are implemented once in the base class, so all 12
  atoms apply them consistently.
* **Extensibility without changes to the molecule.** The molecule test registers
  an atom class defined only inside the test file; the molecule selects it and
  returns correct results.
