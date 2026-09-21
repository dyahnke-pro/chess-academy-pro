#!/usr/bin/env node
/**
 * build-wo4-corpus — THE PRODUCER THE WO-4 MEASUREMENT NEVER HAD.
 *
 * `fundamentalsPipeline.realGame.test.ts` gates its measurement half on
 * `describe.skipIf(!existsSync('data/sources/wo4-corpus/annotated-d12.json'))`.
 * That file is gitignored research data, it is on no machine here, and until
 * today **NOTHING IN THE REPO PRODUCED IT** — `grep -r wo4-corpus` found the
 * test and nothing else. So the WO-4 numbers (the `learned` gate, the
 * attribution gap) rested on a corpus nobody could rebuild: never
 * re-measurable, never auditable, and the run reported `3 passed | 1 skipped`,
 * which reads as green at a glance.
 *
 * An instrument that reports nothing is indistinguishable from one that found
 * nothing. This makes the corpus REPRODUCIBLE, which is the whole point.
 *
 * ── WHY THESE SOURCES ───────────────────────────────────────────────────────
 * GAMES: chess.com's public API. Lichess's game-export endpoint 404s through
 * this environment's proxy (the `/api/user` endpoint works, so it is the export
 * route specifically) — measured, not assumed. chess.com's
 * `/pub/country/{iso}/players` returns thousands of ordinary club players, which
 * is exactly the population WO-4 wants: AMATEUR games are the ones full of the
 * real slips the attributor has to name. Master games have too few.
 *
 * ENGINE: the app's OWN npm Stockfish 18 WASM build, driven over UCI through
 * `node_modules/stockfish/scripts/cli.js`. No native binary exists in this
 * container (CLAUDE.md's `/usr/games/stockfish` note is stale here — verified),
 * and using the app's engine is better anyway: the replay worker in the test
 * hands these numbers to the REAL sweep, so they must come from the same engine
 * the real sweep would have used.
 *
 * ── DETERMINISM ─────────────────────────────────────────────────────────────
 * Selection is SORTED and seeded, never "whatever the API returned first", so
 * two runs pick the same 47 games. A corpus that drifts between runs cannot
 * settle an argument about whether a threshold moved.
 *
 * ── TWO PHASES, because the expensive one must be resumable ─────────────────
 *   --fetch     pull + filter candidate games        (minutes, network)
 *   --annotate  engine-annotate at d12 and d18       (hours, CPU)
 * Fetch writes `games.json`; annotate reads it and writes `annotated-d{12,18}.json`
 * incrementally, so a killed run resumes instead of starting over.
 *
 * Usage:
 *   node scripts/build-wo4-corpus.mjs --fetch
 *   node scripts/build-wo4-corpus.mjs --annotate [--depth 12] [--limit 47]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const OUT_DIR = 'data/sources/wo4-corpus';
const GAMES = `${OUT_DIR}/games.json`;
const TARGET_GAMES = 47;

// An ordinary club player, both sides, so the game is a real contest rather
// than a demolition. These bounds decide what "amateur" means here; they are
// stated rather than tuned, and the corpus header records them.
const ELO_MIN = 800;
const ELO_MAX = 1800;
const MIN_PLIES = 30;
const MAX_PLIES = 160;
const COUNTRY = 'IS'; // small federation ⇒ a short, stable player list
/** 🚨 SPREAD THE CORPUS ACROSS PLAYERS. The first run took every qualifying
 *  game from each archive before moving on and produced 47 games in which ONE
 *  player appeared 40+ times. WO-4 measures an attribution gap over a
 *  POPULATION of amateur slips; a corpus that is really one person's month
 *  measures that person's habits and would move whenever they changed. */
const MAX_GAMES_PER_PLAYER = 3;

const UA = { 'User-Agent': 'chess-academy-pro WO-4 research (contact: dyahnke@gmail.com)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.status === 404) return null;
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await sleep(1000 * (i + 1));
  }
  return null;
}

