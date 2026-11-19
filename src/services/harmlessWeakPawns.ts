// harmlessWeakPawns — "PIECE PLACEMENT TRUMPS PAWN STRUCTURE" (Danya have-check, 2026-11-19).
//
// Danya, Anand–Ivanchuk: "Black's 'weak' pawns are safely defended by the e7
// bishop and do not change the evaluation of the position", and "piece
// placement often trumps pawn structure". The structure reads name every
// doubled, isolated and backward pawn as a weakness; `canBeAimedAt` already
// keeps quiet about one nothing can reach. Nothing said the positive half — the
// damage is real on paper and does not matter on THIS board — so the student
// learns to count a bent structure as a loss when it is not.
//
// The read, chess.js and the engine line the caller holds:
//   - a side's weak pawns (`findWeakPawns`: doubled, isolated, backward);
//   - HARMLESS when no enemy piece attacks it now or can aim at it in one quiet
//     move (`canBeAimedAt`), and a piece of its own side guards it;
//   - said only when a DOUBLED pair (the damage that is seen) is held, and the
//     engine does not have that side worse (≥ -HARMLESS_FLOOR_CP for it): the
//     board itself proves the structure is not costing anything.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { canBeAimedAt, findWeakPawns } from './positionReadingService';
import { seatCp } from './winChance';
import { andList } from '../utils/andList';

/** The side with the bent structure may be at most this much worse for the structure to "not matter". */
export const HARMLESS_FLOOR_CP = 50;

export interface HarmlessWeakPawns {
  side: Color;
  pawns: { square: Square; why: 'doubled' | 'isolated' | 'backward'; guard: Square; guardPiece: PieceSymbol }[];
  text: string;
  squares: Square[];
}

const NAME: Record<PieceSymbol, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

/** The side whose weak pawns are held and cost nothing on the engine's own read, or null. */
export function harmlessWeakPawns(fen: string, student: Color, best: { cp: number | null; mate: number | null } | null): HarmlessWeakPawns | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (!best) return null;
  for (const side of ['w', 'b'] as Color[]) {
    if (seatCp({ evaluation: best.cp ?? 0, mate: best.mate }, side) < -HARMLESS_FLOOR_CP) continue;
    const weak = findWeakPawns(fen, side);
    const tagged = new Map<Square, 'doubled' | 'isolated' | 'backward'>();
    for (const s of weak.doubled) tagged.set(s, 'doubled');
    for (const s of weak.isolated) if (!tagged.has(s)) tagged.set(s, 'isolated');
    for (const s of weak.backward) if (!tagged.has(s)) tagged.set(s, 'backward');
    const held: HarmlessWeakPawns['pawns'] = [];
    for (const [square, why] of tagged) {
      // A lone rim pawn is "isolated" on every board; it is not the bent structure this is about.
      if (why !== 'doubled' && (square[0] === 'a' || square[0] === 'h')) continue;
      if (canBeAimedAt(fen, square, other(side))) continue;
      const guard = c.attackers(square, side).find((a) => { const t = c.get(a)?.type; return !!t && t !== 'p' && t !== 'k'; });
      if (!guard) continue;
      const g = c.get(guard);
      if (!g) continue;
      held.push({ square, why, guard, guardPiece: g.type });
    }
    // The visible damage is a doubled pair: both pawns of it held.
    if (held.filter((h) => h.why === 'doubled').length < 2) continue;
    const mine = side === student;
    const guards = [...new Map(held.map((h) => [h.guard, h])).values()];
    const guardText = andList(guards.map((h) => `the ${NAME[h.guardPiece]} on ${h.guard}`));
    const kinds = [...new Set(held.map((h) => h.why))];
    const text = `${mine ? 'Your' : 'Their'} ${andList(kinds)} pawns on ${andList(held.map((h) => h.square))} look weak, but ${guardText} ${guards.length === 1 ? 'guards' : 'guard'} them and none of ${mine ? 'their' : 'your'} pieces can get at them — the structure costs ${mine ? 'you' : 'them'} nothing here.`;
    return { side, pawns: held, text, squares: [...held.map((h) => h.square), ...guards.map((h) => h.guard)] };
  }
  return null;
}
