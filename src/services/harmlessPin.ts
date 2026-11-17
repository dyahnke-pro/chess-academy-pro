// harmlessPin — RATE A PIN IN TWO CHECKS (Danya speedrun 1Rejj 7.Bb5: "Rate a
// pin in two checks: is the pinned piece pawn-guarded, and will the pin end
// soon (castling)? Then harmless." — and the same idea against Bg5 and Bb5 in
// S-ZY, J4Wz, bRMH, BGTB: "…Be7 just unpins", "…Bd7 unpins it").
//
// The move just played pins a piece to its king or queen. The pin is harmless
// when both checks pass on the board and in the engine's own line:
//   1. a pawn of its side guards the pinned piece, and
//   2. the engine's line after the move ends the pin with one of the pinned
//      side's first two moves (castling, a piece put in between, a pawn kick
//      of the pinner, the king or queen stepping off the line), while the
//      pinner's side never takes the pinned piece first.
// PURE: chess.js and the engine line the surface hands in.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { PIECE_NAMES } from '../types/tacticTypes';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const NAME = PIECE_NAMES as Readonly<Record<PieceSymbol, string>>;

export interface HarmlessPin {
  /** The pinner, after the move. */
  pinner: { square: Square; piece: PieceSymbol };
  /** The pinned piece and what it is pinned to. */
  pinned: { square: Square; piece: PieceSymbol };
  target: { square: Square; piece: 'k' | 'q' };
  /** The pawn that guards the pinned piece. */
  guard: Square;
  /** How the engine's line ends it: castling, a piece put between, the pinner
   *  kicked by a pawn, or the target stepping off the line. */
  end: { how: 'castles' | 'blocks' | 'kicks' | 'steps'; san: string; square: Square };
  /** The pinner's colour — the side whose move made the pin. */
  pinnerColor: Color;
  key: string;
}

const STEP: Record<PieceSymbol, ReadonlyArray<readonly [number, number]>> = {
  b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
  n: [], p: [], k: [],
};

function sq(f: number, r: number): Square | null {
  return f >= 0 && f < 8 && r >= 0 && r < 8 ? (`${'abcdefgh'[f]}${r + 1}` as Square) : null;
}

/** The pins the piece on `from` makes on `c`: the first piece on a ray is the
 *  other side's non-king, and the next is its king or queen (worth more than
 *  the pinned piece). */
function pinsFrom(c: Chess, from: Square): Array<{ pinned: Square; target: Square; dir: readonly [number, number] }> {
  const p = c.get(from);
  if (!p) return [];
  const out: Array<{ pinned: Square; target: Square; dir: readonly [number, number] }> = [];
  for (const dir of STEP[p.type]) {
    let f = from.charCodeAt(0) - 97;
    let r = Number(from[1]) - 1;
    let first: Square | null = null;
    for (;;) {
      f += dir[0]; r += dir[1];
      const s = sq(f, r);
      if (!s) break;
      const q = c.get(s);
      if (!q) continue;
      if (!first) {
        if (q.color === p.color || q.type === 'k' || q.type === 'q') break;
        first = s;
        continue;
      }
      if (q.color !== p.color && (q.type === 'k' || q.type === 'q') && q.type !== c.get(first)?.type) out.push({ pinned: first, target: s, dir });
      break;
    }
  }
  return out;
}

/** Does the pin still stand on `c`: the same pinner, pinned piece and target
 *  on the same line, nothing between? */
function pinStands(c: Chess, pinner: Square, pinnedSq: Square, target: Square, pinnedType: PieceSymbol, targetType: PieceSymbol): boolean {
  const pp = c.get(pinner);
  const x = c.get(pinnedSq);
  const t = c.get(target);
  if (!pp || !x || !t || x.type !== pinnedType || t.type !== targetType) return false;
  return pinsFrom(c, pinner).some((p) => p.pinned === pinnedSq && p.target === target);
}

/** A pawn of the pinned side that guards `square` on `c`. */
function pawnGuard(c: Chess, square: Square, side: Color): Square | null {
  for (const a of c.attackers(square, side)) if (c.get(a)?.type === 'p') return a;
  return null;
}

/**
 * The harmless pin the move `san` on `fenBefore` made, read against `line` —
 * the engine's line from the board after the move (UCI, the pinned side's
 * reply first). Null when the move pins nothing new, the pinned piece has no
 * pawn guard, or the line does not end the pin within two of their moves.
 */
