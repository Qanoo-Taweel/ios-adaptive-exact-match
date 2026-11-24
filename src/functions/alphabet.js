/**
 * Alphabet helpers (pure functions, no I/O).
 *
 * "Alfabe küçültme" (alphabet reduction): every atom works on small integer
 * codes instead of UTF-16 characters. Characters that occur in at least one
 * pattern get the codes 1..S-1; every other character maps to 0 ("other").
 * A text position holding code 0 can never be part of a match, so the
 * reduction never changes the set of matches, but it lets tables be tiny
 * (S entries instead of 65 536) and lets the scan loops read typed arrays.
 */

const A = 65, Z = 90, a = 97, z = 122;

/** ASCII-only case folding: a–z become A–Z, nothing else changes (contract §4.2). */
export function foldAscii(str) {
  let i = 0;
  const n = str.length;
  // Fast path: most inputs contain no lower-case ASCII at all.
  for (; i < n; i++) {
    const c = str.charCodeAt(i);
    if (c >= a && c <= z) break;
  }
  if (i === n) return str;
  const out = new Uint16Array(n);
  for (let j = 0; j < n; j++) {
    const c = str.charCodeAt(j);
    out[j] = c >= a && c <= z ? c - 32 : c;
  }
  // Decode in chunks: String.fromCharCode has an argument-count limit.
  let s = '';
  const CH = 8192;
  for (let j = 0; j < n; j += CH) s += String.fromCharCode.apply(null, out.subarray(j, j + CH));
  return s;
}

export function isAsciiUpper(c) { return c >= A && c <= Z; }

/**
 * Builds the reduced alphabet of a pattern set.
 * @returns {{ size:number, map:Uint16Array, chars:number[] }}
 *   size = number of codes including the "other" code 0.
 */
export function buildAlphabet(patterns) {
  const map = new Uint16Array(65536);
  const chars = [];
  let next = 1;
  for (const p of patterns) {
    for (let i = 0; i < p.length; i++) {
      const c = p.charCodeAt(i);
      if (map[c] === 0) { map[c] = next++; chars.push(c); }
    }
  }
  // ASCII part of the map as a small table for the fast path of encodeText.
  const ascii = map.slice(0, 128);
  return { size: next, map, chars, ascii };
}

const utf8 = new TextEncoder();

/** Typed array able to hold `size` distinct codes. */
export function codeArray(size, length) {
  return size <= 256 ? new Uint8Array(length) : new Uint16Array(length);
}

/**
 * Encodes a text with an alphabet. `extra` spare cells are appended at the
 * end (used for sentinels by the tuned Boyer-Moore atom); they are filled
 * with `fill`.
 */
export function encodeText(text, alphabet, extra = 0, fill = 0) {
  const n = text.length;
  const out = codeArray(alphabet.size, n + extra);
  // Fast path: for pure-ASCII text the native UTF-8 encoder writes exactly one
  // byte per character (= its char code); we then map the bytes in place.
  // ~2× faster than a charCodeAt loop on large texts.
  let done = false;
  if (out instanceof Uint8Array && n > 64) {
    const r = utf8.encodeInto(text, out.subarray(0, n));
    if (r.read === n && r.written === n) {
      const ascii = alphabet.ascii;
      for (let i = 0; i < n; i++) {
        const c = out[i];
        out[i] = c < 128 ? ascii[c] : 0;
      }
      done = true;
    }
  }
  if (!done) {
    const map = alphabet.map;
    for (let i = 0; i < n; i++) out[i] = map[text.charCodeAt(i)];
  }
  if (extra > 0) out.fill(fill, n);
  return out;
}

export function encodePattern(pattern, alphabet) {
  const out = codeArray(alphabet.size, pattern.length);
  for (let i = 0; i < pattern.length; i++) out[i] = alphabet.map[pattern.charCodeAt(i)];
  return out;
}

/** Number of bits needed to store codes 0..size-1. */
export function bitsFor(size) {
  let b = 1;
  while ((1 << b) < size) b++;
  return b;
}
