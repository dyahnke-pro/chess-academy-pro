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

/**
 * TRIANGULATION — losing a tempo on purpose (n3F 15-19, Fxj 50-61; the
 * platform's Triangulation lesson). Read off a best line (SAN, from `fen`):
 * the side to move walks its king and, an odd number of plies later, the SAME
 * placement of every piece stands on the board with the OTHER side to move —
 * a tempo handed over. Only king moves on both sides in between, so the line
 * is the manoeuvre and nothing else. Null when the line shows no such loop.
 */
export function findTriangulation(fen: string, line: readonly string[]): { plies: number; squares: string[] } | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  const start = fen.split(' ')[0];
  const side = c.turn();
  const route: string[] = [];
  for (let i = 0; i < line.length && i < 11; i += 1) {
    let m;
    try { m = c.move(line[i]); } catch { return null; }
    if (m.piece !== 'k') return null;
    if (m.color === side) route.push(m.to);
    const n = i + 1;
    if (n % 2 === 1 && n >= 5 && c.fen().split(' ')[0] === start && c.turn() !== side) return { plies: n, squares: route };
  }
  return null;
}

/** The sentence, in demo voice (White/Black). */
export function triangulationSentence(side: string, other: string, t: { squares: string[] }): string {
  return `${side} to move — and ${side} would rather it were ${other}'s move. So ${side}'s king walks a triangle (${t.squares.join(', ')}) and comes back: the same position, but now ${other} has to move. That is triangulation — losing a tempo on purpose.`;
}
