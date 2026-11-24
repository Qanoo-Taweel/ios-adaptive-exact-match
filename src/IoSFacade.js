import { parseFasta } from './fasta.js';
import { registry as defaultRegistry } from './registry.js';
import { ExactMatch } from './molecules/ExactMatch.js';

/**
 * IoSFacade: one small entry point for "FASTA text in → matches / decision out".
 *
 * PATTERN: Facade. Hides the FASTA reader, the registry, the molecule, the
 *   selection chain and JSONL formatting behind four methods. The CLI and the
 *   web demo use only this class.
 * SOLID (S): orchestration only, no algorithm or selection logic lives here.
 */
export class IoSFacade {
  constructor({ registry = defaultRegistry } = {}) {
    this.registry = registry;
  }

  /** Manifests of everything that can be run: the molecule and every atom. */
  listComponents() {
    return [ExactMatch.manifest, ...this.registry.atoms().map((A) => ({ ...A.manifest }))];
  }

  /** component = 'ExactMatch' (strategy from opts) or an atom name (forced). */
  createMolecule(component, { patterns, ignoreCase = false, strategy = 'auto' }) {
    if (component && component !== 'ExactMatch') {
      this.registry.get(component); // validates the name
      strategy = component;
    }
    return new ExactMatch({ patterns, ignoreCase, strategy }, { registry: this.registry });
  }

  /** Lazily runs a FASTA text. Returns { molecule, matches } (matches is a generator). */
  run(fastaText, opts, component = 'ExactMatch') {
    const molecule = this.createMolecule(component, opts);
    return { molecule, matches: molecule.run(parseFasta(fastaText)) };
  }

  /** Only the decision (reads only the first record). */
  explain(fastaText, opts, component = 'ExactMatch') {
    const molecule = this.createMolecule(component, opts);
    const first = parseFasta(fastaText).next();
    return molecule.decide(first.done ? null : first.value);
  }

  /** JSONL lines, one Sequence.Match per line. */
  *runJsonl(fastaText, opts, component = 'ExactMatch') {
    const { matches } = this.run(fastaText, opts, component);
    for (const m of matches) yield JSON.stringify(m);
  }
}
