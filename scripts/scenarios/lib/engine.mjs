// ONE bounded Stockfish process for the scenario builders (Lane R, 2026-10-22).
//
// Every read is bounded TWICE: a node budget (deterministic in one thread) and
// a wall-clock watchdog behind it that sends `stop` and, if the engine still
// does not answer, replaces it. The machine is shared with other lanes, so a
// builder keeps exactly one of these alive at a time.
//
//   const engine = await startEngine();
//   const { cp, mate } = await engine.read(fen, { nodes: 3_000_000 });  // side-to-move POV
//   engine.quit();
import { spawn } from 'node:child_process';

/** At a pessimistic 40k nodes/s on a starved machine, plus slack. */
const watchdogMs = (nodes) => Math.ceil(nodes / 40_000) * 1000 + 30_000;

export async function startEngine({ hashMb = 32 } = {}) {
  let proc = null;
  let buf = '';
  let waiter = null;
  let last = null;
  const onData = (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const m = line.match(/^info .*\bdepth (\d+) .*\bscore (mate|cp) (-?\d+).*?\bpv (.+)$/);
      if (m && !/\bupperbound\b|\blowerbound\b/.test(line)) {
        last = { depth: Number(m[1]), kind: m[2], value: Number(m[3]), pv: m[4].split(' ') };
      }
      if (waiter && waiter.re.test(line)) { const w = waiter; waiter = null; w.resolve(line); }
    }
  };
  const until = (re, write, ms) => new Promise((res) => {
    const w = { re, resolve: (line) => { clearTimeout(timer); res(line); } };
    const timer = setTimeout(() => { if (waiter === w) waiter = null; res(null); }, ms);
    waiter = w;
    proc.stdin.write(write);
  });
  const kill = () => { try { proc.stdin.write('quit\n'); proc.kill('SIGKILL'); } catch { /* gone */ } };
  const boot = async () => {
    if (proc) kill();
    proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
    buf = ''; waiter = null;
    proc.stdout.on('data', onData);
    const ok = await until(/^readyok/, `uci\nsetoption name Threads value 1\nsetoption name Hash value ${hashMb}\nisready\n`, 60_000);
    if (ok === null) throw new Error('Stockfish did not start');
  };
  await boot();
  return {
    /**
     * Stockfish's read of `fen` within `nodes` (and `depth`, default 99), from
     * the SIDE TO MOVE's point of view: `{ cp, mate, depth, pv, timedOut }`.
     * `cp` is null when the score is a mate; `mate` is null otherwise.
     */
    async read(fen, { nodes = 2_000_000, depth = 99 } = {}) {
      if ((await until(/^readyok/, 'ucinewgame\nisready\n', 30_000)) === null) await boot();
      last = null;
      const done = await until(/^bestmove /, `position fen ${fen}\ngo depth ${depth} nodes ${nodes}\n`, watchdogMs(nodes));
      if (done === null) {
        if ((await until(/^bestmove /, 'stop\n', 10_000)) === null) await boot();
        return { cp: null, mate: null, depth: 0, pv: [], timedOut: true };
      }
      if (!last) return { cp: null, mate: null, depth: 0, pv: [], timedOut: false };
      return {
        cp: last.kind === 'cp' ? last.value : null,
        mate: last.kind === 'mate' ? last.value : null,
        depth: last.depth,
        pv: last.pv,
        timedOut: false,
      };
    },
    quit: kill,
  };
}

/** A read as one number for comparisons: centipawns, mates folded to ±100000 (minus distance). */
export function scoreOf(read) {
  if (read.mate !== null && read.mate !== undefined) return read.mate > 0 ? 100_000 - read.mate : -100_000 - read.mate;
  return read.cp;
}
