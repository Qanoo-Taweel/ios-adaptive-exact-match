// Calibration grid (Task 4.1): 3 alphabets × 4 n × 5 m × 4 k = 240 cases (brief minimum: 3 × 3 × 5 × 4 = 180).
export const GRID = {
  alphabets: ['dna', 'protein', 'text'],
  n: [1e3, 1e4, 1e5, 1e6], // the brief requires 1e4..1e6; 1e3 is extra so short records (e.g. single proteins) are inside the calibrated range
  m: [4, 12, 24, 48, 96],
  k: [1, 4, 16, 64],
  seed: 1000,
  reps: 3,
};
