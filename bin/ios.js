#!/usr/bin/env node
// IoS command line: node bin/ios.js run|explain|list|help ...
import { CommandFactory } from '../src/cli/commands.js';

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

const io = {
  stdin: readStdin,
  out: (s) => process.stdout.write(s),
  err: (s) => process.stderr.write(s),
};

try {
  const code = await CommandFactory.create(process.argv.slice(2)).execute(io);
  process.exitCode = code;
} catch (e) {
  process.stderr.write(`error: ${e.message}\n`);
  process.exitCode = 1;
}
