// thinkingMotifStep — step 5 ("where are their targets?") asked about ONE
// pattern on ONE board: Pattern Recognition's "Identify" as a tap question
// instead of a handed answer (plan "Tactics": "Pattern Recognition's identify
// is step 5 per motif").
//
// The key is computed by the caller from the tactic detector (the pieces the
// pattern move lands on); this kit only asks it, rules wrong taps out by the
// board, and says why each key square is in the key. Answers record as step 5
// (one vocabulary with the lesson).
import { Chess, type Square } from 'chess.js';
import type { FairKey } from './thinkingPositions';
import { boardIdentity } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem } from '../utils/rotateStem';
import { andList } from '../utils/andList';

export interface MotifBoard {
  fen: string;
  /** The pattern's name as the card says it ("Fork"). */
  motif: string;
  /** The move that springs the pattern (SAN, from the board). */
  san: string;
  /** The pieces it hits — the detector's own involved squares. */
  targets: readonly Square[];
}

function pieceOn(fen: string, sq: Square): string | null {
  try {
    const p = new Chess(fen).get(sq);
    return p ? PIECE_NAMES[p.type] ?? 'piece' : null;
  } catch { return null; }
}

export function motifKey(board: MotifBoard, fen: string): FairKey | null {
  if (boardIdentity(fen) !== boardIdentity(board.fen) || board.targets.length === 0) return null;
  return { key: [...board.targets], nearMiss: [] };
}

export function motifKit(board: MotifBoard): StepKit {
  const name = board.motif.toLowerCase();
  const reasonFor = (fen: string, sq: Square): string | null => {
    if (!board.targets.includes(sq)) return null;
    const piece = pieceOn(fen, sq);
    return piece ? `${board.san} hits the ${piece} on ${sq}.` : null;
  };
  return {
    step: 'their-targets',
    keyFor: (fen) => motifKey(board, fen),
    showLine: (fen, key) => {
      const named = key.map((sq) => `${pieceOn(fen, sq) ?? 'piece'} on ${sq}`);
      return `The ${name} is ${board.san}: it hits the ${andList(named)}.`;
    },
    prompt: (rot) => rotateStem([
      `There is a ${name} here. Tap every piece it would hit.`,
      `Find the ${name}: tap the pieces one move attacks at once.`,
    ], rot),
    wrongTapLine: (fen, sq) => {
      const turn = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      let mine = false;
      try { mine = new Chess(fen).get(sq)?.color === turn; } catch { /* empty */ }
      return mine
        ? 'That is your own piece — the pattern hits theirs. Which of their pieces could one move reach together?'
        : `No ${name} reaches that square. Look for one move that lands on two of their pieces at once.`;
    },
    reasonFor,
    intro: '',
  };
}
