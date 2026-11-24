/**
 * Brute force exact matching on raw strings: O(n·m) worst case.
 * Deliberately independent of the alphabet-reduction code, so the oracle
 * shares as little as possible with the atoms it checks.
 */
export function searchNaive(text, pattern, onHit) {
  const n = text.length, m = pattern.length;
  for (let i = 0; i + m <= n; i++) {
    let j = 0;
    while (j < m && text.charCodeAt(i + j) === pattern.charCodeAt(j)) j++;
    if (j === m) onHit(i);
  }
}
