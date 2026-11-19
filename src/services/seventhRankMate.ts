// seventhRankMate — TWO ROOKS ON THE SEVENTH THAT CANNOT MATE (Danya have-check, 2026-11-19).
//
// Danya (rooks-on-the-seventh-revisited#0): "with the eighth rank defended by
// an enemy rook or queen, two rooks on the seventh can almost never checkmate
// the king by themselves"; "as long as the king makes contact with one of the
// rooks, White will never be able to deliver checkmate on the eighth rank".
// The mating-square census: which squares a check could mate from, and what
// keeps each one from mating. The rooks on the seventh are a transitional
// advantage — to win material or trade, not to mate.
//
// The read, chess.js only (G0): one side has two rooks or queens on the other
// side's second rank, that king on its back rank, and no check of theirs
// mates (on the board as it is, or given the move). What keeps the mate away
// is named from the board: a rook or queen of the defender's on its back rank
// (it guards the eighth), and the king touching one of the attacking pieces.
// With the engine's lines handed in, said only where no line mates within
// three moves. Both seats.
import { Chess, type Color, type Square } from 'chess.js';
import { sideToMoveAs } from './threatOut';
import { type EngineLine, PIECE_NAME, other } from './engineLineRead';

export interface SeventhRankMate {
  /** The side with the pieces on the seventh. */
  attacker: Color;
  heavies: Square[];
  /** The defender's rook or queen on its back rank, when one guards it. */
  guard: Square | null;
  /** The attacking piece the defending king touches, when it does. */
  touched: Square | null;
  text: string;
  squares: Square[];
}

/** No check of `attacker`'s mates, on the board with `attacker` to move. */
function noMatingCheck(fen: string, attacker: Color): boolean {
  const asAttacker = sideToMoveAs(fen, attacker);
  if (!asAttacker) return false;
  try { return !new Chess(asAttacker).moves({ verbose: true }).some((m) => m.san.endsWith('#')); } catch { return false; }
}

const near = (a: string, b: string): boolean => Math.max(Math.abs(a.charCodeAt(0) - b.charCodeAt(0)), Math.abs(Number(a[1]) - Number(b[1]))) === 1;

export function seventhRankMate(fen: string, lines: readonly EngineLine[] | null, student: Color): SeventhRankMate | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const attacker of ['w', 'b'] as Color[]) {
    const defender = other(attacker);
    const seventh = attacker === 'w' ? '7' : '2';
    const back = attacker === 'w' ? '8' : '1';
    const king = c.findPiece({ type: 'k', color: defender })[0];
    if (!king || king[1] !== back) continue;
    const heavies = c.board().flat()
      .filter((p) => p && p.color === attacker && (p.type === 'r' || p.type === 'q') && p.square[1] === seventh)
      .map((p) => p!.square);
    if (heavies.length < 2) continue;
    if (!noMatingCheck(fen, attacker)) continue;
    const guard = c.board().flat().find((p) => p && p.color === defender && (p.type === 'r' || p.type === 'q') && p.square[1] === back)?.square ?? null;
    const touched = heavies.find((h) => near(h, king)) ?? null;
    if (!guard && !touched) continue;
    // The engine has the last word: a mate it finds within three moves is the
    // other lesson.
    if (lines?.some((l) => l.mate != null && (attacker === 'w' ? l.mate > 0 : l.mate < 0) && Math.abs(l.mate) <= 3)) continue;
    const mine = attacker === student;
    const rank = defender === 'w' ? 'first' : 'eighth';
    const two = heavies.length === 2 && heavies.every((h) => c.get(h)?.type === 'r') ? 'Two rooks' : 'Heavy pieces';
    const whose = (s: Square, of: Color): string => `${of === student ? 'your' : 'their'} ${PIECE_NAME[c.get(s)?.type ?? 'p']} on ${s}`;
    const reasons: string[] = [];
    if (guard) reasons.push(`${whose(guard, defender)} guards the back rank`);
    if (touched) reasons.push(`${defender === student ? 'your' : 'their'} king on ${king} keeps touching ${whose(touched, attacker)}`);
    const why = reasons.join(', and ');
    const text = mine
      ? `${two} on the seventh don't mate by themselves here: no check mates while ${why}. Use them to win material or bring another piece in.`
      : `${two} on your second rank can't mate on their own: no check of theirs mates while ${why}. Keep it that way: the ${rank} rank guarded and your king next to a rook.`;
    return { attacker, heavies, guard, touched, text, squares: [king as Square, ...heavies, ...(guard ? [guard] : [])] };
  }
  return null;
}
