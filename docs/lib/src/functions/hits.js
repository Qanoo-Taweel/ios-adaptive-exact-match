/**
 * HitCollector: gathers raw (uniquePatternIndex, position) hits from an
 * algorithm and returns them in contract order (§4.2):
 *   position ascending, then index in the caller's `patterns` list ascending.
 *
 * Duplicate patterns are searched once (as one "unique" pattern) and expanded
 * here to every original index, so each duplicate is reported separately.
 *
 * Each hit is stored as one float key = position * K + originalIndex,
 * which sorts correctly with a single numeric TypedArray sort and stays exact
 * while position * K < 2^53.
 */
export class HitCollector {
  /**
   * @param {number} originalCount number of patterns as given by the caller
   * @param {number[][]} owners owners[u] = original indices of unique pattern u (ascending)
   */
  constructor(originalCount, owners) {
    this.K = originalCount;
    this.owners = owners;
    this.keys = new Float64Array(64);
    this.size = 0;
    this.sorted = true;
    this.last = -1;
  }

  add(unique, position) {
    const own = this.owners[unique];
    for (let j = 0; j < own.length; j++) this.#push(position * this.K + own[j]);
  }

  #push(key) {
    if (this.size === this.keys.length) {
      const bigger = new Float64Array(this.keys.length * 2);
      bigger.set(this.keys);
      this.keys = bigger;
    }
    if (key < this.last) this.sorted = false;
    this.last = key;
    this.keys[this.size++] = key;
  }

  get count() { return this.size; }

  /** Iterates [position, originalIndex] pairs in contract order. */
  *ordered() {
    const keys = this.keys.subarray(0, this.size);
    if (!this.sorted) keys.sort();
    const K = this.K;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const idx = key % K;
      yield [(key - idx) / K, idx];
    }
  }
}
