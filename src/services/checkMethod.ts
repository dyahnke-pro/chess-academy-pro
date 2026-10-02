// THREE WAYS TO MEET CHECK (WO-TEACH-GAPS P3, a missing method beat). A player
// in check reaches for the king. The habit is to list all three answers — move
// the king, block, take the checker — before choosing, because the king move
// is so often the worse one.
//
// Earned only when the board makes the habit matter: the student is in check,
// at least two KINDS of answer are legal, and the engine's best is NOT a king
// move while a king move exists. Names the kinds available, never the move
// (the move is the student's to find). Once per game — the claim ledger holds
// `check-method`.
//
// A LEAF: chess.js + the engine's best move handed in.
import { Chess } from 'chess.js';
import { andList } from '../utils/andList';

export type CheckAnswerKind = 'king' | 'block' | 'capture';

export interface CheckMethod {
  text: string;
  kinds: CheckAnswerKind[];
  /** The checking piece's square. */
  squares: string[];
}

const PHRASE: Record<CheckAnswerKind, string> = {
  king: 'move the king',
  block: 'block the check',
  capture: 'take the checking piece',
};

/** `bestUci` = the engine's best move for the student at `fen`. */
export function checkMethod(fen: string, student: 'w' | 'b', bestUci: string | null): CheckMethod | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.turn() !== student || !c.inCheck() || !bestUci) return null;
  const kingSq = c.board().flat().find((p) => p && p.type === 'k' && p.color === student)?.square;
  if (!kingSq) return null;
  const foe = student === 'w' ? 'b' : 'w';
  const checkers = c.attackers(kingSq, foe);
  // Double check has one answer kind (the king); nothing to weigh.
  if (checkers.length !== 1) return null;
  const checker = checkers[0];
  const kinds = new Set<CheckAnswerKind>();
  let bestKind: CheckAnswerKind | null = null;
  for (const m of c.moves({ verbose: true })) {
    const kind: CheckAnswerKind = m.piece === 'k' ? 'king' : m.to === checker ? 'capture' : 'block';
    kinds.add(kind);
    if (`${m.from}${m.to}${m.promotion ?? ''}` === bestUci) bestKind = kind;
  }
  if (kinds.size < 2 || !kinds.has('king') || !bestKind || bestKind === 'king') return null;
  const order: CheckAnswerKind[] = ['king', 'block', 'capture'];
  const here = order.filter((k) => kinds.has(k));
  const text = `Check — and there are three ways to meet a check: move the king, block it, or take the checker. Here you can ${andList(here.map((k) => PHRASE[k]))}. List them all before you touch the king.`;
  return { text, kinds: here, squares: [checker, kingSq] };
}
