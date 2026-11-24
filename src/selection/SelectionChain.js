/**
 * Selection pipeline of the ExactMatch molecule.
 *
 * PATTERN: Chain of Responsibility. Each handler does one step and passes the
 *   decision context on:
 *     ForcedStrategyHandler → ApplicabilityHandler → CostEstimationHandler → CheapestAtomHandler
 *   A new rule (e.g. "prefer streaming atoms for huge inputs") is a new
 *   handler inserted into the chain; existing handlers do not change.
 * SOLID (S): one reason to change per handler.
 * SOLID (O): extend the chain instead of editing a big if/else.
 */
export class SelectionHandler {
  setNext(handler) { this.next = handler; return handler; }
  handle(ctx) { return this.next ? this.next.handle(ctx) : ctx; }
}

/** strategy = an atom name → validate it now and remember that the choice is forced. */
export class ForcedStrategyHandler extends SelectionHandler {
  handle(ctx) {
    if (ctx.requested !== 'auto') {
      ctx.registry.get(ctx.requested); // throws with the list of valid options
      ctx.forced = true;
    }
    return super.handle(ctx);
  }
}

/** Drops atoms whose `selection.applicable(shape)` is not `true`, keeping the reason. */
export class ApplicabilityHandler extends SelectionHandler {
  handle(ctx) {
    ctx.candidates = [];
    ctx.excluded = {};
    for (const A of ctx.registry.atoms()) {
      const fn = A.selection.applicable;
      let verdict = true;
      try { verdict = fn ? fn(ctx.shape) : true; } catch (e) { verdict = `applicable() threw: ${e.message}`; }
      if (verdict === true) ctx.candidates.push(A);
      else ctx.excluded[A.manifest.name] = typeof verdict === 'string' ? verdict : 'declared not applicable';
    }
    return super.handle(ctx);
  }
}

/** Asks the cost model for every candidate. */
export class CostEstimationHandler extends SelectionHandler {
  handle(ctx) {
    ctx.estimates = {};
    ctx.details = {};
    for (const A of ctx.candidates) {
      const e = ctx.costModel.estimate(A, ctx.shape);
      ctx.estimates[A.manifest.name] = e.seconds;
      ctx.details[A.manifest.name] = e;
    }
    return super.handle(ctx);
  }
}

/** Picks the cheapest estimate (ties → registry order) unless the choice is forced. */
export class CheapestAtomHandler extends SelectionHandler {
  handle(ctx) {
    const ranking = Object.entries(ctx.estimates)
      .filter(([, s]) => Number.isFinite(s))
      .sort((a, b) => a[1] - b[1]);
    ctx.ranking = ranking.map(([name]) => name);
    if (ctx.forced) {
      ctx.selected = ctx.requested;
      ctx.why = `strategy '${ctx.requested}' was requested explicitly; no automatic choice was made`;
      if (ctx.excluded[ctx.requested]) ctx.why += ` (note: in auto mode it would be excluded: ${ctx.excluded[ctx.requested]})`;
      return super.handle(ctx);
    }
    if (ranking.length === 0) {
      throw new Error('no applicable atom for this input: ' + JSON.stringify(ctx.excluded));
    }
    const [best, bestS] = ranking[0];
    ctx.selected = best;
    const fmt = (s) => `${(s * 1e3).toPrecision(3)} ms`;
    const s = ctx.shape;
    let why = `cheapest estimated cost: ${best} ≈ ${fmt(bestS)} for n=${s.n}, σ=${s.sigma}, k=${s.k}, m=${s.mMin}..${s.mMax}`;
    if (ranking.length > 1) {
      const [second, secS] = ranking[1];
      why += `; next best ${second} ≈ ${fmt(secS)} (${(secS / Math.max(bestS, 1e-12)).toFixed(2)}× slower)`;
    }
    const nEx = Object.keys(ctx.excluded).length;
    if (nEx) why += `; ${nEx} atom(s) not applicable: ${Object.keys(ctx.excluded).join(', ')}`;
    ctx.why = why;
    return super.handle(ctx);
  }
}

export function buildSelectionChain() {
  const head = new ForcedStrategyHandler();
  head.setNext(new ApplicabilityHandler())
    .setNext(new CostEstimationHandler())
    .setNext(new CheapestAtomHandler());
  return head;
}
