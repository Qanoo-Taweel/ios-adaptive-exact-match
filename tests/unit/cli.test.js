// §4.5 command line.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../../bin/ios.js', import.meta.url));
const run = (args, input) => spawnSync(process.execPath, [bin, ...args], { input, encoding: 'utf8' });
const FASTA = '>chr1 test\nACGTACGT\nGGCC\n>chr2\nggccACGT\n';

describe('CLI', () => {
  it('run writes one Sequence.Match per line (JSONL)', () => {
    const r = run(['run', 'ExactMatch', '--patterns', 'ACGT,GGCC'], FASTA);
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.trim().split('\n').map((l) => JSON.parse(l));
    assert.deepEqual(lines, [
      { header: '>chr1 test', pattern: 'ACGT', position: 0, length: 4 },
      { header: '>chr1 test', pattern: 'ACGT', position: 4, length: 4 },
      { header: '>chr1 test', pattern: 'GGCC', position: 8, length: 4 },
      { header: '>chr2', pattern: 'ACGT', position: 4, length: 4 },
    ]);
    assert.match(r.stderr, /selected=/);
  });

  it('run honours --ignoreCase and --strategy', () => {
    const r = run(['run', 'ExactMatch', '--patterns', 'GGCC', '--ignoreCase', '--strategy', 'KmpSearch'], FASTA);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.trim().split('\n').length, 2);
    assert.match(r.stderr, /selected=KmpSearch/);
  });

  it('explain prints the decision as JSON', () => {
    const r = run(['explain', '--patterns', 'ACGT,GGCC'], FASTA);
    assert.equal(r.status, 0, r.stderr);
    const rec = JSON.parse(r.stdout);
    assert.equal(rec.requested, 'auto');
    assert.equal(rec.shape.n, 12);
    assert.ok(rec.selected && rec.why && rec.estimates);
  });

  it('errors are reported with a non-zero exit code', () => {
    const r = run(['run', 'ExactMatch', '--patterns', 'A', '--strategy', 'Nope'], FASTA);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Valid options: auto/);
    assert.equal(run(['run', 'ExactMatch'], FASTA).status, 1);
  });

  it('list shows every component', () => {
    const r = run(['list'], '');
    assert.match(r.stdout, /ExactMatch/);
    assert.match(r.stdout, /FmIndexSearch/);
  });
});
