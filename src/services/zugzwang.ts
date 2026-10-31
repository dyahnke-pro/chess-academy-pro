// ZUGZWANG — "almost every decisive pawn ending is decided by zugzwang"
// (Naroditsky, Using Your King, endgame comb 2026-10-01). Exact, from the
// tablebase (≤7 pieces): the side to move is in zugzwang when its result with
// best play is WORSE than the result it would have if it could pass — the same
// position with the other side to move. Nothing is inferred; a position the
// tablebase does not cover says nothing.
//
// What it says is the fact only. The tablebase result for the side to move is
// already best play, so a "waiting move that fixes it" is never promised — if
// one existed, the result would not be worse.
import { Chess } from 'chess.js';
import { tablebaseMoves, type TablebaseMovesResult } from './endgameTablebaseService';

type Lookup = (fen: string) => Promise<TablebaseMovesResult | null>;
const WDL: Record<string, number> = { win: 1, 'cursed-win': 1, 'maybe-win': 1, draw: 0, loss: -1, 'blessed-loss': -1, 'maybe-loss': -1 };
const WORD = ['loses', 'is a draw', 'wins'];

/** The same board with the other side to move (en passant cleared). Null when
 *  the side to move is in check — passing is not even a fiction then. */
export function passFen(fen: string): string | null {
  const p = fen.split(' ');
  if (p.length < 4) return null;
  try { if (new Chess(fen).inCheck()) return null; } catch { return null; }
  p[1] = p[1] === 'w' ? 'b' : 'w';
  p[3] = '-';
  return p.join(' ');
}

export interface ZugzwangRead {
  /** Result for the side to move, best play: -1 loss, 0 draw, 1 win. */
  onMove: number;
  /** Result the side to move would have if it could pass. */
  ifPassed: number;
  mutual: boolean;
}

/** Zugzwang for the side to move at `fen`, or null (none / out of range). */
export async function readZugzwang(fen: string, lookup: Lookup = tablebaseMoves): Promise<ZugzwangRead | null> {
  const pf = passFen(fen);
  if (!pf) return null;
  const [a, b] = await Promise.all([lookup(fen), lookup(pf)]);
  if (!a || !b) return null;
  const onMove = WDL[a.category]; const theirs = WDL[b.category];
  if (onMove === undefined || theirs === undefined) return null;
  const ifPassed = theirs === 0 ? 0 : -theirs;
  if (onMove >= ifPassed) return null;
  return { onMove, ifPassed, mutual: onMove === -1 && theirs === -1 };
}

/** The sentence, from the student's seat. `studentToMove`: the student is the
 *  side to move at the read's position (before their move), else the
 *  opponent is (after it). */
export function zugzwangSentence(z: ZugzwangRead, studentToMove: boolean): string {
  if (z.mutual) {
    return studentToMove
      ? 'Mutual zugzwang: whoever has to move here loses — and it is your move.'
      : 'You put them in mutual zugzwang: whoever has to move here loses, and it is their move.';
  }
  if (studentToMove) {
    return `Zugzwang: on your move this ${WORD[z.onMove + 1]}; if it were their move, you would ${z.ifPassed === 1 ? 'win' : 'hold the draw'}. In pawn endings, who has to move decides it.`;
  }
  return `You put them in zugzwang: on their move it ${WORD[z.onMove + 1]} for them; if they could pass, they would ${z.ifPassed === 1 ? 'win' : 'hold'}. Every move they make now gives ground.`;
}
