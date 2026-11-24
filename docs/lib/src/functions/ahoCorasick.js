/**
 * Aho-Corasick (Aho & Corasick 1975). All patterns in one left-to-right pass.
 * The goto/failure automaton is compiled into a full DFA table
 * (states × S) so the scan loop is one table lookup per character.
 * Outputs are linked through "dictionary suffix links" so every state only
 * stores the patterns ending exactly there.
 *   preprocessing O(Σm · S), search O(n + occ).
 */
export function prepareAhoCorasick(patterns, S) {
  let total = 1;
  for (const p of patterns) total += p.length;
  const delta = new Int32Array(total * S).fill(-1);
  const out = new Int32Array(total).fill(-1);       // first pattern ending here
  const outNext = new Int32Array(patterns.length).fill(-1); // same-state chain (unique patterns ⇒ at most one, kept general)
  const depth = new Int32Array(total);
  let states = 1;
  patterns.forEach((p, u) => {
    let s = 0;
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      let nx = delta[s * S + c];
      if (nx === -1) { nx = states++; delta[s * S + c] = nx; depth[nx] = depth[s] + 1; }
      s = nx;
    }
    outNext[u] = out[s];
    out[s] = u;
  });
  const fail = new Int32Array(states);
  const dict = new Int32Array(states).fill(-1); // nearest proper suffix state with output
  const queue = new Int32Array(states);
  let qh = 0, qt = 0;
  for (let c = 0; c < S; c++) {
    const nx = delta[c];
    if (nx === -1) delta[c] = 0;
    else { fail[nx] = 0; queue[qt++] = nx; }
  }
  while (qh < qt) {
    const s = queue[qh++];
    const f = fail[s];
    dict[s] = out[f] !== -1 ? f : dict[f];
    for (let c = 0; c < S; c++) {
      const nx = delta[s * S + c];
      if (nx === -1) delta[s * S + c] = delta[f * S + c];
      else { fail[nx] = delta[f * S + c]; queue[qt++] = nx; }
    }
  }
  const lengths = Int32Array.from(patterns, (p) => p.length);
  return { delta: delta.subarray(0, states * S), out, outNext, dict, S, lengths, states };
}

export function searchAhoCorasick(t, n, prep, onHit) {
  const { delta, out, outNext, dict, S, lengths } = prep;
  let s = 0;
  for (let i = 0; i < n; i++) {
    s = delta[s * S + t[i]];
    let o = out[s] !== -1 ? s : dict[s];
    while (o !== -1) {
      for (let u = out[o]; u !== -1; u = outNext[u]) onHit(u, i - lengths[u] + 1);
      o = dict[o];
    }
  }
}
