// pawnCentre — WHO OWNS THE CENTRE WITH PAWNS (Danya have-check, 2026-11-19).
//
// Danya names a pawn centre as a standing fact of the position: "Black has
// built an impressive pawn center" (Carlsen–Anand, Black's d5 and e5), "White
// has a menacing pawn centre" (his own game, White's d4 with e3-e4 coming). No
// computer said it: the structure reads name chains, holes and breaks, never
// the plain fact that one side's pawns stand in the centre and the other side
// has nothing there to contest them.
//
// The read, chess.js only:
//   - a side's CENTRE PAWNS are its pawns on d- and e-file squares of its own
//     fourth rank (d4/e4 for White, d5/e5 for Black);
//   - a pawn on its third rank behind an EMPTY centre square JOINS the centre
//     when that push is not met by an enemy pawn capture (e3 behind e4);
//   - the side has a pawn centre when it has one centre pawn and at least two
//     with the joiners, and the other side has NO pawn on d4, e4, d5 or e5.
// WHY it matters is computed too: the squares those pawns take from the other
// side's pieces (their diagonal captures into the enemy half).
//
// Measured over the 209 Danya boards: it fires on 6 (2 of the 5 boards where he
// speaks of the centre; the other 4 are boards where one side's d/e duo stands
// unopposed). The three centre ideas it misses are about PIECES on central
// squares, which this read deliberately does not claim.
import { Chess, type Color, type Square } from 'chess.js';
import { andList } from '../utils/andList';

export interface PawnCentre {
  side: Color;
  /** The side's pawns standing on its fourth-rank centre squares. */
  pawns: Square[];
  /** Third-rank pawns that can push safely into the centre. */
  joins: Square[];
  /** Squares in the enemy half the centre pawns cover (taken from their pieces). */
  takes: Square[];
  text: string;
  squares: Square[];
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

function pawnOf(c: Chess, sq: string, col: Color): boolean {
  const p = c.get(sq as Square);
  return !!p && p.type === 'p' && p.color === col;
}

function pawnHits(c: Chess, sq: string, by: Color): boolean {
  return c.attackers(sq as Square, by).some((a) => c.get(a)?.type === 'p');
}

function pawnCaptureSquares(sq: Square, col: Color): Square[] {
  const f = sq.charCodeAt(0);
  const r = Number(sq[1]) + (col === 'w' ? 1 : -1);
  const out: Square[] = [];
  for (const df of [-1, 1]) {
    const ff = f + df;
    if (ff >= 97 && ff <= 104 && r >= 1 && r <= 8) out.push(`${String.fromCharCode(ff)}${r}` as Square);
  }
  return out;
}

function centreOf(c: Chess, col: Color): { pawns: Square[]; joins: Square[] } {
  const r4 = col === 'w' ? 4 : 5;
  const r3 = col === 'w' ? 3 : 6;
  const pawns = (['d', 'e'] as const).map((f) => `${f}${r4}` as Square).filter((s) => pawnOf(c, s, col));
  const joins = (['d', 'e'] as const)
    .filter((f) => !c.get(`${f}${r4}` as Square) && pawnOf(c, `${f}${r3}`, col) && !pawnHits(c, `${f}${r4}`, other(col)))
    .map((f) => `${f}${r3}` as Square);
  return { pawns, joins };
}

/** The pawn centre one side owns unopposed, or null. `student` decides "you" / "they". */
export function pawnCentre(fen: string, student: Color): PawnCentre | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  for (const side of ['w', 'b'] as Color[]) {
    const { pawns, joins } = centreOf(c, side);
    if (pawns.length < 1 || pawns.length + joins.length < 2) continue;
    if ((['d4', 'e4', 'd5', 'e5'] as Square[]).some((s) => pawnOf(c, s, other(side)))) continue;
    const takes = [...new Set(pawns.flatMap((p) => pawnCaptureSquares(p, side)))].sort();
    const mine = side === student;
    // One perspective (CLAUDE.md): the opponent is "their", never a colour.
    const owner = mine ? 'Your' : 'Their';
    const foe = mine ? 'They have' : 'You have';
    const pawnWord = pawns.length === 1 ? `pawn on ${pawns[0]}` : `pawns on ${andList(pawns)}`;
    const joinClause = joins.length
      ? `, and ${andList(joins.map((j) => `the pawn on ${j}`))} can step up beside it`
      : '';
    const text = `${owner} ${pawnWord} ${pawns.length === 1 ? 'holds' : 'hold'} the centre${joinClause}. ${foe} no centre pawn to challenge ${pawns.length === 1 ? 'it' : 'them'}, and ${pawns.length === 1 ? 'it takes' : 'they take'} ${andList(takes)} away from ${mine ? 'their' : 'your'} pieces.`;
    return { side, pawns, joins, takes, text, squares: [...pawns, ...joins] };
  }
  return null;
}