/** SAN move list from a chess.com PGN, or null if it will not replay. */
function sansOf(pgn) {
  const body = pgn.replace(/\[[^\]]*\]\s*/g, '').replace(/\{[^}]*\}/g, '').replace(/\d+\.(\.\.)?/g, '');
  const c = new Chess();
  const out = [];
  for (const tok of body.split(/\s+/)) {
    if (!tok || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok)) continue;
    try { const m = c.move(tok); if (!m) return null; out.push(m.san); } catch { return null; }
  }
  return out.length ? out : null;
}

async function fetchPhase() {
  mkdirSync(OUT_DIR, { recursive: true });
  const list = await getJson(`https://api.chess.com/pub/country/${COUNTRY}/players`);
  if (!list?.players?.length) throw new Error('could not list players — chess.com unreachable?');
  // DETERMINISTIC: sort, then walk in order. Never "first N the API returned".
  const players = [...list.players].sort();
  console.log(`[fetch] ${players.length} players in /${COUNTRY}/, walking in sorted order`);

  const picked = [];
  const seen = new Set();
  for (const user of players) {
    if (picked.length >= TARGET_GAMES) break;
    const archives = await getJson(`https://api.chess.com/pub/player/${user}/games/archives`);
    if (!archives?.archives?.length) { await sleep(150); continue; }
    // Newest-but-one month: complete, and recent enough to be current play.
    const month = archives.archives[archives.archives.length - 1];
    const bundle = await getJson(month);
    await sleep(250);
    if (!bundle?.games?.length) continue;

    let fromThisPlayer = 0;
    for (const g of [...bundle.games].sort((a, b) => String(a.url).localeCompare(String(b.url)))) {
      if (picked.length >= TARGET_GAMES) break;
      if (fromThisPlayer >= MAX_GAMES_PER_PLAYER) break;
      if (g.rules !== 'chess' || !g.rated) continue;
      if (!['blitz', 'rapid'].includes(g.time_class)) continue;
      const we = g.white?.rating ?? 0, be = g.black?.rating ?? 0;
      if (we < ELO_MIN || we > ELO_MAX || be < ELO_MIN || be > ELO_MAX) continue;
      const sans = g.pgn ? sansOf(g.pgn) : null;
      if (!sans || sans.length < MIN_PLIES || sans.length > MAX_PLIES) continue;
      const id = String(g.url).split('/').pop();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      fromThisPlayer += 1;
      const winner = g.white.result === 'win' ? 'white' : g.black.result === 'win' ? 'black' : null;
      picked.push({
        id, moves: sans.join(' '),
        white: g.white.username, black: g.black.username,
        whiteElo: we, blackElo: be, winner,
        // The STUDENT is the side whose slips we are measuring. Take the lower
        // -rated player: more real errors, which is the population WO-4 is about.
        us: we <= be ? g.white.username : g.black.username,
      });
      console.log(`[fetch] ${picked.length}/${TARGET_GAMES} ${id} ${g.white.username}(${we}) v ${g.black.username}(${be}) ${sans.length}p`);
    }
  }
  writeFileSync(GAMES, JSON.stringify(picked, null, 1));
  console.log(`[fetch] wrote ${picked.length} games → ${GAMES}`);
}

// ── the engine ──────────────────────────────────────────────────────────────

