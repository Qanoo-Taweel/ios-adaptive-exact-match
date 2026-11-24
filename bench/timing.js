/**
 * Timing helpers. Rules from the brief (§6, Görev 4):
 *   - a warm-up run before measuring,
 *   - at least 3 repetitions, the MEDIAN is reported,
 *   - very short runs (< MIN_SAMPLE_MS) are repeated inside one sample and
 *     averaged, so timer resolution does not dominate.
 */
const MIN_SAMPLE_MS = 2;

export const nowMs = () => Number(process.hrtime.bigint()) / 1e6;

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

/**
 * Measures fn(). Returns { ms (median per call), samples, inner, result }.
 * @param {() => any} fn
 */
export function measure(fn, { warmup = 1, reps = 3 } = {}) {
  let result;
  for (let i = 0; i < warmup; i++) result = fn();
  // how many calls per sample?
  let inner = 1;
  const t0 = nowMs();
  fn();
  const one = nowMs() - t0;
  if (one < MIN_SAMPLE_MS) inner = Math.min(1000, Math.ceil(MIN_SAMPLE_MS / Math.max(one, 0.001)));
  const samples = [];
  for (let r = 0; r < reps; r++) {
    const s = nowMs();
    for (let i = 0; i < inner; i++) result = fn();
    samples.push((nowMs() - s) / inner);
  }
  return { ms: median(samples), samples, inner, result };
}

/** Consumes a generator of matches, returns the count (forces the full run). */
export function drain(gen) {
  let c = 0;
  for (const _ of gen) c++;
  return c;
}

export async function machineInfo() {
  const os = await import('node:os');
  const cpus = os.cpus();
  return {
    cpu: cpus[0]?.model ?? 'unknown',
    cores: cpus.length,
    memGB: Math.round(os.totalmem() / 2 ** 30),
    node: process.version,
    platform: `${os.platform()} ${os.release()}`,
    date: new Date().toISOString(),
  };
}
