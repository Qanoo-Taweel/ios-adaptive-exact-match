import { CALIBRATION } from './coefficients.js';

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

  /** @returns {{ seconds:number, features:object, coef:object, source:string }} */
  estimate(AtomClass, shape) {
    const features = AtomClass.selection.features(shape) ?? {};
    const { coef, source } = this.coefficientsFor(AtomClass);
    let seconds = Number(coef.base ?? 0);
    for (const [f, v] of Object.entries(features)) seconds += (coef[f] ?? 0) * v;
    return { seconds, features, coef, source };
  }

  get version() { return this.calibration.meta?.version ?? this.calibration.meta?.source ?? 'unknown'; }
}
