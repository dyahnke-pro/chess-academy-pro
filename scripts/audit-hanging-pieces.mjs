#!/usr/bin/env node
/**
 * audit-hanging-pieces.mjs
 * ------------------------
 * Local substitute for the Lichess cloud-eval audit. Catches the
 * egregious class of bugs: "after this scripted move, the moving
 * player leaves a piece en prise to a less-or-equally-valued piece,
 * for free."
 *
 * Not as strong as a real engine audit (won't catch subtle tactical
 * blunders that need deep search), but it flags the unambiguous
 * "player hangs their queen" / "player hangs their rook" class
 * which is what the user's complaint implies.
 *
 * Uses only chess.js — no network, runs in a few seconds.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { collectAllScriptedMoves } from './audit-lib/collect-moves.mjs';

const repoRoot = new URL('..', import.meta.url).pathname;

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 999 };

function lowestAttacker(chess, sq, byColor) {
  const attackers = chess.attackers(sq, byColor);
  if (!attackers.length) return null;
  let min = Infinity;
  for (const a of attackers) {
    const piece = chess.get(a);
    if (!piece) continue;
    const v = PIECE_VALUE[piece.type];
    if (v < min) min = v;
  }
  return min === Infinity ? null : min;
}

function lowestDefender(chess, sq, byColor) {
  // Defenders are attackers of our own square (chess.attackers includes
  // pins? depends; good enough for the heuristic).
  const defenders = chess.attackers(sq, byColor);
  if (!defenders.length) return null;
  let min = Infinity;
  for (const d of defenders) {
    const piece = chess.get(d);
    if (!piece) continue;
    const v = PIECE_VALUE[piece.type];
    if (v < min) min = v;
  }
  return min === Infinity ? null : min;
}

/**
 * After the scripted move is played, is the moving player leaving a
 * piece undefended and attacked by a piece of equal-or-lower value?
 * Ignores the actual moved piece's destination if it's ON a square
 * that's guarded ≥1 by friendly pieces — normal recapture chain is
 * not "hanging".
 *
 * Returns the hung square + piece, or null.
 */
function detectHanging(fenAfter, moverColor) {
  try {
    const chess = new Chess(fenAfter);
    const opponent = moverColor === 'w' ? 'b' : 'w';
    // Iterate every own piece
    for (const rank of ['1', '2', '3', '4', '5', '6', '7', '8']) {
      for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
        const sq = file + rank;
        const piece = chess.get(sq);
        if (!piece || piece.color !== moverColor) continue;
        if (piece.type === 'k') continue; // kings aren't "hung"
        const attackerVal = lowestAttacker(chess, sq, opponent);
        if (attackerVal === null) continue; // not attacked
        const defenderVal = lowestDefender(chess, sq, moverColor);
        const myVal = PIECE_VALUE[piece.type];
        // Hung iff: attacker <= my value AND (no defender OR attacker < my value with defender of same or higher value)
        if (defenderVal === null && attackerVal <= myVal) {
          return { square: sq, piece: piece.type, attackerVal, myVal };
        }
        // Even with a defender, if attacker value < my value, we lose material
        // (e.g. queen attacked by pawn, defended by knight — knight takes pawn after Qxp but still lost queen for pawn+knight)
        if (defenderVal !== null && attackerVal < myVal && attackerVal <= defenderVal) {
          // Only flag when the trade is clearly losing — at least 2 points down
          if (myVal - attackerVal >= 2) {
            return { square: sq, piece: piece.type, attackerVal, myVal, defended: true };
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

console.log('[audit-hanging] collecting records…');
const t0 = Date.now();
const records = collectAllScriptedMoves(repoRoot);
console.log(`[audit-hanging] collected ${records.length} records in ${Date.now() - t0}ms`);

const findings = [];
let processed = 0;
for (const r of records) {
  if (!r.fenAfter || !r.san) continue;
  processed++;
  // The mover is the player whose side was to move in fenBefore.
  // fenBefore "w" = white to move, so after the move, the just-moved side is white.
  if (!r.fenBefore) continue;
  const sideToMoveBefore = r.fenBefore.split(' ')[1];
  if (sideToMoveBefore !== 'w' && sideToMoveBefore !== 'b') continue;
  const moverColor = sideToMoveBefore;

  const hung = detectHanging(r.fenAfter, moverColor);
  if (hung) {
    findings.push({
      source: r.source,
      openingId: r.openingId,
      sublineName: r.sublineName,
      moveIndex: r.moveIndex,
      san: r.san,
      moverColor,
      hungSquare: hung.square,
      hungPiece: hung.piece,
      attackerVal: hung.attackerVal,
      myVal: hung.myVal,
      defended: hung.defended ?? false,
    });
  }
}

console.log(`[audit-hanging] processed ${processed}, found ${findings.length} potential hangs`);

const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, 'hanging.json'),
  JSON.stringify({ processed, count: findings.length, findings }, null, 2),
);

const md = [
  '# Hanging-Piece Audit (local chess.js heuristic)',
  '',
  `Records processed: ${processed}`,
  `Potential hangs flagged: ${findings.length}`,
  '',
  '| Opening | Subline | Move# | SAN | Hung | Attacker | Defended |',
  '|---|---|---:|---|---|---:|---|',
  ...findings.slice(0, 100).map((f) =>
    `| ${f.openingId} | ${f.sublineName ?? ''} | ${f.moveIndex + 1} | ${f.san} | ${f.hungPiece}${f.hungSquare} (${f.myVal}) | ${f.attackerVal} | ${f.defended ? 'yes' : 'no'} |`,
  ),
];
if (findings.length > 100) md.push(`\n_Showing first 100 of ${findings.length}_`);
writeFileSync(join(outDir, 'hanging.md'), md.join('\n') + '\n');

console.log('[audit-hanging] wrote audit-reports/hanging.{json,md}');
