/**
 * Prepares the GitHub Pages site in docs/:
 *   docs/lib/src/      copy of src/ (the browser demo runs the real molecule)
 *   docs/data/         test FASTA files + summarised results (JSON)
 * docs/index.html, docs/assets/* are hand-written and not generated.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const p = (x) => new URL(x, root);

rmSync(p('docs/lib'), { recursive: true, force: true });
mkdirSync(p('docs/lib'), { recursive: true });
cpSync(p('src'), p('docs/lib/src'), { recursive: true });
mkdirSync(p('docs/data'), { recursive: true });
cpSync(p('tests/data/lambda.fasta'), p('docs/data/lambda.fasta'));
cpSync(p('tests/data/ecoli-proteins.fasta'), p('docs/data/ecoli-proteins.fasta'));

const val = JSON.parse(readFileSync(p('bench/results/validation.json'), 'utf8'));
const cal = JSON.parse(readFileSync(p('bench/results/calibration.json'), 'utf8'));
const summary = {
  machine: val.machine,
  tables: val.tables,
  results: val.results.map(({ estimates, ...r }) => r),
  calibration: {
    grid: cal.grid,
    machine: cal.machine,
    cases: cal.cases.map(({ id, alphabet, n, m, k, times, fastest, matches }) => ({ id, alphabet, n, m, k, times, fastest, matches })),
  },
};
writeFileSync(p('docs/data/results.json'), JSON.stringify(summary));
writeFileSync(p('docs/.nojekyll'), '');
console.log('site data written to docs/lib, docs/data');
