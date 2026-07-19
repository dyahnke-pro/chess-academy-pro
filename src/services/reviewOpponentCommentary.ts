/**
 * reviewOpponentCommentary — "read the opponent" for the post-game review walk.
 *
 * Two people play every game. The student needs to see what the OPPONENT is up to:
 * not just their plan (the both-sides orientation beats cover that) but what a given
 * opponent move TARGETS in the student's position (David 2026-07-19: "what their plan
 * is, what they want to target within your position"). This is the per-opponent-move
 * layer — the Naroditsky "when black played c4, he had an intention…" read.
 *
 * The opponent move is narrated only when it creates a CONCRETE, board-true threat or
 * target, in priority order:
 *   1. it leaves a STUDENT piece loose (the moved piece attacks a now-hanging student
 *      piece) — the sharpest, most immediate thing to see;
 *   2. it trains on a WEAK student pawn (an isolated / doubled pawn the moved piece now
 *      attacks) — the lasting target;
 *   3. it plants a piece on an OUTPOST in the student's half (a knight/bishop the enemy
 *      just parked where no student pawn can challenge it).
 * Otherwise it stays SILENT — we do NOT narrate every opponent move (narration voice
 * rules; silence is fine). Every claim is computed from chess.js attackers +
 * boardStructure + detectTactics (G0); nothing is invented, nothing overstated.
 *
 * Returns a PlanBeat ({ text, arrows }) so the board can lead the eye to the target
 * with an AMBER arrow (the opponent's colour), consistent with the plan-idea beats.
 */
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { describeStructure } from './boardStructure';
import { detectTactics } from './tacticsDetector';
import type { PlanBeat } from './reviewStrategicOrientation';

const OPP_AMBER = '#f59e0b';

const PIECE_LABEL: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * Build the opponent-move commentary for ONE opponent move, or null for silence.
 * `fenBefore` is the position before the opponent's move; `san` is their move;
 * `studentColorWB` is the student's colour (the opponent is the other side).
 */
export function buildOpponentMoveTeaching(
  fenBefore: string,
  san: string,
  studentColorWB: 'w' | 'b',
): PlanBeat | null {
  const enemy: 'w' | 'b' = studentColorWB === 'w' ? 'b' : 'w';
  const chess = new Chess(fenBefore);
  let to: string;
  let movedPiece: string;
  try {
    const mv = chess.move(san);
    if (!mv || mv.color !== enemy) return null; // only comment the opponent's own move
    to = mv.to;
    movedPiece = mv.piece;
  } catch {
    return null;
  }
  const fenAfter = chess.fen();
  const movedLabel = PIECE_LABEL[movedPiece] ?? 'piece';

  // 1. Did the move leave a STUDENT PIECE (not a pawn) loose, with the moved piece
  //    bearing on it? A loose knight/bishop/rook/queen is a real threat worth calling;
  //    an attacked pawn is usually just normal opening tension (weak pawns are the
  //    structural case below), so exclude pawns here to avoid noise.
  try {
    const hanging = detectTactics(fenAfter).hangingPieces.filter((hp) => hp.color === studentColorWB && hp.piece !== 'p');
    for (const hp of hanging) {
      const attackers = chess.attackers(hp.square as Square, enemy);
      if (attackers.includes(to as Square)) {
        return {
          text: `Watch out — that ${movedLabel} leaves your ${PIECE_LABEL[hp.piece] ?? 'piece'} on ${hp.square} loose.`,
          arrows: [{ startSquare: to, endSquare: hp.square, color: OPP_AMBER }],
        };
      }
    }
  } catch { /* fall through */ }

  // 2. Does the moved piece train on a WEAK student pawn (isolated / doubled)?
  try {
    const struct = describeStructure(fenAfter);
    if (struct) {
      const weakSquares = new Set<string>(struct.pawns.isolatedPawns[studentColorWB]);
      // doubled pawns: name a specific pawn square on a doubled file
      for (const f of struct.pawns.doubledFiles[studentColorWB]) {
        for (const row of chess.board()) {
          for (const cell of row) {
            if (cell && cell.type === 'p' && cell.color === studentColorWB && cell.square[0] === f) weakSquares.add(cell.square);
          }
        }
      }
      for (const sq of weakSquares) {
        const attackers = chess.attackers(sq as Square, enemy);
        if (attackers.includes(to as Square)) {
          return {
            text: `Your opponent's ${movedLabel} trains on your weak pawn on ${sq} — a lasting target.`,
            arrows: [{ startSquare: to, endSquare: sq, color: OPP_AMBER }],
          };
        }
      }
    }
  } catch { /* fall through */ }

  // 3. Did the move plant a knight/bishop on an OUTPOST in the student's half?
  try {
    const struct = describeStructure(fenAfter);
    if (struct && (movedPiece === 'n' || movedPiece === 'b')) {
      const outpost = struct.outposts.find((o) => o.color === enemy && o.square === to);
      if (outpost) {
        return {
          text: `Your opponent plants a ${movedLabel} on ${to} — an outpost no pawn of yours can challenge.`,
          arrows: [],
        };
      }
    }
  } catch { /* fall through */ }

  return null;
}
