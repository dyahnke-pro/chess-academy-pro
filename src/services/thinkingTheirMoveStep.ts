// thinkingTheirMoveStep — step 2, "What did their move change?"
//
// The first habit of the method: before you think about your own move, ask
// what THEIR last move did. This first question asks the most concrete part:
// which of your pieces does it attack now that were not attacked before —
// including attacks it DISCOVERED by moving out of the way.
//
// Taught on the student's own games: the board is the position they faced,
// the opponent's real move and the board before it come from the game replay
// (`prevSan`, `beforeFen` on the candidate). The key is a before/after
// comparison with chess.js — computed, nothing judged.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import type { FairKey, LessonPositionCandidate } from './thinkingPositions';
import type { StepKit } from './thinkingLessonSession';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { sayMoveClause } from './spokenMove';
import { rotateStem } from '../utils/rotateStem';

export const THEIR_MOVE_STEP_TAGS: readonly MisconceptionTagId[] = ['missed-opponents-threat'];

const name = (t: PieceSymbol): string => PIECE_NAMES[t] ?? 'piece';

/** Pieces of `side` (not the king, not pawns) attacked by the other side. */
function attackedSet(c: Chess, side: Color): Set<Square> {
  const other: Color = side === 'w' ? 'b' : 'w';
  const out = new Set<Square>();
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== side || cell.type === 'k' || cell.type === 'p') continue;
    if (c.attackers(cell.square, other).length > 0) out.add(cell.square);
  }
  return out;
}

/** Your pieces attacked now that were not attacked before their move. */
export function theirMoveKey(fen: string, beforeFen: string | undefined): FairKey | null {
  if (!beforeFen) return null;
  let now: Chess;
  let before: Chess;
  try { now = new Chess(fen); before = new Chess(beforeFen); } catch { return null; }
  const me = now.turn();
  const was = attackedSet(before, me);
  return { key: [...attackedSet(now, me)].filter((sq) => !was.has(sq)), nearMiss: [] };
}

export function theirMoveReason(fen: string, sq: Square): string | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const p = c.get(sq);
  if (!p) return null;
  const other: Color = p.color === 'w' ? 'b' : 'w';
  const by = [...new Set(c.attackers(sq, other).map((s) => c.get(s)?.type).filter((t): t is PieceSymbol => !!t).map(name))];
  return `Your ${name(p.type)} on ${sq} is attacked now${by.length ? ` — by their ${by.join(' and ')}` : ''}.`;
}

export function theirMoveShowLine(fen: string, key: readonly Square[], rot: number): string {
  const open = rotateStem([
    'Every move starts with their last one: what does it attack now — directly, or by getting out of the way of another piece?',
    'Before your own ideas, ask what their move changed. First: what is it hitting now that it was not before?',
  ], rot);
  const reasons = key.map((sq) => theirMoveReason(fen, sq)).filter((r): r is string => !!r);
  return [open, ...reasons].join(' ');
}

export function theirMovePrompt(rot: number): string {
  return rotateStem([
    'Tap every piece of yours their move attacks now.',
    'What does their move hit? Tap your pieces it attacks.',
  ], rot);
}

export function theirMoveWrongTapLine(fen: string, sq: Square): string {
  let c: Chess;
  try { c = new Chess(fen); } catch { return 'Look at what their moved piece reaches now.'; }
  const p = c.get(sq);
  if (!p) return 'Tap the piece itself, not an empty square.';
  if (p.color !== c.turn()) return 'That one is theirs — the question is what their move attacks of yours.';
  const other: Color = p.color === 'w' ? 'b' : 'w';
  if (c.attackers(sq, other).length === 0) return `Nothing of theirs attacks that ${name(p.type)} — trace the lines from the piece that moved.`;
  return `That ${name(p.type)} was already under attack before their move — look for what is new.`;
}

/** This step needs the opponent's real move; a candidate without it is dropped. */
export function withTheirMove(c: LessonPositionCandidate): LessonPositionCandidate | null {
  if (!c.prevSan || !c.beforeFen) return null;
  return {
    ...c,
    lead: rotateStem([
      `They just played ${sayMoveClause(c.prevSan)}.`,
      `In your game they answered with ${sayMoveClause(c.prevSan)}.`,
    ], c.fen.length),
  };
}

export function theirMoveKit(): StepKit {
  return {
    step: 'their-move-changed',
    keyFor: (fen, c) => theirMoveKey(fen, c?.beforeFen),
    showLine: theirMoveShowLine,
    prompt: theirMovePrompt,
    wrongTapLine: theirMoveWrongTapLine,
    reasonFor: theirMoveReason,
    intro: 'Today: what did their move change? Strong players start every move by asking what the opponent just did. First question: what does it attack now?',
    adapt: withTheirMove,
  };
}
