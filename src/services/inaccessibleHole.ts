// inaccessibleHole — "WEAK SQUARES, WHO CARES?" (Danya have-check, 2026-11-19).
//
// Danya: "inaccessibility refers to the idea that a square can often be
// permanently weakened if your opponent cannot immediately access it with a
// desirable piece … if a square is inaccessible, do not be afraid to weaken
// it!" His example, 27.f4: it leaves e4 horribly weak, "but to actually
// maneuver his knight to e4, Black needs a staggering eight moves", and f4
// stops …e5. The app said the opposite direction only (`holeAccess`: "their
// knight gets there in two") and stayed silent when the hole cannot be reached.
//
// The read, chess.js only, on the board after YOUR pawn move:
//   - the HOLE: a square on a file next to the pawn's, on your third to fifth
//     rank, that one of your pawns could still cover before the move and none
//     can after (`noPawnCanChallenge`), not occupied by an enemy piece;
//   - the REACH: the fewest moves any enemy knight or bishop needs to land on
//     it, walking only through empty squares none of your pawns attack (their
//     own pieces stand where they stand — moving them first costs moves too);
//   - INACCESSIBLE when that is at least INACCESSIBLE_MOVES or no road is open
//     now (they must have a minor piece; a hole in a rook ending teaches nothing);
//     only central holes (c- to f-file) are read. Then the WHY of the move is
//     read too: the enemy pawn pushes it now covers with more of your pawns than
//     theirs ("it stops their e-pawn reaching e5").
//   Fires on 2/2 of Danya's inaccessibility boards, 11/207 elsewhere (each
//   board's engine best move).
//
// Measured over the 209 Danya boards (every board's engine best): see the
// fire-rate script `scripts/danya/fire-rates.ts`.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { noPawnCanChallenge } from './outpost';
import { andList, countWord } from '../utils/andList';

/** A hole their minor pieces need at least this many moves to reach is not a weakness yet. */
export const INACCESSIBLE_MOVES = 4;

export interface InaccessibleHole {
  hole: Square;
  /** Fewest moves for any enemy knight or bishop; null when none has a road through the squares open now. */
  moves: number | null;
  /** The enemy pawn pushes the move now stops (the square each pawn wanted). */
  stops: { pawn: Square; to: Square }[];
  text: string;
  squares: Square[];
}

const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
const KNIGHT: readonly [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const DIAG: readonly [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

function sq(f: number, r: number): Square | null {
  return f >= 0 && f < 8 && r >= 1 && r <= 8 ? (`${String.fromCharCode(97 + f)}${r}` as Square) : null;
}

function pawnAttacked(c: Chess, s: Square, by: Color): boolean {
  return pawnHits(c, s, by) > 0;
}

function pawnHits(c: Chess, s: Square, by: Color): number {
  return c.attackers(s, by).filter((a) => c.get(a)?.type === 'p').length;
}

/** The fewest moves a piece needs from `from` to `to`, landing only on empty squares the `guard` pawns do not attack. */
function reach(c: Chess, from: Square, to: Square, type: PieceSymbol, guard: Color): number | null {
  const ok = (s: Square): boolean => !c.get(s) && !pawnAttacked(c, s, guard);
  if (!ok(to)) return null;
  const seen = new Set<string>([from]);
  let frontier: Square[] = [from];
  for (let depth = 1; depth <= 10 && frontier.length; depth++) {
    const next: Square[] = [];
    for (const s of frontier) {
      const f = s.charCodeAt(0) - 97;
      const r = Number(s[1]);
      const steps: Square[] = [];
      if (type === 'n') {
        for (const [df, dr] of KNIGHT) { const t = sq(f + df, r + dr); if (t) steps.push(t); }
      } else {
        for (const [df, dr] of DIAG) {
          for (let k = 1; k < 8; k++) {
            const t = sq(f + df * k, r + dr * k);
            if (!t || c.get(t)) break;
            steps.push(t);
          }
        }
      }
      for (const t of steps) {
        if (seen.has(t) || !ok(t)) continue;
        if (t === to) return depth;
        seen.add(t);
        next.push(t);
      }
    }
    frontier = next;
  }
  return null;
}

/** The pawn move's hole that their minor pieces cannot reach soon, or null. */
export function inaccessibleHole(fenBefore: string, san: string, student: Color): InaccessibleHole | null {
  let before: Chess; let after: Chess;
  try { before = new Chess(fenBefore); after = new Chess(fenBefore); } catch { return null; }
  let m;
  try { m = after.move(san); } catch { return null; }
  if (m.piece !== 'p' || m.captured) return null;
  const me = m.color;
  const them = other(me);
  const f = m.from.charCodeAt(0) - 97;
  for (const df of [-1, 1]) {
    for (const rel of [3, 4, 5]) {
      const hole = sq(f + df, me === 'w' ? rel : 9 - rel);
      // A central square (c- to f-file) is the hole a piece wants; a hole on the rim is rarely the point.
      if (!hole || !'cdef'.includes(hole[0])) continue;
      const occupant = after.get(hole);
      if (occupant && occupant.color === them) continue;
      // Their own pawn standing there is no empty square to land on: what the
      // push weakened is that pawn, which no pawn can guard now (gotham-jelena
      // c4: "leaves d4 weak" with the d-pawn on d4) — a different claim.
      if (occupant && occupant.type === 'p') continue;
      if (noPawnCanChallenge(before, hole, them) || !noPawnCanChallenge(after, hole, them)) continue;
      // Their minors' fastest road in.
      let best: number | null = null;
      let minors = 0;
      for (const row of after.board()) {
        for (const p of row) {
          if (!p || p.color !== them || (p.type !== 'n' && p.type !== 'b')) continue;
          minors++;
          const n = reach(after, p.square, hole, p.type, me);
          if (n !== null && (best === null || n < best)) best = n;
        }
      }
      // No minor at all is no lesson (an ending of rooks has no use for a hole).
      if (minors === 0 || (best !== null && best < INACCESSIBLE_MOVES)) continue;
      // What the move bought: their pawn pushes it now covers.
      const stops: { pawn: Square; to: Square }[] = [];
      for (const row of after.board()) {
        for (const p of row) {
          if (!p || p.type !== 'p' || p.color !== them) continue;
          const to = sq(p.square.charCodeAt(0) - 97, Number(p.square[1]) + (them === 'w' ? 1 : -1));
          if (!to || after.get(to)) continue;
          const hitsAfter = pawnHits(after, to, me);
          if (hitsAfter > pawnHits(before, to, me) && hitsAfter > pawnHits(after, to, them)) stops.push({ pawn: p.square, to });
        }
      }
      const mine = me === student;
      const whose = mine ? 'your' : 'their';
      const foe = mine ? 'their' : 'your';
      const reachText = best === null
        ? `no knight or bishop of ${foe === 'their' ? 'theirs' : 'yours'} can reach it yet`
        : `${foe} nearest knight or bishop is ${countWord(best)} moves away`;
      const stopText = stops.length
        ? `. In return it stops ${andList(stops.map((s) => `${foe} ${s.pawn[0]}-pawn reaching ${s.to}`))}`
        : '';
      // One sentence (a say-once that kept half would leave a bare weakness):
      // the square, and why it does not matter yet.
      const text = `${mine ? 'Your' : 'Their'} pawn move leaves a weak square on ${hole} in ${whose} camp, but ${reachText}, so it does not matter${stopText}.`;
      return { hole, moves: best, stops, text, squares: [hole, m.to, ...stops.map((s) => s.to)] };
    }
  }
  return null;
}
