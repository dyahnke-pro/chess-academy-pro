/**
 * reviewMoveTeaching — grounded per-move "why" for the post-game review WALK.
 *
 * The review walk used to say NOTHING on the student's good/book moves — only
 * a "Good" badge (David 2026-07-19 audit: "there is no coach narration"). This
 * fills that gap for the student's opening/early moves with a CONCRETE,
 * board-true note: what the move CONTROLS or the plan it serves — never a
 * restatement of the move ("develops the knight to f3" is banned; the student
 * saw the move — narration rules #2/#3/#6). Every claim is computed from
 * chess.js + boardStructure (G0/G3); nothing is LLM-invented, nothing is
 * overstated (David 2026-07-19: "don't state non-applicable reasons"). Returns
 * null when the position deserves silence (a quiet move with no nameable idea).
 *
 * REVIEW register (retrospective, the student's own game) — NOT the present-
 * tense Watch/Learn teaching voice. It states the idea the move served.
 */
import { Chess } from 'chess.js';
import type { Move } from 'chess.js';
import { describeStructure } from './boardStructure';

const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);
const BROAD_CENTER = new Set(['c4', 'c5', 'd4', 'd5', 'e4', 'e5', 'f4', 'f5']);
const FIANCHETTO = new Set(['b2', 'g2', 'b7', 'g7']);

type Sq = Parameters<Chess['get']>[0];
/** A central square the piece genuinely CONTROLS = empty or enemy-occupied.
 *  A square held by the mover's OWN pawn is defense, not "bearing down on" —
 *  excluding it avoids overstating (David 2026-07-19: no non-applicable
 *  reasons — don't say a blocked bishop "rakes toward" its own pawn). */
function controlsCentral(chess: Chess, s: string, mover: 'w' | 'b'): boolean {
  if (!CENTER.has(s)) return false;
  const occ = chess.get(s as Sq);
  return !occ || occ.color !== mover;
}

/** Central squares a knight on `sq` attacks (geometry) and genuinely controls
 *  (empty or enemy — not a square held by its own pawn). Board-true. */
function knightCentralTargets(chess: Chess, sq: string, mover: 'w' | 'b'): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]) - 1;
  const deltas = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const out: string[] = [];
  for (const [df, dr] of deltas) {
    const nf = f + df;
    const nr = r + dr;
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const s = `${String.fromCharCode(97 + nf)}${nr + 1}`;
    if (controlsCentral(chess, s, mover)) out.push(s);
  }
  return out.sort();
}

/** Central squares a bishop on `sq` bears on, walking each diagonal until a
 *  piece blocks — only squares it genuinely controls (empty/enemy), and the
 *  ray stops at the first piece of either color. */
function bishopCentralTargets(chess: Chess, sq: string, mover: 'w' | 'b'): string[] {
  const f0 = sq.charCodeAt(0) - 97;
  const r0 = Number(sq[1]) - 1;
  const out: string[] = [];
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    let f = f0 + df;
    let r = r0 + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const s = `${String.fromCharCode(97 + f)}${r + 1}`;
      if (controlsCentral(chess, s, mover)) out.push(s);
      if (chess.get(s as Sq)) break; // blocked — the ray stops at the first piece
      f += df;
      r += dr;
    }
  }
  return out.sort();
}

function list(sqs: string[]): string {
  if (sqs.length === 1) return sqs[0];
  if (sqs.length === 2) return `${sqs[0]} and ${sqs[1]}`;
  return `${sqs.slice(0, -1).join(', ')}, and ${sqs[sqs.length - 1]}`;
}

/**
 * Build a grounded review note for ONE move. `fenBefore` is the position
 * before the move; `san` is the move played. Returns a concrete, board-true
 * sentence, or null for silence.
 */
export function buildReviewMoveTeaching(
  fenBefore: string,
  san: string,
): string | null {
  const chess = new Chess(fenBefore);
  let mv: Move;
  try {
    const applied = chess.move(san);
    if (!applied) return null;
    mv = applied;
  } catch {
    return null;
  }
  const toRank = Number(mv.to[1]);

  // Castling — the idea is king safety + rook activation, not "castles".
  if (mv.san.startsWith('O-O-O')) {
    return 'The king finds shelter on the queenside and the rook swings toward the open center.';
  }
  if (mv.san.startsWith('O-O')) {
    return 'The king is tucked safely away and the rook connects to the center.';
  }

  // Minor-piece development — carry what the picture doesn't: the squares it
  // now bears on. Never "develops the knight" (restates the move).
  if (mv.piece === 'n') {
    const targets = knightCentralTargets(chess, mv.to, mv.color);
    if (targets.length) return `The knight bears down on ${list(targets)}, fighting for the center.`;
    return null;
  }
  if (mv.piece === 'b') {
    if (FIANCHETTO.has(mv.to)) return 'The bishop takes aim along the long diagonal.';
    const targets = bishopCentralTargets(chess, mv.to, mv.color);
    if (targets.length) return `The bishop rakes toward ${list(targets)}.`;
    return null;
  }

  // Pawn moves — structural change (applies to pushes AND captures), then
  // center stake / space for quiet pushes.
  if (mv.piece === 'p') {
    // Structural change: did the move open a file for the mover, or create an
    // outpost? Compare the structure before vs after (board-true delta). This
    // catches captures like exd6 that leave a half-open file behind.
    const before = describeStructure(fenBefore);
    const after = describeStructure(chess.fen());
    if (before && after) {
      const moverKey = mv.color; // 'w' | 'b'
      const gainedHalfOpen = after.pawns.halfOpenFiles[moverKey].filter(
        (f) => !before.pawns.halfOpenFiles[moverKey].includes(f),
      );
      if (gainedHalfOpen.length) {
        return `Opens the ${gainedHalfOpen[0]}-file for the rooks.`;
      }
      const newOutpost = after.outposts.find(
        (o) => o.color === moverKey && !before.outposts.some((b) => b.square === o.square && b.color === o.color),
      );
      if (newOutpost) {
        return `Secures an outpost on ${newOutpost.square}.`;
      }
    }
    // Quiet central push (not a capture) — stake the center / gain space.
    if (!mv.captured && CENTER.has(mv.to)) {
      return 'Stakes a claim in the center and opens lines for the pieces.';
    }
    if (!mv.captured && BROAD_CENTER.has(mv.to) && (toRank === 4 || toRank === 5)) {
      return 'Gains space and cramps the opponent.';
    }
    return null;
  }

  // Queen / rook / king moves in the opening rarely carry a teachable idea on
  // their own — stay silent rather than invent one.
  return null;
}
