// threatCheck — the Learn-surface "what did that move just threaten?" question
// (David 2026-07-11, approved with the review-questions design). After the
// opponent's reply, when one of the STUDENT's pieces is genuinely hanging, the
// coach asks WHICH piece is in danger before the student replies — the
// check-what-changed discipline, drilled as a question.
//
// G0 + honesty contract by construction: the target and the decoys are
// computed with chess.js (findHangingPieces); the question names NO piece and
// NO square; the narration layer is handed only the question, never the
// answer, and the tactics facts are suppressed while it is open.

import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';

const PIECE_NAME: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};
const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export interface ThreatCheckQuestion {
  /** Piece-free, square-free probe. */
  question: string;
  /** Chip options ("knight on f6"), deterministic square order. */
  options: string[];
  /** The correct option string. */
  answer: string;
  answerSquare: string;
  /** Spoken after the pick — names the piece + what to do about it. */
  reveal: string;
  /** The FEN the question was built for (student to move). */
  fen: string;
}

/** Need at least this many chips for the question to test anything. */
export const THREAT_CHECK_MIN_OPTIONS = 3;

/**
 * Build the question, or null when the position doesn't support one — no
 * student piece hanging, or not enough decoy pieces for a real choice.
 * Empty > generic > invented.
 */
export function buildThreatCheckQuestion(
  fen: string,
  studentColor: 'w' | 'b',
): ThreatCheckQuestion | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  let hanging: ReturnType<typeof findHangingPieces>;
  try {
    hanging = findHangingPieces(chess); // kings are never in this list
  } catch {
    return null;
  }
  const studentHanging = hanging.filter((h) => h.color === studentColor);
  if (studentHanging.length === 0) return null;
  // The target: the most valuable student piece in danger.
  const target = [...studentHanging].sort(
    (a, b) => (PIECE_VALUE[b.piece] ?? 0) - (PIECE_VALUE[a.piece] ?? 0),
  )[0];

  // Decoys: the student's OTHER pieces that are NOT hanging (kings and the
  // target excluded). Prefer the most valuable ones — plausible worries.
  const hangingSquares = new Set(studentHanging.map((h) => h.square));
  const decoys: Array<{ square: string; piece: string }> = [];
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== studentColor || sq.type === 'k') continue;
      if (hangingSquares.has(sq.square)) continue;
      decoys.push({ square: sq.square, piece: sq.type });
    }
  }
  decoys.sort((a, b) => (PIECE_VALUE[b.piece] ?? 0) - (PIECE_VALUE[a.piece] ?? 0));
  const picked = decoys.slice(0, THREAT_CHECK_MIN_OPTIONS - 1);
  if (picked.length < THREAT_CHECK_MIN_OPTIONS - 1) return null;

  const label = (p: { piece: string; square: string }): string =>
    `${PIECE_NAME[p.piece] ?? 'piece'} on ${p.square}`;
  const answer = label(target);
  // Deterministic, non-leaking order: sort chips by square.
  const options = [answer, ...picked.map(label)].sort((a, b) =>
    (a.split(' on ')[1] ?? '').localeCompare(b.split(' on ')[1] ?? ''),
  );

  return {
    question: 'Before you move — that last move made a threat. Which of your pieces is in danger?',
    options,
    answer,
    answerSquare: target.square,
    reveal:
      `Your ${PIECE_NAME[target.piece] ?? 'piece'} on ${target.square} is under attack ` +
      `and nothing is holding it. Defend it, move it, or meet the threat with something bigger.`,
    fen,
  };
}

/** Grade a chip pick. */
export function judgeThreatCheckPick(q: ThreatCheckQuestion, picked: string): boolean {
  return picked === q.answer;
}
