#!/usr/bin/env node
/**
 * build-review-openings.mjs — bake a small, RICH masters-explorer sidecar for
 * the opening positions of the Danya dial-in games, so the post-game review's
 * opening lecture can cite real SCORES ("scores well / most GMs took the pawn
 * and that's a mistake") and MODEL GAMES ("Carlsen–Yangyi") the way Danya does.
 *
 * WHY a sidecar (not the full masters DB): the shipped
 * public/data/openings-masters-db.json is the {positions:{fen:[{san,games}]}}
 * shape with NO result split and NO topGames — and a full rebuild that adds
 * them is a ~10h BFS over 3,641 openings. This script fetches ONLY the opening
 * positions the dial-in games actually reach (~14 plies each), live from the
 * masters explorer (W/D/L + topGames), and writes the RICH shape
 * `{ [posFen]: { totalGames, moves:[{san,games,white,draws,black,rating}],
 * topGames:[...] } }` — which masterPlayLookup.readLocal already understands, so
 * NO reader change is needed. Runtime stays API-free (the data is baked).
 *
 * G3/G0: every number + game is real Lichess masters data, never invented.
 *
 * USAGE: node scripts/danya-corpus/build-review-openings.mjs [maxPlies=16]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const EXPLORER = 'https://chess-academy-pro.vercel.app/api/lichess-explorer?source=masters';
const OUT = 'public/data/danya-review-openings.json';
const GAMES_DIR = 'data/sources/danya-10games';
const MAX_PLIES = Number(process.argv[2] ?? 16);
const THROTTLE_MS = 1100;
const posKey = (fen) => fen.split(/\s+/).slice(0, 4).join(' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPosition(fen) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(`${EXPLORER}&fen=${encodeURIComponent(fen)}`, { headers: { 'User-Agent': 'chess-academy-review-enrich' } });
      if (resp.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!resp.ok) return null;
      return await resp.json();
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

function toRich(payload) {
  const moves = (payload.moves ?? [])
    .map((m) => ({ san: m.san, white: m.white ?? 0, draws: m.draws ?? 0, black: m.black ?? 0 }))
    .map((m) => ({ san: m.san, games: m.white + m.draws + m.black, white: m.white, draws: m.draws, black: m.black }))
    .filter((m) => m.games > 0);
  if (moves.length === 0) return null;
  const totalGames = moves.reduce((s, m) => s + m.games, 0);
  const topGames = (payload.topGames ?? []).slice(0, 4).map((g) => ({
    id: g.id, white: g.white?.name, black: g.black?.name,
    whiteRating: g.white?.rating, blackRating: g.black?.rating,
    year: typeof g.year === 'number' ? g.year : undefined,
    result: g.winner === 'white' ? '1-0' : g.winner === 'black' ? '0-1' : '1/2-1/2',
  }));
  return { totalGames, moves, topGames: topGames.length ? topGames : undefined };
}

function openingFensFromPgn(pgn) {
  const c = new Chess();
  c.loadPgn(pgn);
  const hist = c.history();
  const replay = new Chess();
  const fens = [replay.fen()];
  for (const san of hist.slice(0, MAX_PLIES)) { replay.move(san); fens.push(replay.fen()); }
  return fens;
}

async function main() {
  // Start from any existing sidecar so re-runs MERGE (add new games without
  // re-fetching everything).
  let out = {};
  try { out = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* fresh */ }

  // Seed from each game's opening line, then BFS a few plies so the UNTAKEN
  // ALTERNATIVES (the C8 "what was left out" a6/e6 lines the coach marches out)
  // have real continuations offline too — not just the moves the game played.
  const pgns = readdirSync(GAMES_DIR).filter((f) => f.endsWith('.pgn'));
  const BFS_DEPTH = Number(process.argv[3] ?? 2);
  const TOP_N = Number(process.argv[4] ?? 2); // expand the top-N moves per node
  const seed = new Set();
  for (const f of pgns) {
    for (const fen of openingFensFromPgn(readFileSync(`${GAMES_DIR}/${f}`, 'utf8'))) seed.add(posKey(fen));
  }
  console.log(`[enrich] ${pgns.length} games → ${seed.size} seed positions; BFS depth ${BFS_DEPTH}, top-${TOP_N}`);

  const visited = new Set();
  const queue = [...seed].map((k) => [k, BFS_DEPTH]);
  let fetched = 0, kept = 0, skipped = 0;
  while (queue.length > 0) {
    const [key, depth] = queue.shift();
    if (visited.has(key)) continue;
    visited.add(key);
    if (out[key]) { skipped++; }
    else {
      const payload = await fetchPosition(`${key} 0 1`);
      fetched++;
      const rich = payload ? toRich(payload) : null;
      if (rich) { out[key] = rich; kept++; }
      if (fetched % 15 === 0) {
        console.log(`  …${fetched} fetched, ${kept} kept, queue ${queue.length}`);
        writeFileSync(OUT, JSON.stringify(out)); // incremental save — survive a timeout
      }
      await sleep(THROTTLE_MS);
    }
    // Expand children (top-N moves) while depth remains.
    if (depth > 0 && out[key]) {
      let board;
      try { board = new Chess(`${key} 0 1`); } catch { continue; }
      for (const m of out[key].moves.slice(0, TOP_N)) {
        try { const c = new Chess(board.fen()); if (!c.move(m.san)) continue; const ck = posKey(c.fen()); if (!visited.has(ck)) queue.push([ck, depth - 1]); } catch { /* skip */ }
      }
    }
  }

  writeFileSync(OUT, JSON.stringify(out));
  const sizeKB = (Buffer.byteLength(JSON.stringify(out)) / 1024).toFixed(0);
  console.log(`[enrich] wrote ${OUT} — ${Object.keys(out).length} positions, ${sizeKB}KB (fetched ${fetched}, kept ${kept}, skipped ${skipped})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
