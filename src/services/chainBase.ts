// chainBase — THE BASE OF A PAWN CHAIN, GUARDED OR HIT BY A PIECE (S4 pawns,
// Danya's speedruns: "f4 is the base of the chain; if it falls e3 follows, so
// guard it with …Bh6", "bad bishops defend good pawns"). A chain is held from
// its base: the pawn that guards the next one and that no pawn of its own
// guards. Lose it and the pawn it held has no pawn behind it. `pawnBreak`
// reads a PAWN striking the base; this reads a PIECE that comes to it:
//
//  - GUARDED: the move brings a piece to guard the mover's own base, which an
//    enemy piece attacks and which was lost by the count before the move and
//    is held after it (`legalSeeGainFor`).
//  - HIT: the move brings a piece to attack the opponent's base, which was
//    held before the move and is lost by the count after it.
//
// Both seats, said about the move just played. Silent when the base holds a
// pawn another pawn also guards — then the chain does not lean on it.
//
// PURE: chess.js + the SEE reader.
import { openSentence } from '../utils/openSentence';
import { seatPieceWords } from './pieceRef';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { squaresProof, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface ChainBaseRead {
  key: string;
  text: string;
  squares: string[];
  proof: Proof | null;
  /** The seat of the side that moved. */
  mine: boolean;
  act: 'guarded' | 'hit';
  /** The base won by the count after a hit, in pawns. */
  gain: number | null;
  /** A hit base with no guard at all (said "nothing guards it"). */
  loose: boolean;
}

const sqAt = (f: number, r: number): Square | null => (f < 0 || f > 7 || r < 1 || r > 8 ? null : (`${String.fromCharCode(97 + f)}${r}` as Square));

function isPawn(c: Chess, sq: Square | null, color: Color): boolean {
  if (!sq) return false;
  const p = c.get(sq);
  return !!p && p.type === 'p' && p.color === color;
}

/** The own pawns that guard `sq` (a pawn of `color` on it). */
function pawnGuards(c: Chess, sq: Square, color: Color): Square[] {
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]);
  const back = color === 'w' ? r - 1 : r + 1;
  return [sqAt(f - 1, back), sqAt(f + 1, back)].filter((x): x is Square => isPawn(c, x, color));
}

/** THE ONE DEFINITION OF A CHAIN'S BASE — the pawn of `color` on `sq` holds
 *  a pawn of its own and no pawn of its own holds it (`pawnBreak` reads it
 *  here for the pawn its break strikes). */
export function isChainBase(c: Chess, sq: Square, color: Color): boolean {
  if (!isPawn(c, sq, color) || pawnGuards(c, sq, color).length) return false;
  const f = sq.charCodeAt(0) - 97;
  const ahead = color === 'w' ? Number(sq[1]) + 1 : Number(sq[1]) - 1;
  return [sqAt(f - 1, ahead), sqAt(f + 1, ahead)].some((x) => isPawn(c, x, color));
}

/** The base on `sq` (`isChainBase`), with the pawns ahead of it whose only
 *  pawn guard it is. Null when it is no base, or holds no pawn alone. */
function baseOf(c: Chess, sq: Square, color: Color): Square[] | null {
  if (!isChainBase(c, sq, color)) return null;
  const f = sq.charCodeAt(0) - 97;
  const r = Number(sq[1]);
  const ahead = color === 'w' ? r + 1 : r - 1;
  const held = [sqAt(f - 1, ahead), sqAt(f + 1, ahead)].filter((x): x is Square => x !== null && isPawn(c, x, color) && pawnGuards(c, x, color).length === 1);
  return held.length ? held : null;
}

export function chainBase(fenBefore: string, san: string, mine: boolean): ChainBaseRead | null {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  let m;
  try { m = after.move(san); } catch { return null; }
  if (m.piece === 'p' || m.piece === 'k' || m.captured) return null;
  const me = m.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const afterFen = after.fen();
  const own = mine ? 'your' : 'their';
  const other = mine ? 'their' : 'your';
  const mover = seatPieceWords(afterFen, m.to, own, `${own} ${NAME[m.piece]} on ${m.to}`);
  const key = stemKeyOf(`${fenBefore}|${san}`);
  // The squares the moved piece reaches now and did not from where it stood.
  const reachesNow = (sq: Square, color: Color): boolean => after.attackers(sq, color).includes(m.to);
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.type !== 'p') continue;
    const sq = cell.square;
    if (cell.color === me) {
      // GUARDED: your piece comes to your own base.
      const held = baseOf(after, sq, me);
      if (!held || !reachesNow(sq, me) || before.attackers(sq, me).includes(m.from)) continue;
      if (after.attackers(sq, them).length === 0) continue;
      if (legalSeeGainFor(fenBefore, sq, them) < 1 || legalSeeGainFor(afterFen, sq, them) > 0) continue;
      const tip = held.join(' and ');
      const text = rotateStem([
        `${cap(mover)} now guards ${sq}, the base of ${own} pawn chain. ${sq} is the only pawn holding ${tip}, so without it, ${tip} has no pawn behind it.`,
        `${cap(mover)} covers ${sq}, the pawn at the base of ${own} chain. It is the only pawn holding ${tip}.`,
        `${cap(mover)} props up ${sq}, the base of ${own} pawn chain. Lose ${sq} and ${tip} has no pawn behind it.`,
      ], key);
      const squaresSaid = [m.to, sq, ...held];
      return { key: `chain-base:guard:${sq}`, text, squares: squaresSaid, proof: squaresProof(text, squaresSaid), mine, act: 'guarded', gain: null, loose: false };
    }
    // HIT: your piece comes to their base.
    const held = baseOf(after, sq, them);
    if (!held || !reachesNow(sq, me) || before.attackers(sq, me).includes(m.from)) continue;
    const gain = legalSeeGainFor(afterFen, sq, me);
    if (gain < 1 || legalSeeGainFor(fenBefore, sq, me) > 0) continue;
    const tip = held.join(' and ');
    // A base with no guard at all is "nothing guards it", never "short of
    // guards" (the speedrun replay 2026-11-17: "…and h6 is short of guards"
    // beside "nothing guards it" for the same pawn).
    const loose = after.attackers(sq, them).length === 0;
    const guards = loose ? 'nothing guards it' : 'it is short of guards';
    const text = rotateStem([
      `${cap(mover)} hits ${sq}, the base of ${other} pawn chain. ${sq} holds ${tip}, and right now ${guards}.`,
      `${cap(mover)} goes after ${sq}, the pawn at the base of ${other} chain. It holds ${tip}, and right now ${loose ? 'nothing guards it' : 'it has too few guards'}.`,
      `${cap(mover)} attacks ${sq}, the base of ${other} pawn chain. Without ${sq}, ${tip} has no pawn behind it, and ${loose ? `nothing guards ${sq}` : `${sq} is short of guards`}.`,
    ], key);
    const squaresSaid = [m.to, sq, ...held];
    return { key: `chain-base:hit:${sq}`, text, squares: squaresSaid, proof: squaresProof(text, squaresSaid), mine, act: 'hit', gain, loose };
  }
  return null;
}

function cap(s: string): string {
  return openSentence(s);
}
