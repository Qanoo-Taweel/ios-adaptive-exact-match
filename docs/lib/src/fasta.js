/**
 * Minimal FASTA reader. Produces FASTA.Entry objects:
 *   { header: ">id description", seq: "ACGT..." }   (seq never contains whitespace)
 * Lines starting with ';' are comments. Text before the first header is ignored.
 */
export function* parseFasta(text) {
  let header = null;
  let parts = [];
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    if (raw.length === 0 || raw[0] === ';') continue;
    if (raw[0] === '>') {
      if (header !== null) yield { header, seq: parts.join('') };
      header = raw.trimEnd();
      parts = [];
    } else if (header !== null) {
      parts.push(raw.replace(/\s+/g, ''));
    }
  }
  if (header !== null) yield { header, seq: parts.join('') };
}

export function readFasta(text) {
  return [...parseFasta(text)];
}

/** Writes entries back as FASTA (60 columns). */
export function formatFasta(entries, width = 60) {
  let out = '';
  for (const e of entries) {
    out += e.header + '\n';
    for (let i = 0; i < e.seq.length; i += width) out += e.seq.slice(i, i + width) + '\n';
  }
  return out;
}
