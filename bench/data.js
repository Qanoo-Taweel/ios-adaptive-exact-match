/**
 * Seeded synthetic data (deterministic: same seed → same data).
 * PRNG: mulberry32. Alphabets carry realistic letter frequencies where it matters.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** name → { chars, weights } */
export const ALPHABETS = {
  // calibration alphabets
  dna: { chars: 'ACGT', weights: [0.25, 0.25, 0.25, 0.25] },
  protein: {
    chars: 'ACDEFGHIKLMNPQRSTVWY',
    // UniProtKB/Swiss-Prot amino-acid composition (%)
    weights: [8.25, 1.38, 5.46, 6.72, 3.86, 7.07, 2.27, 5.91, 5.80, 9.65, 2.41, 4.06, 4.74, 3.93, 5.53, 6.64, 5.35, 6.86, 1.10, 2.92],
  },
  text: {
    chars: ' ETAOINSHRDLCUMWFGYPBVKJXQZ',
    // English letter frequencies with space
    weights: [18.3, 10.2, 7.7, 6.8, 6.6, 5.7, 5.7, 5.3, 5.0, 5.0, 3.5, 3.4, 2.3, 2.3, 2.0, 1.9, 1.8, 1.6, 1.6, 1.5, 1.3, 0.8, 0.6, 0.15, 0.15, 0.1, 0.07],
  },
  // validation-only alphabets (never used in calibration)
  binary: { chars: 'ab', weights: [0.5, 0.5] },
  alnum: { chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', weights: null },
  rna: { chars: 'ACGU', weights: [0.3, 0.2, 0.2, 0.3] },
};

function sampler(alpha, rng) {
  const { chars, weights } = alpha;
  if (!weights) return () => chars[(rng() * chars.length) | 0];
  const total = weights.reduce((a, b) => a + b, 0);
  const cum = [];
  let acc = 0;
  for (const w of weights) { acc += w / total; cum.push(acc); }
  return () => {
    const r = rng();
    let i = 0;
    while (i < cum.length - 1 && r > cum[i]) i++;
    return chars[i];
  };
}

export function randomText(alphabet, n, rng) {
  const alpha = typeof alphabet === 'string' ? ALPHABETS[alphabet] : alphabet;
  const next = sampler(alpha, rng);
  const parts = new Array(n);
  for (let i = 0; i < n; i++) parts[i] = next();
  return parts.join('');
}

/** Highly repetitive text: a short unit repeated, with rare point mutations. */
export function repetitiveText(unit, n, rng, mutationRate = 0, alphabet = unit) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = rng && rng() < mutationRate ? alphabet[(rng() * alphabet.length) | 0] : unit[i % unit.length];
  }
  return out.join('');
}

/**
 * k patterns of length m: a fraction taken from the text (guaranteed hits),
 * the rest random over the same alphabet (mostly misses).
 */
export function makePatterns(text, alphabet, k, m, rng, fromText = 0.5) {
  const pats = [];
  for (let i = 0; i < k; i++) {
    if (rng() < fromText && text.length >= m) {
      const s = (rng() * (text.length - m + 1)) | 0;
      pats.push(text.slice(s, s + m));
    } else {
      pats.push(randomText(alphabet, m, rng));
    }
  }
  return pats;
}

/** Splits a text into `records` FASTA entries. */
export function toEntries(text, records = 1, name = 'syn') {
  if (records <= 1) return [{ header: `>${name}`, seq: text }];
  const size = Math.ceil(text.length / records);
  const out = [];
  for (let r = 0; r < records; r++) out.push({ header: `>${name}_${r}`, seq: text.slice(r * size, (r + 1) * size) });
  return out;
}
