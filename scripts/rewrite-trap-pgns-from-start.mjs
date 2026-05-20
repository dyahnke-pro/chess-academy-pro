#!/usr/bin/env node
/**
 * Converts mined trap entries from setupFen+sans (jump-into-middlegame)
 * to walk-from-move-1 PGN by reconstructing the opening lead-in.
 *
 * For each trapLine with setupFen + source='lichess-puzzle:...':
 *   1. Walk the opening's canonical PGN (from repertoire.json) move
 *      by move, collecting FENs at each ply
 *   2. If any of those FENs matches the trap's setupFen (modulo move
 *      counters), that prefix becomes the lead-in
 *   3. Build full PGN: lead_in + trap_sans → student walks from
 *      move 1, sees the opening unfold, then plays through the trap
 *   4. Remove setupFen so the standard renderer treats this as a
 *      from-start trap
 *
 * Fallback when no match found in the opening's canonical PGN:
 *   - Try openings-lichess.json entries that share the opening's
 *     canonical name (some traps land on positions only reachable
 *     via alternate move orders the canonical PGN doesn't cover)
 *   - If still no match, KEEP setupFen — better mid-game-jump than
 *     no trap at all
 *
 * Per CLAUDE.md "100% accurate before writing" — chess.js validates
 * every reconstructed PGN end-to-end before write.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const repertoire = JSON.parse(readFileSync('src/data/repertoire.json', 'utf-8'));
const repArr = Array.isArray(repertoire) ? repertoire : Object.values(repertoire);
const lichessDb = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf-8'));
const LICHESS = Array.isArray(lichessDb) ? lichessDb : Object.values(lichessDb);

// Normalize a FEN to position-only (drop halfmove + fullmove counters)
// so we can match positions reached via different move orders.
function positionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

// Walk a PGN one ply at a time. Returns an array of { ply, san, fen }
// for every position reached after each move (including the initial
// position at ply 0).
function walkPgn(pgn) {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const c = new Chess();
  const sequence = [{ ply: 0, san: null, fen: c.fen() }];
  for (let i = 0; i < tokens.length; i += 1) {
    try {
      const move = c.move(tokens[i].replace(/[+#!?]+$/, ''));
      sequence.push({ ply: i + 1, san: move.san, fen: c.fen() });
    } catch {
      break;
    }
  }
  return sequence;
}

// Find a PGN prefix that reaches a target setupFen.
function findLeadIn(setupFen, candidatePgns) {
  const targetKey = positionKey(setupFen);
  for (const pgn of candidatePgns) {
    const sequence = walkPgn(pgn);
    const matchIdx = sequence.findIndex((s) => positionKey(s.fen) === targetKey);
    if (matchIdx >= 0) {
      const leadInTokens = pgn.trim().split(/\s+/).filter(Boolean).slice(0, matchIdx);
      return leadInTokens.join(' ');
    }
  }
  return null;
}

// Validate a reconstructed full PGN replays cleanly + ends at the
// expected final position.
function validateReconstruction(fullPgn, expectedFinalFen) {
  const tokens = fullPgn.trim().split(/\s+/).filter(Boolean);
  const c = new Chess();
  for (const tok of tokens) {
    try {
      c.move(tok.replace(/[+#!?]+$/, ''));
    } catch {
      return { ok: false, reason: `illegal SAN: ${tok}` };
    }
  }
  if (positionKey(c.fen()) !== positionKey(expectedFinalFen)) {
    return { ok: false, reason: 'final position mismatch' };
  }
  return { ok: true };
}

// Build candidate PGN list for an opening — start with the opening's
// own canonical PGN, then add openings-lichess.json entries that
// share the same opening family name.
function candidatePgnsForOpening(opening) {
  const candidates = [opening.pgn];
  // Match by opening name family (strip variation suffixes)
  const family = opening.name.split(/[:,]/)[0].trim().toLowerCase();
  for (const entry of LICHESS) {
    const entryName = (entry.name || '').toLowerCase();
    if (entryName.includes(family) || family.includes(entryName.split(/[:,]/)[0].trim())) {
      candidates.push(entry.pgn);
    }
  }
  return candidates;
}

let rewritten = 0;
let kept = 0;
let opErrors = 0;

for (const opening of repArr) {
  if (!Array.isArray(opening.trapLines)) continue;
  const candidates = candidatePgnsForOpening(opening);
  for (const trap of opening.trapLines) {
    if (!trap.setupFen) continue;
    // Compute the expected final FEN (setupFen + trap.pgn moves)
    let expectedFinalFen;
    try {
      const c = new Chess(trap.setupFen);
      for (const tok of trap.pgn.trim().split(/\s+/).filter(Boolean)) {
        c.move(tok.replace(/[+#!?]+$/, ''));
      }
      expectedFinalFen = c.fen();
    } catch (e) {
      opErrors += 1;
      continue;
    }
    const leadIn = findLeadIn(trap.setupFen, candidates);
    if (!leadIn) {
      kept += 1;
      continue;
    }
    const fullPgn = `${leadIn} ${trap.pgn}`.trim();
    const valid = validateReconstruction(fullPgn, expectedFinalFen);
    if (!valid.ok) {
      opErrors += 1;
      continue;
    }
    trap.pgn = fullPgn;
    delete trap.setupFen;
    rewritten += 1;
  }
}

const output = Array.isArray(repertoire) ? repArr : Object.fromEntries(repArr.map((o, i) => [i, o]));
writeFileSync('src/data/repertoire.json', JSON.stringify(output, null, 2) + '\n');

console.log('=== TRAP PGN REWRITE ===');
console.log(`Rewritten (walk-from-move-1):  ${rewritten}`);
console.log(`Kept setupFen (no lead-in found): ${kept}`);
console.log(`Errors (validation/parse):     ${opErrors}`);
console.log('Wrote src/data/repertoire.json');
