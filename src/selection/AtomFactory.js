/**
 * AtomFactory: creates atom instances by NAME.
 *
 * PATTERN: Factory Method. Callers (the molecule, the benchmarks, the CLI)
 *   say "give me a HorspoolSearch for these params" and never call `new` on a
 *   concrete class. ExactMatch also exposes `createAtom()` as an overridable
 *   factory method that delegates here.
 * SOLID (D): high-level code depends on names + the ExactSearchAtom
 *   abstraction, not on concrete atom classes.
 */
export class AtomFactory {
  constructor(registry) {
    this.registry = registry;
  }

  create(name, params) {
    const AtomClass = this.registry.get(name);
    return new AtomClass(params);
  }
}
