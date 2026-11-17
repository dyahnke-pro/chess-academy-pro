// pinnedPawnGuard — A GUARD THAT CAN'T TAKE BACK (S4 pawns, Danya's
// speedruns: "f7 is pinned to the king, so e6 is weak; Rc6 threatens Rxe6+").
// A pawn pinned to its own king guards nothing off the pin's line: taking
// back would expose the king, so it is illegal. The square it seems to hold
// is held only by the pieces.
//
// Read on the move just played, both seats: the moved piece now attacks a
// square holding a piece or pawn of the other side, that square's guard is
// one of their pawns pinned to their king (the square off the pin's line),
// and the square is lost by the count (`legalSeeGainFor`, which plays only
// legal recaptures). Silent when the square would be lost anyway with the
// pawn free to take back — then the pin is not the reason.
//
// PURE: chess.js + the SEE reader.
import { seatPieceWords } from './pieceRef';
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { squaresProof, type Proof } from './proof';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

export interface PinnedPawnGuardRead {
  key: string;
  text: string;
  squares: string[];
  proof: Proof | null;
  /** The seat of the side that moved. */
  mine: boolean;
  /** The square's worth won by the count, in pawns. */
  gain: number;
}

/** The squares a pawn of `color` on `sq` captures on. */
function captureSquares(sq: Square, color: Color): Square[] {
  const f = sq.charCodeAt(0);
  const r = Number(sq[1]) + (color === 'w' ? 1 : -1);
  if (r < 1 || r > 8) return [];
  return [f - 1, f + 1].filter((x) => x >= 97 && x <= 104).map((x) => `${String.fromCharCode(x)}${r}` as Square);
}

function kingOf(c: Chess, color: Color): Square | null {
  for (const row of c.board()) for (const p of row) if (p && p.type === 'k' && p.color === color) return p.square;
  return null;
}

/** The piece of `by` that pins the pawn on `sq` to its king, or null: with
 *  the pawn gone, that piece would give check along the line through `sq`. */
function pinnerOf(c: Chess, sq: Square, by: Color): Square | null {
  const owner: Color = by === 'w' ? 'b' : 'w';
  const king = kingOf(c, owner);
  if (!king) return null;
  const probe = new Chess(c.fen());
  probe.remove(sq);
  const checkers = probe.attackers(king, by).filter((a) => !c.attackers(king, by).includes(a));
  for (const a of checkers) {
    const t = c.get(a)?.type;
    if (t !== 'b' && t !== 'r' && t !== 'q') continue;
    if (onSegment(a, king, sq)) return a;
  }
  return null;
}

function onSegment(a: string, b: string, x: string): boolean {
  const [af, ar, bf, br, xf, xr] = [a.charCodeAt(0), Number(a[1]), b.charCodeAt(0), Number(b[1]), x.charCodeAt(0), Number(x[1])];
  const df = Math.sign(bf - af);
  const dr = Math.sign(br - ar);
  for (let f = af + df, r = ar + dr; f !== bf || r !== br; f += df, r += dr) if (f === xf && r === xr) return true;
  return false;
}

export function pinnedPawnGuard(fenBefore: string, san: string, mine: boolean): PinnedPawnGuardRead | null {
  let before: Chess;
  let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  let m;
  try { m = after.move(san); } catch { return null; }
  if (after.inCheck()) return null;
  const me = m.color;
  const them: Color = me === 'w' ? 'b' : 'w';
  const afterFen = after.fen();
  for (const row of after.board()) for (const cell of row) {
    if (!cell || cell.type !== 'p' || cell.color !== them) continue;
    const pinner = pinnerOf(after, cell.square, me);
    if (!pinner) continue;
    for (const target of captureSquares(cell.square, them)) {
      const t = after.get(target);
      if (!t || t.color !== them || t.type === 'k') continue;
      // The moved piece hits it now, and did not from where it stood.
      if (!after.attackers(target, me).includes(m.to) || before.attackers(target, me).includes(m.from)) continue;
      // The pinner off the square, so taking it away below changes only the pin.
      if (after.attackers(target, me).includes(pinner)) continue;
      const gain = legalSeeGainFor(afterFen, target, me);
      if (gain < 1) continue;
      // Free to take back, the pawn would hold it: the pin is the reason.
      const unpinned = new Chess(afterFen);
      unpinned.remove(pinner);
      if (legalSeeGainFor(unpinned.fen(), target, me) >= gain) continue;
      const own = mine ? 'your' : 'their';
      const other = mine ? 'their' : 'your';
      // The square only when another of its kind could be meant ("their
      // g-pawn" right after "g4 is a pawn break" says the square once).
      const piece = seatPieceWords(afterFen, m.to, own, `${own} ${NAME[m.piece]} on ${m.to}`);
      const what = `${other} ${NAME[t.type]} on ${target}`;
      // The pin is said with what pins it: the board lights the pinner, so the
      // words name it (the marks sweep 2026-11-17: c4 lit, never said).
      const pinnerWords = seatPieceWords(afterFen, pinner, own, `${own} ${NAME[after.get(pinner)?.type ?? 'b']} on ${pinner}`);
      const text = rotateStem([
        `${cap(piece)} hits ${what}. The ${cell.square} pawn guards it, but ${pinnerWords} pins it to the king, so it can't take back.`,
        `${cap(pinnerWords)} pins ${other} pawn on ${cell.square} to the king, so it doesn't really guard ${target}. ${cap(piece)} goes after ${what}.`,
        `${cap(piece)} attacks ${what}. Its pawn guard on ${cell.square} is pinned to the king by ${pinnerWords}, and a pinned pawn can't recapture.`,
      ], stemKeyOf(`${fenBefore}|${san}`));
      const squaresSaid = [m.to, target, cell.square, pinner];
      return { key: `pinned-guard:${cell.square}:${target}`, text, squares: squaresSaid, proof: squaresProof(text, squaresSaid), mine, gain };
    }
  }
  return null;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
