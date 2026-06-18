// Extend each course subline PAST the opponent's deviation into a GROUNDED
// middlegame (David 2026-06-18): masters explorer most-played → Stockfish
// best-move where masters runs out (G3-sanctioned engine, never invented) →
// stop. Pre-existing pawn-shuffle FILLER is stripped; real-theory lines and
// already-deep flagships are PRESERVED. Keys stay stable (triggerMove/atPly
// fixed; only `moves` past the deviation changes). Parallel + checkpointed.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname + '/';
const PATH = ROOT + 'src/data/course-sublines.json';
const data = JSON.parse(readFileSync(PATH, 'utf8'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer?source=masters&play=';
const SF = '/usr/games/stockfish', SF_MS = 600;
const MIN_GAMES = 8, MIN_EXTRA = 6, MAX_EXTRA = 14, ENGINE_CAP = 4, CONCURRENCY = 10;

const MEMBER_MIN = 3; // a move played in >= this many master games counts as real theory
const mCache = new Map(), eCache = new Map();
// Returns the full move list [{san, games}] at a position (cached).
function mastersList(uciCsv) {
  if (mCache.has(uciCsv)) return mCache.get(uciCsv);
  const pr = (async () => {
    for (let a = 0; a < 3; a++) {
      try {
        const j = await (await fetch(PROXY + uciCsv)).json();
        if (j && Array.isArray(j.moves)) return j.moves.map((m) => ({ san: m.san, games: (m.white || 0) + (m.draws || 0) + (m.black || 0) }));
      } catch { await new Promise((r) => setTimeout(r, 300)); }
    }
    return [];
  })();
  mCache.set(uciCsv, pr); return pr;
}
// Most-played reply (for BUILDING the continuation) — needs real frequency.
async function mastersTop(uciCsv) { const l = await mastersList(uciCsv); return l.length && l[0].games >= MIN_GAMES ? l[0].san : null; }
// Is this exact move real theory here (for FILLER detection) — membership, rank-independent.
async function mastersHas(uciCsv, san) { const l = await mastersList(uciCsv); return l.some((m) => m.san === san && m.games >= MEMBER_MIN); }
function engine(fen) {
  if (eCache.has(fen)) return eCache.get(fen);
  const pr = new Promise((res) => {
    const p = spawn(SF); let best = null, buf = '';
    p.stdout.on('data', (d) => { buf += d; for (const l of buf.split('\n')) { const b = l.match(/^bestmove (\S+)/); if (b) { best = b[1] === '(none)' ? null : b[1]; p.kill(); } } });
    p.on('close', () => res(best)); p.on('error', () => res(null));
    p.stdin.write(`uci\nisready\nucinewgame\nposition fen ${fen}\ngo movetime ${SF_MS}\n`);
    setTimeout(() => { try { p.kill(); } catch { /* noop */ } }, SF_MS + 3000);
  });
  eCache.set(fen, pr); return pr;
}
const uciList = (moves) => { const c = new Chess(); return moves.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion || ''); }); };

async function process1(s) {
  const c = new Chess(); for (let i = 0; i <= s.atPly; i++) c.move(s.moves[i]);
  let uci = uciList(s.moves.slice(0, s.atPly + 1)), realLen = s.atPly + 1;
  for (let i = s.atPly + 1; i < s.moves.length; i++) {
    if (!(await mastersHas(uci.join(','), s.moves[i]))) break;   // first non-theory move = filler starts
    const mv = c.move(s.moves[i]); uci.push(mv.from + mv.to + (mv.promotion || '')); realLen++;
  }
  const realMoves = s.moves.slice(0, realLen);
  if (realLen - 1 - s.atPly >= MIN_EXTRA && reachesMiddlegame(realMoves.join(' '))) {
    if (realLen !== s.moves.length) s.moves = realMoves;  // strip trailing filler, keep deep real theory
    return;
  }
  let added = realLen - 1 - s.atPly, eng = 0;
  while (added < MAX_EXTRA) {
    let san = await mastersTop(uci.join(','));
    if (!san) { if (eng >= ENGINE_CAP) break; const u = await engine(c.fen()); if (!u) break; const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); san = mv.san; eng++; }
    else c.move(san);
    uci = uciList(c.history()); added++;
    if (added >= MIN_EXTRA && reachesMiddlegame(c.history().join(' '))) break;
  }
  if (c.history().join(' ') !== s.moves.join(' ')) s.moves = c.history();
}

// NEVER touch a subline that already has authored beats — its moves are locked
// to those beats (A/C/B flagships). Extend only the still-intro-only lines.
let beated = new Set();
try { beated = new Set(JSON.parse(readFileSync('/tmp/beatkeys.json', 'utf8'))); } catch { /* none */ }
const jobs = [];
let lockedSkipped = 0;
for (const o of Object.keys(data)) {
  if (only && !only.has(o)) continue;
  for (const v of Object.keys(data[o])) for (const s of data[o][v]) {
    if (beated.has(`${o}::${v}::${s.triggerMove}@${s.atPly}`)) { lockedSkipped++; continue; }
    jobs.push(s);
  }
}
console.error(`locked (authored beats, preserved): ${lockedSkipped}`);
const total = jobs.length; let done = 0, lastCk = Date.now();
async function worker() {
  while (jobs.length) {
    const s = jobs.pop();
    try { await process1(s); } catch { /* leave subline as-is on error */ }
    done++;
    if (done % 100 === 0) console.error(`  ${done}/${total}`);
    if (Date.now() - lastCk > 30000) { lastCk = Date.now(); writeFileSync(PATH, JSON.stringify(data)); }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
writeFileSync(PATH, JSON.stringify(data));
console.error(`DONE ${done}/${total}`);
