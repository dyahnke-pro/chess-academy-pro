// Extend each course subline PAST the opponent's deviation into a GROUNDED
// middlegame (David 2026-06-18). ENGINE-PRIMARY: "use stockfish more than the
// DB" — the DB's most-played walked the student into popular blunders (…d5
// −2.5); Stockfish best-move is sound by construction and drives the line ALL
// THE WAY to a real middlegame (move ~12-14) so the narration can teach plans.
// Keys stay stable (triggerMove/atPly fixed; only `moves` past the deviation
// changes). Beated lines keep every authored move (we only APPEND). Parallel,
// persistent-engine pool (no per-ply spawn), checkpointed.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const PATH = ROOT + 'src/data/course-sublines.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;

const SF = '/usr/games/stockfish';
const DEPTH = 14;            // sound on quiet positions, ~80-200ms each
const MAX_EXTRA = 26;        // hard cap on plies appended past the safe prefix
const TARGET_PLIES = 24;     // drive to ~move 12 before we even check middlegame
const HARD_PLIES = 30;       // absolute ceiling (move 15)
const CONCURRENCY = 4;       // 4 cores

// ── persistent engine pool ────────────────────────────────────────────────
// One long-lived Stockfish per worker: pay the uci handshake ONCE, then feed
// positions. A shared fen→bestmove cache dedups identical positions across
// the whole run (every deviation's first engine reply is shared by all lines
// under it).
const eCache = new Map();
function makeEngine() {
  const p = spawn(SF);
  let resolver = null, buf = '';
  p.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i); buf = buf.slice(i + 1);
      const m = line.match(/^bestmove (\S+)/);
      if (m && resolver) { const r = resolver; resolver = null; r(m[1] === '(none)' ? null : m[1]); }
    }
  });
  p.on('error', () => { if (resolver) { const r = resolver; resolver = null; r(null); } });
  p.stdin.write('uci\nisready\nucinewgame\n');
  return {
    raw(fen) {
      return new Promise((res) => {
        const t = setTimeout(() => { if (resolver) { resolver = null; res(null); } }, 6000);
        resolver = (v) => { clearTimeout(t); res(v); };
        p.stdin.write(`position fen ${fen}\ngo depth ${DEPTH}\n`);
      });
    },
    quit() { try { p.stdin.write('quit\n'); p.kill(); } catch { /* noop */ } },
  };
}
function best(eng, fen) {
  if (eCache.has(fen)) return eCache.get(fen);
  const pr = eng.raw(fen);
  eCache.set(fen, pr);
  return pr;
}

// ── per-subline walk ──────────────────────────────────────────────────────
async function process1(eng, s, maxBeat) {
  // beated lines: preserve the WHOLE existing line (moves+beats+prose intact),
  // only APPEND past its end. non-beated: re-walk from the deviation.
  const keepTo = (maxBeat != null) ? s.moves.length - 1 : s.atPly;
  const c = new Chess();
  for (let i = 0; i <= keepTo; i++) c.move(s.moves[i]);
  let added = keepTo - s.atPly;
  while (added < MAX_EXTRA) {
    const len = c.history().length;
    if (len >= HARD_PLIES) break;
    if (len >= TARGET_PLIES && reachesMiddlegame(c.history().join(' ')).pass) break;
    const u = await best(eng, c.fen());
    if (!u) break;
    try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
    added++;
  }
  if (c.history().join(' ') !== s.moves.join(' ')) s.moves = c.history();
}

// ── job collection ────────────────────────────────────────────────────────
// Lock ONLY lines already at a real middlegame (>= TARGET_PLIES and passing
// the predicate); extend everything else, including short beat-authored lines
// (we append past the deviation so their beats stay valid).
const beatMax = (() => { try { return JSON.parse(readFileSync('/tmp/beatmax.json', 'utf8')); } catch { return {}; } })();
const jobs = [];
let locked = 0;
for (const o of Object.keys(data)) {
  if (only && !only.has(o)) continue;
  for (const v of Object.keys(data[o])) for (const s of data[o][v]) {
    if (s.moves.length >= TARGET_PLIES && reachesMiddlegame(s.moves.join(' ')).pass) { locked++; continue; }
    const key = `${o}::${v}::${s.triggerMove}@${s.atPly}`;
    jobs.push({ s, maxBeat: beatMax[key] });
  }
}
console.error(`locked (already middlegame): ${locked}; to extend: ${jobs.length}`);
const total = jobs.length; let done = 0, lastCk = Date.now();
async function worker() {
  const eng = makeEngine();
  while (jobs.length) {
    const { s, maxBeat } = jobs.pop();
    try { await process1(eng, s, maxBeat); } catch { /* leave subline as-is on error */ }
    done++;
    if (done % 100 === 0) console.error(`  ${done}/${total}  (cache ${eCache.size})`);
    if (Date.now() - lastCk > 30000) { lastCk = Date.now(); writeFileSync(PATH, JSON.stringify(data)); }
  }
  eng.quit();
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(PATH, JSON.stringify(data));
console.error(`DONE ${done}/${total}`);
