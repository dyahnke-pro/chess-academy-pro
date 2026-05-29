#!/usr/bin/env node
// Mine Naroditsky's chess.com Alekhine games for opponent blunders that
// he punished concretely. Output: candidate trap sequences for human
// review/inclusion in pro-repertoires.json.
//
// Method:
//   1. Filter games to Naroditsky-as-white wins in the Alekhine (e4 c5 c3 prefix)
//   2. Compute material balance ply-by-ply using piece-counting
//   3. Find plies where BLACK's move dropped Black's material by ≥3
//      (knight/bishop, rook, queen) and was NOT compensated by gaining
//      White material — these are "blunders"
//   4. The trap starts AT the position before the blunder, walks the
//      blunder + the next 4-6 plies of the punishment
//   5. Group by FEN (the position before the blunder) + the blunder
//      move SAN — duplicates means many opponents fell into the same
//      trap = strong candidate
//   6. Output the top patterns by frequency

import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';

const SRC_DIR = 'data/sources/danielnaroditsky-chesscom';
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function pgnToSan(pgnText) {
  const i = pgnText.search(/\n\n/);
  if (i < 0) return null;
  let b = pgnText.slice(i).replace(/\{[^}]*\}/g, '');
  let prev; do { prev = b; b = b.replace(/\([^()]*\)/g, ''); } while (b !== prev);
  b = b.replace(/\b\d+\.+\s*/g, '').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim();
  return b ? b.split(/\s+/).filter(Boolean) : null;
}

function matches(m, p) {
  if (m.length < p.length) return false;
  for (let i = 0; i < p.length; i++) if (m[i] !== p[i]) return false;
  return true;
}

function materialBalance(chess) {
  let white = 0, black = 0;
  const board = chess.board().flat().filter(Boolean);
  for (const p of board) {
    const v = PIECE_VALUE[p.type] ?? 0;
    if (p.color === 'w') white += v;
    else black += v;
  }
  return { white, black, diff: white - black };
}

const PREFIX = ["e4","Nf6"];

const trapsByPattern = new Map(); // key: positionFen + blunderSan → array of game info

const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.jsonl'));
let totalGames = 0;
let alekhineGames = 0;
let blundersFound = 0;

for (const f of files) {
  const lines = fs.readFileSync(path.join(SRC_DIR, f), 'utf8').split('\n').filter(Boolean);
  for (const line of lines) {
    let g; try { g = JSON.parse(line); } catch { continue; }
    totalGames++;
    if (!g.pgn) continue;
    const isWhite = (g.white?.username || '').toLowerCase() === 'danielnaroditsky';
    if (isWhite) continue;
    // Only count games he WON (1-0 means white wins)
    const result = g.pgn.match(/\[Result "([^"]+)"\]/)?.[1];
    if (result !== "0-1") continue;
    const moves = pgnToSan(g.pgn);
    if (!moves || !matches(moves, PREFIX)) continue;
    alekhineGames++;

    // Replay the game ply by ply with material tracking; detect WHITE blunders
    // (the opponent — student is Black here). A blunder = White's move (ply P)
    // opens a tactical sequence where the next 2-3 Black moves win material;
    // we measure the swing in BLACK's favor (negative diff means Black is up).
    const chess = new Chess();
    let ok = true;
    let lastDiff = 0;
    for (let ply = 0; ply < moves.length - 1; ply++) {
      try { chess.move(moves[ply]); }
      catch { ok = false; break; }
      const isWhiteMove = (ply % 2 === 0);
      if (!isWhiteMove) {
        lastDiff = materialBalance(chess).diff;
        continue;
      }
      // White just moved. Look ahead 1-5 plies, track lowest diff (most negative
      // = most in Black's favor).
      const afterWhiteDiff = materialBalance(chess).diff;
      const clone = new Chess(chess.fen());
      let swing = afterWhiteDiff;
      for (let k = 1; k <= 5 && ply + k < moves.length; k++) {
        try { clone.move(moves[ply + k]); }
        catch { break; }
        const d = materialBalance(clone).diff;
        if (d < swing) swing = d;
      }
      const cliff = lastDiff - swing; // total swing toward Black from BEFORE White's blunder
      // A blunder: 3+ point swing in Black's favor within 5 plies AND in the
      // opening/middlegame range.
      if (cliff >= 3 && ply >= 6 && ply <= 50) {
        const beforeChess = new Chess();
        for (let k = 0; k < ply; k++) beforeChess.move(moves[k]);
        const beforeFen = beforeChess.fen();
        const blunderSan = moves[ply];
        const punish = moves.slice(ply, ply + 7);
        const key = `${beforeFen}::${blunderSan}`;
        if (!trapsByPattern.has(key)) trapsByPattern.set(key, []);
        trapsByPattern.get(key).push({
          url: g.url,
          opponent: g.white?.username,
          opponentRating: g.white?.rating,
          ply,
          cliff,
          punish,
          prefixMoves: moves.slice(0, ply),
        });
        blundersFound++;
        break; // one trap per game
      }
      lastDiff = afterWhiteDiff;
    }
  }
}

console.log(`Scanned ${totalGames} games; ${alekhineGames} are his Alekhine wins as Black; found ${blundersFound} White-blunder positions; ${trapsByPattern.size} unique trap patterns.`);
console.log();

// Sort patterns by frequency (most-fallen-into traps first)
const sorted = [...trapsByPattern.entries()].sort((a, b) => b[1].length - a[1].length);

// Print top 15 by frequency, including only those occurring in ≥3 games
console.log('=== TOP TRAP PATTERNS (≥3 games fell into the same one) ===\n');
let printed = 0;
for (const [key, games] of sorted) {
  if (games.length < 3) continue;
  if (printed >= 15) break;
  const [beforeFen, blunderSan] = key.split('::');
  const sample = games[0];
  const moveNum = Math.ceil((sample.ply + 1) / 2);
  console.log(`#${printed + 1} — ${games.length} games — White blunder ${blunderSan} at move ${moveNum}`);
  console.log(`  before FEN: ${beforeFen}`);
  console.log(`  prefix:    ${sample.prefixMoves.join(' ')}`);
  console.log(`  blunder + punish: ${sample.punish.join(' ')}`);
  console.log(`  example opponents:`);
  for (const ex of games.slice(0, 3)) {
    console.log(`    vs ${ex.opponent} (${ex.opponentRating || '?'}) — ${ex.url}`);
  }
  console.log();
  printed++;
}

// Also write full output to disk for follow-up authoring
fs.writeFileSync(
  'data/sources/danielnaroditsky-alekhine-trap-candidates.json',
  JSON.stringify(
    sorted.filter(([, games]) => games.length >= 2).map(([key, games]) => {
      const [beforeFen, blunderSan] = key.split('::');
      return { beforeFen, blunderSan, count: games.length, samples: games.slice(0, 5) };
    }),
    null,
    2,
  ),
);
console.log(`\nFull candidate list (occurring in ≥2 games) written to data/sources/danielnaroditsky-alekhine-trap-candidates.json`);
