// Tighten depth-drift on flagged sublines (David 2026-06-18: "never teach a
// losing position"). The bulk extension walked engine-best at depth 14, which
// can drift a sharp line a half-pawn or more over ~12 plies. Re-walk ONLY the
// flagged, NON-beated lines from the deviation with a DEEPER search so the
// terminus reflects true best play. Non-beated = no authored beats reference
// the post-deviation moves, so re-walking can't break any group's narration.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const PATH = ROOT + 'src/data/course-sublines.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const flagged = JSON.parse(readFileSync('/tmp/sweep2.json', 'utf8'));
const beatMax = JSON.parse(readFileSync('/tmp/beatmax.json', 'utf8'));
const SF = '/usr/games/stockfish';
const DEPTH = 22, MOVEMS = 2500, TARGET = 24, HARD = 30, CONCURRENCY = 4;

function makeEngine() {
  const p = spawn(SF);
  let resolver = null, buf = '';
  p.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = line.match(/^bestmove (\S+)/);
      if (m && resolver) { const r = resolver; resolver = null; r(m[1] === '(none)' ? null : m[1]); }
    }
  });
  p.stdin.write('uci\nisready\nucinewgame\n');
  return {
    best(fen) {
      return new Promise((res) => {
        const t = setTimeout(() => { if (resolver) { resolver = null; res(null); } }, MOVEMS + 5000);
        resolver = (v) => { clearTimeout(t); res(v); };
        p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH} movetime ${MOVEMS}\n`);
      });
    },
    quit() { try { p.stdin.write('quit\n'); p.kill(); } catch { /* noop */ } },
  };
}

// Build the job set: flagged worse than -1.2, NON-beated (manual fixes already
// covered the beated severe ones), and resolvable in the data.
const jobs = [];
for (const fl of flagged) {
  const m = /^(.+)::(\d+)::(.+)@(\d+)$/.exec(fl.key);
  if (!m) continue;
  const [, o, v, tr, plyStr] = m; const ply = +plyStr;
  if (beatMax[fl.key] != null) continue; // preserve authored beated lines
  const s = (data[o]?.[v] || []).find((x) => x.triggerMove === tr && x.atPly === ply);
  if (s) jobs.push({ s, ply });
}
console.error(`re-extending ${jobs.length} flagged non-beated lines (deep)`);
let done = 0;
async function worker() {
  const eng = makeEngine();
  while (jobs.length) {
    const { s, ply } = jobs.pop();
    const c = new Chess();
    for (let i = 0; i <= ply; i++) c.move(s.moves[i]); // safe prefix incl deviation
    while (c.history().length < HARD) {
      if (c.history().length >= TARGET && reachesMiddlegame(c.history().join(' ')).pass) break;
      const u = await eng.best(c.fen());
      if (!u) break;
      try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    }
    s.moves = c.history();
    done++;
    if (done % 10 === 0) console.error(`  ${done}`);
  }
  eng.quit();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(PATH, JSON.stringify(data));
console.error(`DONE ${done}`);
