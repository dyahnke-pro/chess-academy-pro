// A STUDENT WHO PLAYS SOUNDLY (A-plan P0, 2026-10-16). The deterministic
// student blunders often, so a Learn game becomes a run of "Watch out" lines
// and the plan, prevention and choice teaching never gets a fair test. This
// one is Stockfish at a reduced skill level, run in node from the package the
// app already ships — no binary in the container is needed.
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

let proc = null;
let buf = '';
const waiters = [];

function ensure(skill) {
  if (proc) return;
  proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      for (const w of [...waiters]) if (w.test(line)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(line); }
    }
  });
  proc.stdin.write(`uci\nsetoption name Skill Level value ${skill}\nisready\n`);
}

function waitFor(re, ms) {
  return new Promise((resolve) => {
    const w = { test: (l) => re.test(l), resolve };
    waiters.push(w);
    setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) { waiters.splice(k, 1); resolve(null); } }, ms);
  });
}

/** The engine's move for the side to move at `fen`, as { from, to, san }, or
 *  null when the engine does not answer. Skill 8 ≈ a sound club player. */
export async function engineStudentMove(fen, { skill = 8, movetimeMs = 300 } = {}) {
  ensure(skill);
  proc.stdin.write(`position fen ${fen}\ngo movetime ${movetimeMs}\n`);
  const line = await waitFor(/^bestmove /, movetimeMs + 15_000);
  const uci = line?.split(/\s+/)[1];
  if (!uci || uci === '(none)') return null;
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return m ? { from: m.from, to: m.to, san: m.san } : null;
  } catch { return null; }
}

export function stopEngineStudent() { try { proc?.stdin.write('quit\n'); proc?.kill(); } catch { /* gone */ } proc = null; }
