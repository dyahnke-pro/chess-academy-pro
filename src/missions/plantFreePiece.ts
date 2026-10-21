/**
 * PLANTING THE FREE PIECE (WO-MISSIONS-02) — Level 1's middlegame mission needs
 * a chance to win material, and a live game does not reliably offer one. So
 * on the coach's 2nd–8th move of the card, the coach plays ONE quiet move that
 * leaves a knight, bishop or rook to be won — never the queen, never a move
 * that threatens anything (the gift must not double as an attack), and only a
 * gift the engine confirms is real.
 *
 * Two halves, so each can be tested alone:
 *   `plantCandidates` — PURE (chess.js + the legal SEE): the coach's quiet
 *       moves (no capture, check or promotion) after which the student wins
 *       exactly one coach N/B/R for at least 3, the coach's queen stays safe,
 *       and nothing of the student's is newly attacked. Not while the coach is
 *       in check or can win a piece itself (a recapture is owed first).
 *   `verifyPlants` — at most three engine reads through an injected reader
 *       (the engine hook runs it inside the iOS 2 s cap): from the board after
 *       the plant, taking the piece must be the student's best move or within
 *       50 cp of it, and leave the student at +2.0 or better. Among the
 *       verified, the smallest gift wins — the coach's eval drops least, so the
 *       board looks most natural. The three tried are the smallest gifts, the
 *       most central squares first.
 */
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { legalSeeGainFor } from '../services/positionReadingService';
import { newlyAttackedPieces } from './coachDials';
import type { PlantReject, PlantScan } from './missionCard';

/** The coach moves of the card on which a plant may happen (1-based). */
export const PLANT_WINDOW = { first: 2, last: 8 } as const;
/** Engine reads per turn. */
export const PLANT_VERIFY_MAX = 3;
/** How close to the student's best the capture must be. */
const NEAR_BEST_CP = 50;
/** Where the student must stand after taking. */
const STUDENT_MIN_CP = 200;
const FREE = 3;
const PLANTABLE: ReadonlySet<PieceSymbol> = new Set<PieceSymbol>(['n', 'b', 'r']);

export interface PlantCandidate {
  uci: string;
  /** Where the free piece stands after the move. */
  square: Square;
  /** What the student wins by taking it (legal SEE). */
  gain: number;
  /** The board after the plant, student to move. */
  fenAfter: string;
}

function squaresOf(board: Chess, color: Color, types: ReadonlySet<PieceSymbol>): Square[] {
  const out: Square[] = [];
  for (const row of board.board()) for (const cell of row) {
    if (cell && cell.color === color && types.has(cell.type)) out.push(cell.square);
  }
  return out;
}

/** How far a square is from the centre (0.5 for d4–e5, 3.5 for a corner). */
function rimDistance(sq: Square): number {
  return Math.max(Math.abs(sq.charCodeAt(0) - 97 - 3.5), Math.abs(Number(sq[1]) - 1 - 3.5));
}

const QUEEN: ReadonlySet<PieceSymbol> = new Set<PieceSymbol>(['q']);
const ANY_BUT_KING: ReadonlySet<PieceSymbol> = new Set<PieceSymbol>(['p', 'n', 'b', 'r', 'q']);

/** The coach's quiet moves that plant exactly one free piece, smallest gift
 *  first; with none, why. Coach = the side to move in `fen`. */
export function plantCandidates(fen: string): { candidates: PlantCandidate[]; reject: PlantReject | null } {
  let board: Chess;
  try { board = new Chess(fen); } catch { return { candidates: [], reject: 'no-free-piece' }; }
  const coach = board.turn();
  const student: Color = coach === 'w' ? 'b' : 'w';
  // A recapture or a check reply comes first: no gift while the coach is in
  // check or can win a PIECE itself. A pawn it could take is no exchange in
  // progress — a student far ahead leaves pawns about, and counting those
  // refused every plant of a game (missions-02 prod audit, game 8: 7 of 7).
  if (board.inCheck() || squaresOf(board, student, ANY_BUT_KING).some((sq) => legalSeeGainFor(fen, sq, coach) >= FREE)) {
    return { candidates: [], reject: 'mid-exchange' };
  }
  let sawGift = false;
  const candidates: PlantCandidate[] = [];
  for (const m of board.moves({ verbose: true })) {
    if (m.captured || m.promotion || m.san.includes('+') || m.san.includes('#')) continue;
    const uci = `${m.from}${m.to}`;
    const after = new Chess(fen);
    after.move({ from: m.from, to: m.to });
    const fenAfter = after.fen();
    if (squaresOf(after, coach, QUEEN).some((sq) => legalSeeGainFor(fenAfter, sq, student) > 0)) continue;
    const free = squaresOf(after, coach, PLANTABLE)
      .map((square) => ({ square, gain: legalSeeGainFor(fenAfter, square, student) }))
      .filter((f) => f.gain >= FREE);
    if (free.length !== 1) continue;
    sawGift = true;
    if (newlyAttackedPieces(fen, uci, student).length > 0) continue;
    candidates.push({ uci, square: free[0].square, gain: free[0].gain, fenAfter });
  }
  // Smallest gift first; then the most central square — a piece stepping into
  // the middle looks like a real slip, one walking to the rim does not.
  candidates.sort((a, b) => a.gain - b.gain || rimDistance(a.square) - rimDistance(b.square) || (a.uci < b.uci ? -1 : a.uci > b.uci ? 1 : 0));
  return { candidates, reject: candidates.length > 0 ? null : sawGift ? 'threatens' : 'no-free-piece' };
}

/** An engine read of a board: its top lines, white's point of view. */
export type PlantRead = (fen: string) => Promise<{ topLines: ReadonlyArray<{ evaluation: number; moves: readonly string[]; mate: number | null }> } | null>;

export interface PlantPick {
  uci: string;
  square: Square;
  /** Where the student stands after taking, centipawns, their point of view. */
  studentCp: number;
}

/** Confirm up to `PLANT_VERIFY_MAX` candidates with the engine and pick the
 *  smallest verified gift. The scan counts why each one tried was turned down. */
export async function verifyPlants(candidates: readonly PlantCandidate[], read: PlantRead): Promise<{ pick: PlantPick | null; scan: PlantScan }> {
  const scan: PlantScan = {};
  const bump = (r: PlantReject): void => { scan[r] = (scan[r] ?? 0) + 1; };
  const verified: PlantPick[] = [];
  for (const c of candidates.slice(0, PLANT_VERIFY_MAX)) {
    const a = await read(c.fenAfter);
    if (!a || a.topLines.length === 0) { bump('no-read'); continue; }
    const studentWhite = c.fenAfter.split(' ')[1] === 'w';
    const pov = (l: { evaluation: number; mate: number | null }): number =>
      (l.mate !== null ? Math.sign(l.mate) * 100000 : l.evaluation) * (studentWhite ? 1 : -1);
    const best = Math.max(...a.topLines.map(pov));
    const takes = a.topLines.filter((l) => l.moves[0]?.slice(2, 4) === c.square).map(pov);
    if (takes.length === 0 || best - Math.max(...takes) > NEAR_BEST_CP) { bump('not-best'); continue; }
    const take = Math.max(...takes);
    if (take < STUDENT_MIN_CP) { bump('not-winning'); continue; }
    verified.push({ uci: c.uci, square: c.square, studentCp: take });
  }
  verified.sort((a, b) => a.studentCp - b.studentCp);
  return { pick: verified[0] ?? null, scan };
}