function startEngine() {
  const proc = spawn('node', ['node_modules/stockfish/scripts/cli.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = '';
  const waiters = [];
  // 🚨 A SEPARATE, PERSISTENT TAP — NOT A WAITER THAT NEVER RESOLVES.
  // The first cut collected `info ... score` lines by registering a waiter
  // whose predicate always returned false. `until` only removes a waiter when
  // its predicate is TRUE, so one leaked per position: 3,760 positions later
  // every output line is tested against 3,760 dead predicates. It would not
  // have failed, it would have quietly got slower and slower — which on an
  // hours-long job reads exactly like "Stockfish is slow".
  let tap = null;
  proc.stdout.on('data', (d) => {
    buf += d.toString();
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (tap) tap(line);
      for (const w of [...waiters]) if (w.test(line)) { waiters.splice(waiters.indexOf(w), 1); w.done(line); }
    }
  });
  const send = (s) => proc.stdin.write(`${s}\n`);
  const until = (test) => new Promise((done) => waiters.push({ test, done }));
  return { send, until, setTap: (fn) => { tap = fn; }, kill: () => proc.kill() };
}

/**
 * One reading of one position. Returns White-POV cp (the unit every downstream
 * threshold in the app is calibrated for) plus the best move in UCI.
 *
 * MATE is encoded ±(100000 − n), which is what the test's `normEval` expects.
 */
async function read(engine, fen, depth) {
  let lastScore = null, lastMate = null;
  const blackToMove = fen.split(' ')[1] === 'b';
  engine.setTap((l) => {
    const m = /score (cp|mate) (-?\d+)/.exec(l);
    if (!m) return;
    if (m[1] === 'cp') { lastScore = Number(m[2]); lastMate = null; } else { lastMate = Number(m[2]); lastScore = null; }
  });
  engine.send(`position fen ${fen}`);
  const done = engine.until((l) => l.startsWith('bestmove'));
  engine.send(`go depth ${depth}`);
  const line = await done;
  engine.setTap(null);
  const best = line.split(/\s+/)[1] ?? null;
  let evalMover = lastMate !== null ? (lastMate > 0 ? 100000 - Math.abs(lastMate) : -(100000 - Math.abs(lastMate))) : lastScore;
  if (evalMover === null) return { best: best === '(none)' ? null : best, evalWhite: null };
  return { best: best === '(none)' ? null : best, evalWhite: blackToMove ? -evalMover : evalMover };
}

async function annotatePhase(depth, limit) {
  if (!existsSync(GAMES)) throw new Error(`${GAMES} missing — run --fetch first`);
  const games = JSON.parse(readFileSync(GAMES, 'utf8')).slice(0, limit);
  const outPath = `${OUT_DIR}/annotated-d${depth}.json`;
  const done = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : [];
  const haveIds = new Set(done.map((g) => g.id));
  const engine = startEngine();
  engine.send('uci');
  await engine.until((l) => l.startsWith('uciok'));
  engine.send('isready');
  await engine.until((l) => l === 'readyok' || l.startsWith('readyok'));
  console.log(`[d${depth}] engine up; ${done.length}/${games.length} already annotated`);

  const t0 = Date.now();
  for (const g of games) {
    if (haveIds.has(g.id)) continue;
    const c = new Chess();
    const sans = g.moves.split(' ');
    const plies = [];
    for (const san of sans) {
      const fenBefore = c.fen();
      const r = await read(engine, fenBefore, depth);
      c.move(san);
      plies.push({ fenBefore, bestMove: r.best, bestMoveEval: r.evalWhite, evaluation: null });
    }
    // The FINAL position's eval — `readsByFen` reads it off the last ply.
    const finalRead = await read(engine, c.fen(), depth);
    if (plies.length) plies[plies.length - 1].evaluation = finalRead.evalWhite;
    done.push({ ...g, depth, plies });
    writeFileSync(outPath, JSON.stringify(done, null, 1));   // resumable
    const mins = ((Date.now() - t0) / 60000).toFixed(1);
    console.log(`[d${depth}] ${done.length}/${games.length} ${g.id} (${plies.length} plies, ${mins}m elapsed)`);
  }
  engine.kill();
  console.log(`[d${depth}] wrote ${done.length} games → ${outPath}`);
}

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : dflt;
};

if (process.argv.includes('--fetch')) await fetchPhase();
else if (process.argv.includes('--annotate')) await annotatePhase(arg('--depth', 12), arg('--limit', TARGET_GAMES));
else console.log('usage: --fetch | --annotate [--depth 12] [--limit 47]');
