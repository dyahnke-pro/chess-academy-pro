/**
 * pinGeometry — the one test that makes a pin a pin.
 *
 * 🔒 A PIECE THAT CANNOT LEAVE THE LINE IS NOT PINNED (found reading the tape
 * of a real game on prod, 2026-09-17). The live coach said, at ply 15 of a
 * Scandinavian:
 *
 *     "Watch out — rook on h1 pins pawn on h7 against rook on h8."
 *
 * There is no pin there. A pawn on h7 pushes to h6 and h5 — both still on the
 * h-file — so nothing behind it is ever exposed, and the rook on h8 is in no
 * danger at all. Worse, that sentence was spoken as the headline WARNING while
 * the student's own genuine pin (a bishop on g4 freezing the knight on f3
 * against the queen on d1) was demoted to "a pin of your own here — a
 * different one."
 *
 * Two detectors made the same mistake independently (`tacticsDetector.findPins`
 * and `tacticClassifier.detectPin`), because both tested only GEOMETRY (three
 * pieces on a ray) and VALUE (the piece behind is worth more). Neither tested
 * the clause that the concept engine's own invariant states out loud:
 *
 *     "a pin freezes the piece in front: it can't move without exposing what
 *      is behind it"
 *
 * If the piece in front has no move that leaves the line, there is nothing to
 * expose and nothing to freeze. So the invariant IS the test, and it lives
 * here once rather than being re-derived — or re-forgotten — per detector.
 *
 * The move generation is deliberately PSEUDO-LEGAL: self-check is ignored on
 * purpose. A piece pinned against its own king has no LEGAL move off the ray,
 * and asking chess.js for legal moves would therefore report every king-pin as
 * "cannot leave" — exactly backwards. What we are asking is geometric: is
 * there a square off this line that this piece, on this board, could move to.
 */
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';

type Vec = readonly [number, number];

const BISHOP: Vec[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK: Vec[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const KNIGHT: Vec[] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

const coords = (sq: Square): [number, number] => [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
const square = (f: number, r: number): Square | null =>
  (f < 0 || f > 7 || r < 0 || r > 7 ? null : (`${String.fromCharCode(97 + f)}${r + 1}` as Square));

/** True when `sq` lies on the infinite line through `from` in direction `dir`. */
function onLine(from: Square, dir: Vec, sq: Square): boolean {
  const [f0, r0] = coords(from);
  const [f1, r1] = coords(sq);
  return (f1 - f0) * dir[1] - (r1 - r0) * dir[0] === 0;
}

/**
 * Can the piece on `pinned` move to any square that is NOT on the line running
 * through it in direction `dir`?
 *
 * `dir` is the ray from the attacker through the pinned piece; the line it
 * defines is the pin line. Occupancy is respected (a pawn only captures where
 * there is something to capture, a rook stops at the first piece) so a pawn
 * pinned along its own file correctly reports false. Own-king exposure is NOT
 * respected — see the note above.
 */
export function canLeaveLine(chess: Chess, pinned: Square, dir: Vec): boolean {
  const piece = chess.get(pinned);
  if (!piece) return false;
  const [f, r] = coords(pinned);
  const mine = piece.color;

  const reachable = (sq: Square | null): boolean => {
    if (!sq) return false;
    const at = chess.get(sq);
    return !at || at.color !== mine;
  };
  const escapes = (sq: Square | null): boolean => !!sq && reachable(sq) && !onLine(pinned, dir, sq);

  if (piece.type === 'n') return KNIGHT.some(([df, dr]) => escapes(square(f + df, r + dr)));
  if (piece.type === 'k') return [...BISHOP, ...ROOK].some(([df, dr]) => escapes(square(f + df, r + dr)));
  if (piece.type === 'p') {
    const step = mine === 'w' ? 1 : -1;
    const one = square(f, r + step);
    // A push is only available onto an EMPTY square, and both pushes stay on
    // the file — which is the whole reason the h7 pawn above was not pinned.
    if (one && !chess.get(one) && !onLine(pinned, dir, one)) return true;
    const start = mine === 'w' ? 1 : 6;
    const two = square(f, r + step * 2);
    if (r === start && one && !chess.get(one) && two && !chess.get(two) && !onLine(pinned, dir, two)) return true;
    // Captures need something to capture. En passant is ignored: it cannot be
    // the only escape a teaching claim rests on, and reading the ep square here
    // would couple this geometry to move history for no pedagogical gain.
    return [-1, 1].some((df) => {
      const sq = square(f + df, r + step);
      const at = sq ? chess.get(sq) : null;
      return !!sq && !!at && at.color !== mine && !onLine(pinned, dir, sq);
    });
  }

  const dirs: Vec[] = piece.type === 'b' ? BISHOP : piece.type === 'r' ? ROOK : [...BISHOP, ...ROOK];
  for (const [df, dr] of dirs) {
    let ff = f + df;
    let rr = r + dr;
    while (true) {
      const sq = square(ff, rr);
      if (!sq) break;
      const at = chess.get(sq);
      if (at && at.color === mine) break;
      if (!onLine(pinned, dir, sq)) return true;
      if (at) break;
      ff += df;
      rr += dr;
    }
  }
  return false;
}

/**
 * The full pin test, shared by every detector: three pieces on a ray, the one
 * behind worth more, and the one in front able to leave the line.
 */
export function isRealPin(args: {
  chess: Chess;
  /** Direction from the attacker through the pinned piece. */
  dir: Vec;
  pinned: Square;
  frontValue: number;
  behindValue: number;
}): boolean {
  return args.behindValue > args.frontValue && canLeaveLine(args.chess, args.pinned, args.dir);
}

export type { PieceSymbol, Color };
