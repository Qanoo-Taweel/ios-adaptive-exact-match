import { ExactSearchAtom, TASK } from '../atomic/ExactSearchAtom.js';
import { registry as defaultRegistry } from '../registry.js';
import { shapeOf } from '../shape.js';
import { AtomFactory } from '../selection/AtomFactory.js';
import { CostModel } from '../selection/CostModel.js';
import { buildSelectionChain } from '../selection/SelectionChain.js';

const now = () => (globalThis.performance ? performance.now() : Date.now());

/**
 * ExactMatch molecule (§4.4): looks at the shape of the FIRST record,
 * estimates every registered atom's cost, and runs the cheapest atom for the
 * whole stream.
 *
 *   const em = new ExactMatch({ patterns, ignoreCase, strategy: 'auto' });
 *   for (const match of em.run(entries)) { ... }
 *   em.record  // { requested, selected, shape, estimates, why, ... }
 *
 * PATTERN: Strategy (context side): holds one ExactSearchAtom chosen at run time.
 * PATTERN: Chain of Responsibility: the decision is delegated to selection/SelectionChain.js.
 * PATTERN: Factory Method: `createAtom()` builds the chosen atom (overridable).
 * PATTERN: Dependency Injection: registry, cost model and factory are constructor arguments.
 * SOLID (O): this file never names a concrete atom. New atoms only need
 *   `registry.register(MyAtom)`; this is proven by a test with a fake atom.
 * SOLID (D): depends on abstractions (registry interface, CostModel), not atoms.
 */
export class ExactMatch {
  static manifest = {
    name: 'ExactMatch', version: '1.0.0', kind: 'molecule', task: TASK,
    title: 'Exact match (adaptive molecule)',
    references: ['Allmer 2016', 'Internet of Science: molecule contract'],
  };

  /**
   * @param {{patterns:string[], ignoreCase?:boolean, strategy?:string, expectedRecords?:number}} params
   *   expectedRecords (optional): override the stream prior used by the cost model
   * @param {{registry?:object, costModel?:CostModel, factory?:AtomFactory}} deps
   */
  constructor(params, deps = {}) {
    const { patterns, ignoreCase } = ExactSearchAtom.validateParams(params);
    const strategy = params.strategy ?? 'auto';
    if (typeof strategy !== 'string') throw new TypeError("strategy must be 'auto' or an atom name");
    this.registry = deps.registry ?? defaultRegistry;
    this.costModel = deps.costModel ?? new CostModel();
    this.factory = deps.factory ?? new AtomFactory(this.registry);
    this.chain = deps.chain ?? buildSelectionChain();
    if (strategy !== 'auto') this.registry.get(strategy); // fail fast with the list of options
    const expectedRecords = params.expectedRecords;
    if (expectedRecords !== undefined && !(Number.isInteger(expectedRecords) && expectedRecords >= 1)) {
      throw new TypeError('expectedRecords must be a positive integer');
    }
    this.params = { patterns: [...patterns], ignoreCase, strategy, expectedRecords };
    this.atom = null;
    this.record = { requested: strategy, selected: null, shape: null, estimates: null, why: 'no record seen yet' };
  }

  /** Factory Method: subclasses may override to wrap or instrument atoms. */
  createAtom(name, params) {
    return this.factory.create(name, params);
  }

  /** Makes (or returns) the decision for this stream, based on `firstEntry`. */
  decide(firstEntry) {
    if (this.atom) return this.record;
    const t0 = now();
    const shape = shapeOf(firstEntry, this.params);
    const records = this.params.expectedRecords ?? CostModel.expectedRecords(shape);
    const ctx = this.chain.handle({
      requested: this.params.strategy,
      forced: false,
      shape,
      records,
      registry: this.registry,
      costModel: this.costModel,
    });
    const toMs = (s) => Number((s * 1e3).toPrecision(4));
    const estimates = {};
    for (const A of this.registry.atoms()) {
      const name = A.manifest.name;
      estimates[name] = name in ctx.estimates ? toMs(ctx.estimates[name]) : null;
    }
    this.atom = this.createAtom(ctx.selected, { patterns: this.params.patterns, ignoreCase: this.params.ignoreCase });
    this.record = {
      requested: this.params.strategy,
      selected: ctx.selected,
      shape,
      estimates,                 // milliseconds, null = not applicable
      unit: 'ms',
      plannedRecords: records,   // stream prior used for the estimates (see CostModel.expectedRecords)
      ranking: ctx.ranking,
      excluded: ctx.excluded,
      why: ctx.why,
      model: { kind: 'calibrated cost model', version: this.costModel.version },
      decisionMs: Math.round((now() - t0) * 1000) / 1000,
    };
    return this.record;
  }

  /** Runs the stream. The decision is made on the first entry and kept for all others. */
  *run(entries) {
    for (const entry of entries) {
      if (!this.atom) this.decide(entry);
      yield* this.atom.process(entry);
    }
    if (!this.atom) this.decide(null);
  }

  /** Single-record convenience, same signature as an atom. */
  *process(entry) {
    if (!this.atom) this.decide(entry);
    yield* this.atom.process(entry);
  }
}

export default ExactMatch;
