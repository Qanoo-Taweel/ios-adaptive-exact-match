import { TASK } from './atomic/ExactSearchAtom.js';
import * as builtIns from './atomic/index.js';

/**
 * AtomRegistry: the "kayıt defteri" (§4.4). The molecule asks the registry
 * which atoms exist; it never imports an atom class itself.
 *
 * PATTERN: Registry (a.k.a. plug-in registry) + Singleton-like default instance.
 * SOLID (O, open/closed): adding an atom means registering it; the molecule
 *   is closed for modification and open for extension.
 * SOLID (D, dependency inversion): the molecule depends on this abstraction
 *   (any object with get/names/atoms), injected through its constructor.
 */
export class AtomRegistry {
  #atoms = new Map();

  /** Adds an atom class. Validates its manifest and selection block. */
  register(AtomClass) {
    const m = AtomClass?.manifest;
    if (!m || typeof m.name !== 'string') throw new TypeError('atom class needs a static manifest with a name');
    if (m.kind !== 'atom') throw new TypeError(`${m.name}: manifest.kind must be 'atom'`);
    if (m.task !== TASK) throw new TypeError(`${m.name}: manifest.task must be '${TASK}'`);
    const sel = AtomClass.selection;
    if (!sel || typeof sel.features !== 'function' || typeof sel.defaults !== 'object') {
      throw new TypeError(`${m.name}: static selection { features(shape), defaults } is required`);
    }
    if (typeof AtomClass.prototype?.process !== 'function') throw new TypeError(`${m.name}: missing *process(entry)`);
    const existing = this.#atoms.get(m.name);
    if (existing && existing !== AtomClass) throw new Error(`an atom named '${m.name}' is already registered`);
    this.#atoms.set(m.name, AtomClass);
    return this;
  }

  unregister(name) { return this.#atoms.delete(name); }
  has(name) { return this.#atoms.has(name); }
  names() { return [...this.#atoms.keys()]; }
  atoms() { return [...this.#atoms.values()]; }
  get size() { return this.#atoms.size; }

  /** Returns the atom class or throws an error that lists the valid choices (§4.4). */
  get(name) {
    const A = this.#atoms.get(name);
    if (!A) {
      throw new RangeError(`unknown strategy '${name}'. Valid options: auto, ${this.names().join(', ')}`);
    }
    return A;
  }

  /** A copy (used by tests to add fake atoms without touching the default registry). */
  clone() {
    const r = new AtomRegistry();
    for (const A of this.atoms()) r.register(A);
    return r;
  }
}

/** Default registry with every built-in atom. */
export const registry = new AtomRegistry();
for (const A of Object.values(builtIns)) registry.register(A);

export function registerAtom(AtomClass) { return registry.register(AtomClass); }
