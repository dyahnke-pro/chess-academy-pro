#!/usr/bin/env node
/**
 * Fetches master games per opening from the Lichess Explorer masters
 * database. For each of the 28 openings missing model games:
 *
 *   1. Use the canonical opening PGN to derive the position
 *   2. Hit explorer.lichess.ovh/masters?play=<UCI>&topGames=N
 *      to get top master games at that position
 *   3. For each top game, fetch the full PGN from lichess.org/game/export
 *   4. Save raw + parsed game data to docs/audit-runs/master-games-<iso>/
 *
 * Run on David's laptop — sandbox blocks explorer.lichess.ovh.
 *   node scripts/fetch-master-games.mjs
 *
 * Output JSON per opening: { openingId, games: [{ id, white, black,
 *   year, result, pgn, opening }, ...] }
 *
 * After running:
 *   git add docs/audit-runs/master-games-* && git commit && git push
 *
 * Then in sandbox:
 *   node scripts/merge-master-games.mjs <output-dir>
 *
 * Lichess explorer + game-export are CC0. No attribution required
 * for storing or republishing.
 */

import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `docs/audit-runs/master-games-${stamp}`;
mkdirSync(OUT_DIR, { recursive: true });

const GAMES_PER_OPENING = 3;
const REQUEST_DELAY_MS = 1500;