export function harmlessPin(fenBefore: string, san: string, line: readonly string[]): HarmlessPin | null {
  if (line.length < 1) return null;
  let c: Chess;
  let mv;
  try { c = new Chess(fenBefore); mv = c.move(san); } catch { return null; }
  if (mv.captured || c.inCheck()) return null;
  const before = new Chess(fenBefore);
  const pins = pinsFrom(c, mv.to).filter((p) => !pinsFrom(before, mv.from).some((q) => q.pinned === p.pinned && q.target === p.target));
  for (const pin of pins) {
    const pinned = c.get(pin.pinned);
    const target = c.get(pin.target);
    if (!pinned || !target || pinned.type === 'p') continue;
    const side = pinned.color;
    const guard = pawnGuard(c, pin.pinned, side);
    if (!guard) continue;
    const walk = new Chess(c.fen());
    let theirMoves = 0;
    let end: HarmlessPin['end'] | null = null;
    let kick: HarmlessPin['end'] | null = null;
    for (const u of line) {
      let m;
      try { m = walk.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch { break; }
      const stands = pinStands(walk, mv.to, pin.pinned, pin.target, pinned.type, target.type);
      if (m.color !== side) {
        // A pawn kicked the pinner and it stepped away (not taking the pinned
        // piece): the kick ended the pin. Any other end by the pinner's side —
        // the pin cashed in, the pinner moved on its own — is not this read.
        if (kick && !stands && !(m.from === mv.to && m.to === pin.pinned)) end = kick;
        if (!stands || kick) break;
        continue;
      }
      theirMoves += 1;
      if (!stands) {
        if (m.captured) break;
        const how: HarmlessPin['end']['how'] = m.san.startsWith('O-O') ? 'castles'
          : m.from === pin.target ? 'steps' : 'blocks';
        end = { how, san: m.san, square: m.to };
        break;
      }
      if (m.piece === 'p' && !m.captured && walk.attackers(mv.to, side).includes(m.to)) kick = { how: 'kicks', san: m.san, square: m.to };
      else if (theirMoves >= 2) break;
    }
    if (!end) continue;
    return {
      pinner: { square: mv.to, piece: mv.piece },
      pinned: { square: pin.pinned, piece: pinned.type },
      target: { square: pin.target, piece: target.type as 'k' | 'q' },
      guard,
      end,
      pinnerColor: mv.color,
      key: `harmless-pin:${mv.to}${pin.pinned}`,
    };
  }
  return null;
}

/** THE LINE, from the student's seat: the pin the opponent made on the
 *  student's piece ("Their bishop on b5 pins your knight…"), or the student's
 *  own ("Your bishop on b5 pins their knight…"). Rotated on the board. */
export function harmlessPinLine(h: HarmlessPin, pinnerIsStudent: boolean, fenAfter: string): string {
  const pinnerOwn = pinnerIsStudent ? 'your' : 'their';
  const pinnedOwn = pinnerIsStudent ? 'their' : 'your';
  const target = h.target.piece === 'k' ? 'king' : 'queen';
  const p = NAME[h.pinned.piece];
  const ends = h.end.how === 'castles' ? 'castling ends it'
    : h.end.how === 'kicks' ? `${h.end.san} kicks the ${NAME[h.pinner.piece]} away`
    : h.end.how === 'steps' ? `${h.end.san} steps the ${target} off the line`
    : `${h.end.san} puts a piece in between`;
  const lead = `${cap(pinnerOwn)} ${NAME[h.pinner.piece]} on ${h.pinner.square} pins ${pinnedOwn} ${p} on ${h.pinned.square} to the ${target}`;
  const verdict = pinnerIsStudent ? 'the pin won\'t last' : 'the pin is harmless';
  return rotateStem([
    `${lead}, but ${verdict}. The pawn on ${h.guard} guards the ${p}, and ${ends}.`,
    `${lead}. Rate it in two checks: the pawn on ${h.guard} guards the ${p}, and ${ends}. So ${verdict}.`,
    `${lead}, but ${verdict}: the ${p} is guarded by the pawn on ${h.guard}, and ${ends}.`,
  ], stemKeyOf(fenAfter));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
