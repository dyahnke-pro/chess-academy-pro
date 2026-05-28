#!/usr/bin/env node
// For each major variation of an opening, find the player's best WIN
// (highest opponent rating, decisive result, sufficient length) from
// the raw chess.com archives. Fetches the actual PGN for each chosen
// game and writes a clean candidates file.

import fs from 'node:fs';
import path from 'node:path';

const PLAYER = process.argv[2] || 'danielnaroditsky';
const OPENING_ID = process.argv[3] || 'caro-kann';

const SRC_DIR = path.join('data', 'sources', `${PLAYER}-chesscom`);
const TREE_PATH = path.join('data', 'sources', `${PLAYER}-trees`, `${OPENING_ID}.json`);
const OUT_PATH = path.join('data', 'sources', `${PLAYER}-trees`, `${OPENING_ID}-model-games.json`);

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const { color, minPrefix, spine, variations } = { color: tree.color, minPrefix: tree.minPrefix, spine: tree.spine.sans, variations: tree.variations };

// Fast PGN → SAN extractor
const PGN_HEADER_END = /\n\n/;
const CLOCK_RE = /\{[^}]*\}/g;
const MOVE_NUM_RE = /\b\d+\.+\s*/g;
const RESULT_RE = /\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/;
const VARIATION_RE = /\([^()]*\)/g;
function pgnToSanMoves(pgnText) {
  const splitAt = pgnText.search(PGN_HEADER_END);
  if (splitAt < 0) return null;
  let body = pgnText.slice(splitAt).replace(CLOCK_RE, '');
  let prev; do { prev = body; body = body.replace(VARIATION_RE, ''); } while (body !== prev);
  body = body.replace(MOVE_NUM_RE, '').replace(RESULT_RE, '').trim();
  return body ? body.split(/\s+/).filter(Boolean) : null;
}

const STANDARD_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function isStandard(g) {
  if (g.rules && g.rules !== 'chess') return false;
  if (g.initial_setup && g.initial_setup !== '' && g.initial_setup !== STANDARD_START_FEN) return false;
  return true;
}
const RESULT_TO = { win:'win', checkmated:'loss', resigned:'loss', timeout:'loss', abandoned:'loss', agreed:'draw', stalemate:'draw', insufficient:'draw', '50move':'draw', repetition:'draw', timevsinsufficient:'draw' };

function* iterGames() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl')).sort();
  for (const file of files) {
    const lines = fs.readFileSync(path.join(SRC_DIR, file), 'utf8').split('\n').filter(Boolean);
    for (const line of lines) { try { yield JSON.parse(line); } catch {} }
  }
}

function matchesPrefix(moves, prefix) {
  if (moves.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (moves[i] !== prefix[i]) return false;
  return true;
}

// Targets: the spine + the top variations' continuations.
const TARGETS = [
  { id: 'spine', label: 'Main line (Advance c5)', pathSans: [...minPrefix, ...spine] },
  ...variations.slice(0, 8).map((v, i) => ({
    id: `var-${i + 1}`,
    label: `Variation ${i + 1}: ${v.prefixToHere.join(' ')} ${v.branchSan}`,
    pathSans: [...minPrefix, ...v.prefixToHere, v.branchSan, ...v.continuation.slice(1, 5)],
  })),
];

const candidates = TARGETS.map((t) => ({ ...t, games: [] }));

const dnLc = PLAYER.toLowerCase();
let total = 0, scanned = 0;
for (const game of iterGames()) {
  total++;
  if (!isStandard(game) || !game.pgn) continue;
  const isWhite = (game.white?.username || '').toLowerCase() === dnLc;
  const isBlack = (game.black?.username || '').toLowerCase() === dnLc;
  if (!isWhite && !isBlack) continue;
  if (color === 'white' && !isWhite) continue;
  if (color === 'black' && !isBlack) continue;

  const moves = pgnToSanMoves(game.pgn);
  if (!moves || moves.length < 20) continue;  // model games need to be playable, not aborted

  const me = isWhite ? game.white : game.black;
  const them = isWhite ? game.black : game.white;
  const mine = RESULT_TO[me.result] || me.result;
  if (mine !== 'win') continue;  // only WINS for model games

  const oppRating = them.rating || 0;
  if (oppRating < 2400) continue;  // 2400+ filter (titled / strong)

  // Find the deepest target this game matches
  let bestMatch = null;
  for (const t of candidates) {
    if (matchesPrefix(moves, t.pathSans)) {
      if (!bestMatch || t.pathSans.length > bestMatch.pathSans.length) bestMatch = t;
    }
  }
  if (!bestMatch) continue;

  bestMatch.games.push({
    url: game.url,
    date: game.end_time ? new Date(game.end_time * 1000).toISOString().slice(0, 10) : null,
    studentColor: isWhite ? 'white' : 'black',
    opponent: them.username,
    opponentRating: oppRating,
    studentRating: me.rating,
    timeClass: game.time_class,
    timeControl: game.time_control,
    eco: game.eco?.split('/').pop()?.replace(/-/g, ' '),
    plyCount: moves.length,
    pgn: game.pgn,
  });
  scanned++;
}

// Rank each target's games by opponent rating then ply count
for (const t of candidates) {
  t.games.sort((a, b) => (b.opponentRating - a.opponentRating) || (b.plyCount - a.plyCount));
  t.totalCandidates = t.games.length;
  t.games = t.games.slice(0, 5);  // keep top 5 per target
}

fs.writeFileSync(OUT_PATH, JSON.stringify({ player: PLAYER, openingId: OPENING_ID, generatedAt: new Date().toISOString(), totals: { totalGamesScanned: total, matchingWins: scanned }, candidates }, null, 2));
console.log(`[picker] wrote ${OUT_PATH}`);
console.log();
for (const t of candidates) {
  console.log(`${t.label} (${t.totalCandidates} candidate wins ≥2400):`);
  for (const g of t.games.slice(0, 3)) {
    console.log(`  [${g.opponentRating}] vs ${g.opponent} | ${g.date} | ${g.timeClass} | ${g.plyCount} plies | ${g.url}`);
  }
  console.log();
}
