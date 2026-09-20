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
 * 🔒 AND A BLOCKER DOES NOT UN-PIN (found 2026-09-19, the test that guards the
 * top inGameAsk grounding trip went red on untouched main). The first version
 * of this test asked "does the piece have a move off the line ON THIS BOARD",
 * respecting occupancy. Italian after 9.O-O — Bc5, pawn f2, Kg1 — White's own
 * knight sits on f3, so the f2 pawn had no move at all this instant, and the
 * detector said: no pin. Every coach alive calls that the Italian pin. The
 * knight moves next turn and the pin bites; a snapshot of who is standing on
 * f3 is not a fact about the PIN, which is a standing constraint.
 *
 * So the test is the piece's MOVE PATTERN against the line: a rook pinned on a
 * diagonal, a bishop pinned on a file, a knight anywhere, a pawn pinned on a
 * rank or diagonal — all can leave, whatever is parked in front of them today.
 * A pawn pinned along its own FILE cannot: its pushes stay on the line, and a
 * capture is not a move the pawn HAS until an enemy stands on the diagonal — an
 * empty g6 is not a blocked move, it is no move. That asymmetry is deliberate;
 * it is exactly the h7 verdict above.
 *
 * Self-check is ignored on purpose too. A piece pinned against its own king
 * has no LEGAL move off the ray, and asking chess.js for legal moves would
 * therefore report every king-pin as "cannot leave" — exactly backwards.
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
 * Does the piece on `pinned` have a move in its PATTERN that lands off the
 * line running through it in direction `dir`?
 *
 * `dir` is the ray from the attacker through the pinned piece; the line it
 * defines is the pin line. Occupancy is NOT respected for pushes, slides,
 * knight hops and king steps — a blocker is transient and the pin outlives
 * it (see the note above). A pawn CAPTURE needs an enemy on the square: it is
 * not a move the pawn possesses otherwise. Own-king exposure is not respected
 * either.
 */
export function canLeaveLine(chess: Chess, pinned: Square, dir: Vec): boolean {
  const piece = chess.get(pinned);
  if (!piece) return false;
  const [f, r] = coords(pinned);
  const mine = piece.color;

  const escapes = (sq: Square | null): boolean => !!sq && !onLine(pinned, dir, sq);

  if (piece.type === 'n') return KNIGHT.some(([df, dr]) => escapes(square(f + df, r + dr)));
  if (piece.type === 'k') return [...BISHOP, ...ROOK].some(([df, dr]) => escapes(square(f + df, r + dr)));
  if (piece.type === 'p') {
    const step = mine === 'w' ? 1 : -1;
    // The push is in the pawn's pattern whether or not something stands on the
    // square today (the f2/Nf3 case). Both pushes share the file, so one step
    // decides: on a file pin it stays on the line, on any other pin it leaves.
    if (escapes(square(f, r + step))) return true;
    // Captures need something to capture. En passant is ignored: it cannot be
    // the only escape a teaching claim rests on, and reading the ep square here
    // would couple this geometry to move history for no pedagogical gain.
    return [-1, 1].some((df) => {
      const sq = square(f + df, r + step);
      const at = sq ? chess.get(sq) : null;
      return !!at && at.color !== mine && escapes(sq);
    });
  }

  // A slider's ray is either collinear with the pin line or entirely off it,
  // so the first on-board square of each direction decides for the whole ray.
  const dirs: Vec[] = piece.type === 'b' ? BISHOP : piece.type === 'r' ? ROOK : [...BISHOP, ...ROOK];
  return dirs.some(([df, dr]) => escapes(square(f + df, r + dr)));
}

/**
 * The full pin test, shared by every detector: three pieces on a ray, the one
 * behind worth more, and the one in front with a move that would leave the line.
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
