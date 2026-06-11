#!/usr/bin/env node
// scripts/tag-puzzle-moving-piece.mjs
// ----------------------------------------------------------------------
// One-shot tagger for src/data/puzzles.json. Adds a `movingPiece` field
// to every puzzle record (K/Q/R/B/N/P) — the piece the SOLVER moves.
//
// Lichess convention (this repo's puzzles.json): `puzzle.fen` is the
// position BEFORE the opponent's blunder, `moves[0]` is the opponent's
// setup move (auto-played), and `moves[1]` is the SOLVER's move — the
// tactic the puzzle is actually about. So movingPiece is read off
// moves[1], applied to the position AFTER moves[0]. Single-move puzzles
// (training pool, source:'training') are solver-to-move already, so
// their solver move is moves[0].
//
// (Before 2026-06-10 this tagged moves[0] = the opponent's piece, which
// made the kid per-piece filter select on the wrong side — "Rook
// Puzzles" returned puzzles where the OPPONENT first moved a rook. Fixed
// to tag the solver's piece; re-run with --retag to recompute.)
//
// Required by the kid section's per-piece puzzle filter — Lichess's
// `moves` field is UCI (e.g. "f3g4"), not SAN, so we can't derive the
// piece by looking at the first character of the move string.
//
// Idempotent by default: re-running skips entries that already carry a
// movingPiece. Pass --retag (or --force) to RECOMPUTE every entry — use
// this after changing the tagging logic. Logs any entry where a UCI
// move can't be applied (would indicate a bad FEN/move pair).
//
// Run with:  node scripts/tag-puzzle-moving-piece.mjs [--retag]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUZZLES_PATH = resolve(ROOT, 'src/data/puzzles.json');

const PIECE_MAP = {
  p: 'P',
  n: 'N',
  b: 'B',
  r: 'R',
  q: 'Q',
  k: 'K',
};

const FORCE = process.argv.includes('--retag') || process.argv.includes('--force');

/** Apply a UCI string to a chess.js instance. Returns the move or null. */
function applyUci(chess, uci) {
  if (!uci || uci.length < 4) return null;
  return chess.move({
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? uci[4] : undefined,
  });
}

function tagPuzzle(puzzle) {
  if (typeof puzzle.movingPiece === 'string' && !FORCE) {
    return { tagged: false, error: null };
  }
  const moves = String(puzzle.moves ?? '').trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) {
    return { tagged: false, error: 'no moves' };
  }
  // Multi-move (Lichess) → moves[0] is the opponent's setup, moves[1]
  // is the solver's move. Single-move (training) → moves[0] is the
  // solver's move.
  const hasSetup = moves.length >= 2;
  try {
    const chess = new Chess(puzzle.fen);
    if (hasSetup && !applyUci(chess, moves[0])) {
      return { tagged: false, error: `setup move rejected: ${moves[0]}` };
    }
    const solverUci = hasSetup ? moves[1] : moves[0];
    const move = applyUci(chess, solverUci);
    if (!move) {
      return { tagged: false, error: `solver move rejected: ${solverUci}` };
    }
    const piece = PIECE_MAP[move.piece];
    if (!piece) {
      return { tagged: false, error: `unknown piece: ${move.piece}` };
    }
    puzzle.movingPiece = piece;
    return { tagged: true, error: null };
  } catch (err) {
    return { tagged: false, error: err.message || String(err) };
  }
}

function main() {
  const raw = readFileSync(PUZZLES_PATH, 'utf8');
  const puzzles = JSON.parse(raw);
  if (!Array.isArray(puzzles)) {
    throw new Error('puzzles.json is not an array');
  }
  const total = puzzles.length;
  let tagged = 0;
  let skipped = 0;
  const errors = [];
  const pieceCounts = { K: 0, Q: 0, R: 0, B: 0, N: 0, P: 0 };
  for (const p of puzzles) {
    const result = tagPuzzle(p);
    if (result.tagged) {
      tagged += 1;
      pieceCounts[p.movingPiece] += 1;
    } else if (result.error) {
      errors.push({ id: p.id, error: result.error });
    } else {
      skipped += 1;
      if (p.movingPiece) pieceCounts[p.movingPiece] += 1;
    }
  }
  // Pretty-print: 2-space indent, sorted top-level keys not needed since
  // we preserve the array order and just append a new field.
  writeFileSync(PUZZLES_PATH, JSON.stringify(puzzles, null, 2) + '\n');
  console.log(`[tag-puzzle-moving-piece] total: ${total}`);
  console.log(`  newly tagged: ${tagged}`);
  console.log(`  already had movingPiece: ${skipped}`);
  console.log(`  errors: ${errors.length}`);
  console.log(`  by piece:`, pieceCounts);
  if (errors.length > 0 && errors.length <= 20) {
    console.log(`  first errors:`);
    for (const e of errors.slice(0, 20)) console.log(`    ${e.id}: ${e.error}`);
  }
  if (errors.length > 0) {
    process.exit(1);
  }
}

main();