// The 28 openings missing model games, with the depth (in plies) to
// walk before requesting top games. Deeper = more specific position
// = fewer but more topical games. 8-12 plies is the sweet spot.
const OPENINGS = [
  { id: 'italian-game', pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d4 exd4', depth: 10 },
  { id: 'vienna-game', pgn: 'e4 e5 Nc3 Nf6 Bc4 Bc5 d3 d6', depth: 8 },
  { id: 'kings-gambit', pgn: 'e4 e5 f4 exf4 Nf3 d5', depth: 6 },
  { id: 'four-knights-game', pgn: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4', depth: 8 },
  { id: 'sicilian-najdorf', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', depth: 10 },
  { id: 'sicilian-dragon', pgn: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', depth: 10 },
  { id: 'sicilian-sveshnikov', pgn: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5', depth: 10 },
  { id: 'french-defence', pgn: 'e4 e6 d4 d5 Nc3 Nf6', depth: 6 },
  { id: 'caro-kann', pgn: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', depth: 8 },
  { id: 'scandinavian-defence', pgn: 'e4 d5 exd5 Qxd5 Nc3 Qa5', depth: 6 },
  { id: 'petrov-defence', pgn: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4', depth: 8 },
  { id: 'queens-gambit', pgn: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', depth: 8 },
  { id: 'london-system', pgn: 'd4 Nf6 Nf3 g6 Bf4 Bg7', depth: 6 },
  { id: 'trompowsky-attack', pgn: 'd4 Nf6 Bg5', depth: 3 },
  { id: 'qgd', pgn: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 Nbd7', depth: 12 },
  { id: 'qga', pgn: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6', depth: 8 },
  { id: 'semi-slav', pgn: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6', depth: 8 },
  { id: 'kings-indian-defence', pgn: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6', depth: 8 },
  { id: 'benoni-defence', pgn: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6', depth: 10 },
  { id: 'benko-gambit', pgn: 'd4 Nf6 c4 c5 d5 b5', depth: 6 },
  { id: 'queens-indian', pgn: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7', depth: 8 },
  { id: 'budapest-gambit', pgn: 'd4 Nf6 c4 e5 dxe5 Ng4', depth: 6 },
  { id: 'old-indian-defence', pgn: 'd4 Nf6 c4 d6 Nc3 e5', depth: 6 },
  { id: 'english-opening', pgn: 'c4 e5 Nc3 Nf6', depth: 4 },
  { id: 'reti-opening', pgn: 'Nf3 d5 c4', depth: 3 },
  { id: 'birds-opening', pgn: 'f4 d5 Nf3 Nf6', depth: 4 },
  { id: 'two-knights-defence', pgn: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5', depth: 7 },
  { id: 'evans-gambit', pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4', depth: 7 },
];

// Convert SAN PGN to UCI move sequence (Lichess explorer expects UCI).
function pgnToUci(pgn, depth) {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean).slice(0, depth);
  const c = new Chess();
  const uci = [];
  for (const tok of tokens) {
    const move = c.move(tok.replace(/[+#!?]+$/, ''));
    if (!move) throw new Error(`illegal SAN: ${tok}`);
    uci.push(move.from + move.to + (move.promotion ?? ''));
  }
  return uci.join(',');
}

const TOKEN = process.env.LICHESS_TOKEN;
if (!TOKEN) {
  console.error('LICHESS_TOKEN env var required.');
  console.error('Create one at https://lichess.org/account/oauth/token/create (no scopes needed)');
  console.error('Then run: export LICHESS_TOKEN=lip_... && node scripts/fetch-master-games.mjs');
  process.exit(1);
}

function authHeaders(extra = {}) {
  return {
    authorization: `Bearer ${TOKEN}`,
    'user-agent': 'chess-academy-pro/1.0 (master-game-fetcher)',
    ...extra,
  };
}

async function fetchMastersTopGames(uci, n) {
  const url = `https://explorer.lichess.ovh/masters?play=${uci}&topGames=${n}&moves=0`;
  const r = await fetch(url, { headers: authHeaders({ accept: 'application/json' }) });
  if (!r.ok) throw new Error(`explorer HTTP ${r.status}`);
  const data = await r.json();
  return data.topGames ?? [];
}

async function fetchGamePgn(gameId) {
  const url = `https://lichess.org/game/export/${gameId}?moves=true&clocks=false&evals=false&opening=true`;
  const r = await fetch(url, { headers: authHeaders({ accept: 'application/x-chess-pgn' }) });
  if (!r.ok) throw new Error(`game export HTTP ${r.status}`);
  return await r.text();
}

async function processOpening(opening) {
  console.log(`\n[${opening.id}]`);
  let uci;
  try {
    uci = pgnToUci(opening.pgn, opening.depth);
  } catch (e) {
    console.log(`  PGN error: ${e.message}`);
    return { ...opening, status: 'pgn-error', error: e.message };
  }
  console.log(`  position: ${opening.depth} plies, UCI: ${uci}`);

  let topGames;
  try {
    topGames = await fetchMastersTopGames(uci, GAMES_PER_OPENING);
  } catch (e) {
    console.log(`  explorer error: ${e.message}`);
    return { ...opening, status: 'explorer-error', error: e.message };
  }
  console.log(`  topGames: ${topGames.length}`);

  await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));

  const games = [];
  for (const game of topGames) {
    try {
      const pgn = await fetchGamePgn(game.id);
      games.push({
        id: game.id,
        white: game.white?.name ?? 'Unknown',
        whiteRating: game.white?.rating ?? null,
        black: game.black?.name ?? 'Unknown',
        blackRating: game.black?.rating ?? null,
        winner: game.winner ?? null,
        year: game.year ?? null,
        month: game.month ?? null,
        url: `https://lichess.org/${game.id}`,
        pgn,
      });
      console.log(`    fetched ${game.id} (${game.white?.name} - ${game.black?.name}, ${game.year})`);
    } catch (e) {
      console.log(`    skip ${game.id}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  const out = {
    openingId: opening.id,
    fromPgn: opening.pgn.split(/\s+/).slice(0, opening.depth).join(' '),
    depth: opening.depth,
    games,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(`${OUT_DIR}/${opening.id}.json`, JSON.stringify(out, null, 2));
  return { ...opening, status: 'fetched', gameCount: games.length };
}

async function main() {
  console.log(`Fetching master games for ${OPENINGS.length} openings → ${OUT_DIR}/`);
  console.log(`Per opening: top ${GAMES_PER_OPENING} games at the canonical position`);
  console.log(`Estimated runtime: ~${Math.ceil(OPENINGS.length * (GAMES_PER_OPENING + 1) * REQUEST_DELAY_MS / 60000)}min\n`);

  const manifest = [];
  for (const opening of OPENINGS) {
    manifest.push(await processOpening(opening));
  }

  writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: 'lichess masters explorer + game export (CC0)',
    perOpeningCap: GAMES_PER_OPENING,
    entries: manifest,
  }, null, 2));

  const ok = manifest.filter((m) => m.status === 'fetched');
  const totalGames = ok.reduce((s, m) => s + (m.gameCount ?? 0), 0);
  console.log(`\n=== DONE ===`);
  console.log(`Openings processed: ${ok.length}/${OPENINGS.length}`);
  console.log(`Total games fetched: ${totalGames}`);
  console.log(`Output: ${OUT_DIR}/`);
  console.log(`Next: git add ${OUT_DIR} && git commit && git push`);
  console.log(`Then sandbox: node scripts/merge-master-games.mjs ${OUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
