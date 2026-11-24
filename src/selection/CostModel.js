import { CALIBRATION } from './coefficients.js';
import { PER_RUN_FEATURES } from '../functions/costs.js';

/**
 * CostModel: estimate(atom, shape) = Σ_f coef[f] · features(shape)[f]   (seconds)
 *
 * Coefficients come from the calibration file written by `npm run calibrate`
 * (bench/calibrate.js). An atom that was never calibrated, e.g. one added
 * after calibration or a fake atom in a test, falls back to the
 * `selection.defaults` it declares itself, so new atoms work without
 * touching this file.
 *
 * SOLID (S): only turns features into a number; picking the winner is the
 *   selection chain's job.
 * SOLID (I, interface segregation): an atom only has to provide `features`
 *   and `defaults`, nothing about how the molecule decides.
 */
export class CostModel {
  constructor(calibration = CALIBRATION) {
    this.calibration = calibration;
  }

  coefficientsFor(AtomClass) {
    const name = AtomClass.manifest.name;
    const cal = this.calibration.atoms?.[name];
    if (cal) return { coef: cal.coef, source: 'calibrated' };
    return { coef: AtomClass.selection.defaults ?? {}, source: 'defaults' };
  }

  /**
   * @param {object} AtomClass
   * @param {object} shape      shape of the first record
   * @param {{records?:number}} opts  expected number of records like the first one
   * @returns {{ seconds:number, perRun:number, perRecord:number, features:object, coef:object, source:string }}
   *
   * Per-run part (pattern preprocessing, fixed overhead) is paid once; the
   * per-record part (encoding, scanning, text indexing, output) once per record.
   */
  estimate(AtomClass, shape, { records = 1 } = {}) {
    const features = AtomClass.selection.features(shape) ?? {};
    const { coef, source } = this.coefficientsFor(AtomClass);
    let perRun = Number(coef.base ?? 0);
    let perRecord = 0;
    for (const [f, v] of Object.entries(features)) {
      const c = (coef[f] ?? 0) * v;
      if (PER_RUN_FEATURES.has(f)) perRun += c; else perRecord += c;
    }
    return { seconds: perRun + records * perRecord, perRun, perRecord, features, coef, source };
  }

  /**
   * Stream prior: how many records like the first one we plan for.
   * The molecule must decide on the first record alone (§4.4). A long first
   * record (a genome) is planned as a single record; a short one (a protein, a
   * read) is planned as part of a stream of ≈ 2^16 characters, at most 128
   * records. Without this, pattern preprocessing that is paid once looks as
   * expensive as re-indexing every record (see report §6, §7).
   */
  static expectedRecords(shape) {
    if (!(shape.n > 0)) return 1;
    return Math.max(1, Math.min(128, Math.round(65536 / shape.n)));
  }

  get version() { return this.calibration.meta?.version ?? this.calibration.meta?.source ?? 'unknown'; }
}
