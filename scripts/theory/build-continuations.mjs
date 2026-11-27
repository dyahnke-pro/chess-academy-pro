#!/usr/bin/env node
// MASTERS' CONTINUATIONS (theory, David 2026-11-25): where the opening book
// (`openings-masters-db.json`) ends, recent master games go on. Reads The Week
// in Chess game files (TWIC), keeps games where BOTH players are rated >= MIN_ELO,
// walks each game's first MAX_PLY plies and counts the move played at every
// position the book does NOT hold. Writes public/data/masters-continuations.json
// ({ positions: { "<4-field fen>": [{ san, games, white, draws, black }] } }),
// read by src/services/mastersContinuation.ts. G3: every move is one a rated
// master played in a real game, replayed by chess.js; nothing is invented.
//
// Usage: node scripts/theory/build-continuations.mjs [firstIssue lastIssue]
//        (default 1500..1650; a missing issue is skipped)
import { Chess } from 'chess.js';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const FIRST = Number(process.argv[2] ?? 1500);
const LAST = Number(process.argv[3] ?? 1650);
const MIN_ELO = 2500;
const MAX_PLY = 30;
const MIN_GAMES = 6;
const MIN_MOVE_GAMES = 2;
const CACHE = process.env.TWIC_CACHE ?? '/tmp/twic';
mkdirSync(CACHE, { recursive: true });

const bookKeys = new Set(Object.keys(JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')).positions));
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');

function fetchIssue(n) {
  const file = `${CACHE}/twic${n}.pgn`;
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const zip = `${CACHE}/twic${n}g.zip`;
  try {
    execFileSync('curl', ['-sSL', '-m', '60', '-f', '-o', zip, `https://theweekinchess.com/zips/twic${n}g.zip`], { stdio: 'ignore' });
    const pgn = execFileSync('unzip', ['-p', zip], { maxBuffer: 256 * 1024 * 1024 }).toString('latin1');
    writeFileSync(file, pgn);
    return pgn;
  } catch { return null; }
}

/** The movetext's SAN tokens: comments, variations, NAGs, numbers, result dropped. */
function sansOf(text) {
  const t = text.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ').replace(/\([^()]*\)/g, ' ').replace(/\$\d+/g, ' ');
  return t.split(/\s+/).map((s) => s.replace(/^\d+\.(\.\.)?/, '')).filter((s) => s && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(s));
}

const tally = new Map(); // key -> Map(san -> {games,white,draws,black})
let games = 0, kept = 0, bad = 0;
for (let n = FIRST; n <= LAST; n++) {
  const pgn = fetchIssue(n);
  if (!pgn) { console.error(`issue ${n}: not available`); continue; }
  for (const block of pgn.split(/\n\n(?=\[Event )/)) {
    games += 1;
    const head = Object.fromEntries([...block.matchAll(/\[(\w+) "([^"]*)"\]/g)].map((m) => [m[1], m[2]]));
    const w = Number(head.WhiteElo), b = Number(head.BlackElo);
    if (!(w >= MIN_ELO && b >= MIN_ELO) || !/^(1-0|0-1|1\/2-1\/2)$/.test(head.Result ?? '')) continue;
    const text = block.replace(/^(\[.*\]\s*\n)+/m, '');
    const sans = sansOf(text).slice(0, MAX_PLY);
    const c = new Chess();
    kept += 1;
    for (const san of sans) {
      const k = key(c.fen());
      let m;
      try { m = c.move(san); } catch { bad += 1; break; }
      if (!m) { bad += 1; break; }
      if (bookKeys.has(k)) continue;
      const row = tally.get(k) ?? new Map();
      const e = row.get(m.san) ?? { games: 0, white: 0, draws: 0, black: 0 };
      e.games += 1;
      if (head.Result === '1-0') e.white += 1; else if (head.Result === '0-1') e.black += 1; else e.draws += 1;
      row.set(m.san, e); tally.set(k, row);
    }
  }
  console.error(`issue ${n}: ${kept} master games so far, ${tally.size} positions`);
}

const positions = {};
let moves = 0;
for (const [k, row] of tally) {
  const list = [...row].map(([san, e]) => ({ san, ...e })).filter((e) => e.games >= MIN_MOVE_GAMES).sort((a, b) => b.games - a.games);
  if (list.reduce((s, e) => s + e.games, 0) < MIN_GAMES) continue;
  positions[k] = list; moves += list.length;
}
const out = { meta: { source: 'TWIC', issues: [FIRST, LAST], minElo: MIN_ELO, maxPly: MAX_PLY, gamesRead: games, masterGames: kept, unreadable: bad, positions: Object.keys(positions).length, moves }, positions };
writeFileSync('public/data/masters-continuations.json', JSON.stringify(out));
console.error(JSON.stringify(out.meta));
