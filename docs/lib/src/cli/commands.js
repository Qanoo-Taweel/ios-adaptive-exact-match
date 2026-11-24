import { IoSFacade } from '../IoSFacade.js';

/**
 * CLI commands.
 *
 * PATTERN: Command. Each sub-command (run, explain, list, help) is an object
 *   with `execute(io)`. bin/ios.js only parses argv and calls execute().
 * PATTERN: Factory Method: CommandFactory.create(argv) picks the command.
 * SOLID (S/O): a new sub-command is a new class + one line in the factory.
 */
export class Command {
  constructor(args) { this.args = args; }
  /** @param {{stdin:()=>Promise<string>, out:(s:string)=>void, err:(s:string)=>void}} io */
  async execute(_io) { throw new Error('not implemented'); }
}

export function parseOptions(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ignoreCase' || a === '--ignore-case') opts.ignoreCase = true;
    else if (a === '--patterns' || a === '-p') opts.patterns = argv[++i];
    else if (a.startsWith('--patterns=')) opts.patterns = a.slice(11);
    else if (a === '--strategy' || a === '-s') opts.strategy = argv[++i];
    else if (a.startsWith('--strategy=')) opts.strategy = a.slice(11);
    else if (a === '--quiet' || a === '-q') opts.quiet = true;
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else opts._.push(a);
  }
  return opts;
}

function patternList(opts) {
  if (opts.patterns === undefined) throw new Error('--patterns is required, e.g. --patterns ACGT,GGCC');
  return String(opts.patterns).split(',');
}

export class RunCommand extends Command {
  async execute(io) {
    const o = parseOptions(this.args);
    const component = o._[0] ?? 'ExactMatch';
    const facade = new IoSFacade();
    const input = await io.stdin();
    const { molecule, matches } = facade.run(input, {
      patterns: patternList(o), ignoreCase: !!o.ignoreCase, strategy: o.strategy ?? 'auto',
    }, component);
    let buf = '';
    let count = 0;
    for (const m of matches) {
      buf += JSON.stringify(m) + '\n';
      count++;
      if (buf.length > 1 << 16) { io.out(buf); buf = ''; }
    }
    if (buf) io.out(buf);
    if (!o.quiet) {
      const r = molecule.record;
      io.err(`[ExactMatch] selected=${r.selected} requested=${r.requested} matches=${count} | ${r.why}\n`);
    }
    return 0;
  }
}

export class ExplainCommand extends Command {
  async execute(io) {
    const o = parseOptions(this.args);
    const component = o._[0] ?? 'ExactMatch';
    const record = new IoSFacade().explain(await io.stdin(), {
      patterns: patternList(o), ignoreCase: !!o.ignoreCase, strategy: o.strategy ?? 'auto',
    }, component);
    io.out(JSON.stringify(record, null, 2) + '\n');
    return 0;
  }
}

export class ListCommand extends Command {
  async execute(io) {
    for (const m of new IoSFacade().listComponents()) {
      io.out(`${m.name.padEnd(20)} ${m.kind.padEnd(9)} ${m.title}  [${m.references.join('; ')}]\n`);
    }
    return 0;
  }
}

export class HelpCommand extends Command {
  async execute(io) {
    io.out(`IoS exact pattern matching (sequence.pattern-match.exact)

usage:
  node bin/ios.js run ExactMatch --patterns ACGT,GGCC [--ignoreCase] [--strategy auto|<Atom>] < in.fasta > out.jsonl
  node bin/ios.js explain --patterns ACGT,GGCC [--ignoreCase] < in.fasta
  node bin/ios.js list
  node bin/ios.js help
`);
    return 0;
  }
}

export class CommandFactory {
  static #commands = { run: RunCommand, explain: ExplainCommand, list: ListCommand, help: HelpCommand };

  static create(argv) {
    const [name = 'help', ...rest] = argv;
    const C = CommandFactory.#commands[name];
    if (!C) throw new Error(`unknown command '${name}'. Commands: ${Object.keys(CommandFactory.#commands).join(', ')}`);
    return new C(rest);
  }
}
