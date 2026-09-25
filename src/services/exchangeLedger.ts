// exchangeLedger — WHO WON WHAT, across a projected line (unified-coach N7,
// David 2026-09-16: "Now is the time for it").
//
// The review speaks engine lines under headings like "Here's how you take
// advantage: …". `narrateDnaLine` renders each capture as a subjectless
// "winning the rook" — fine on a one-sided line, ambiguous the moment the line
// ALTERNATES, because half those captures belong to the opponent. At ply 29 of
// David's Alapin the spoken line reads "Kxd7, winning the knight … then Nxa8,
// winning the rook" under a heading promising the student an advantage; the
// rook is the student's, taken from them. The app's most engaged real user
// wrote exactly this in feedback: "I have a hard time understanding if they are
// talking about me or the opponent."
//
// This computes the NET of the sequence from the student's seat and says it in
// piece names — "you come out with two knights for the rook" — which is the
// sentence that settles the ambiguity AND carries the lesson (why an engine
// still calls that fork a mistake). Pure chess.js, no engine, no model (G0/G3).
import { andList } from '../utils/andList';
import { Chess, type Square } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MAX_PV_DEPTH_PLIES } from './ratingBands';

export type PieceLetter = 'p' | 'n' | 'b' | 'r' | 'q';

export interface ExchangeLedger {
  /** Enemy pieces the STUDENT captured, in capture order. */
  studentWon: PieceLetter[];
  /** The student's OWN pieces the opponent captured, in capture order. */
  opponentWon: PieceLetter[];
  /** Net material from the student's seat, in pawns (positive = student up). */
  netPawns: number;
  /** True when BOTH sides captured — the case a subjectless line garbles. */
  isExchange: boolean;
  /** False when the line stops mid-trade: the side to move at its end can
   *  still take back on the last capture's square. A net read there is the
   *  middle of an exchange, not its result (walk 6, R7: "you come out behind,
   *  a pawn for a queen, but you're clearly better" — the queen was coming
   *  straight back). */
  settled: boolean;
}

const VALUE: Record<PieceLetter, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const NOUN: Record<PieceLetter, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };
const COUNT_WORD = ['no', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

/** Walk a line of SANs from `fenBefore` and record every capture by side. */
export function computeExchangeLedger(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
): ExchangeLedger | null {
  let chess: Chess;
  try { chess = new Chess(fenBefore); } catch { return null; }
  const studentWon: PieceLetter[] = [];
  const opponentWon: PieceLetter[] = [];
  let lastCaptureSq: string | null = null;
  for (const san of sans) {
    let mv;
    try { mv = chess.move(san); } catch { return null; }
    if (!mv) return null;
    // The last capture square is REMEMBERED across quiet moves: after exd5 Nf6
    // the pawn on d5 can still be taken back, and forgetting the square the
    // moment a quiet move was played is how "exd5 Nf6" read as a won pawn.
    if (mv.captured) lastCaptureSq = mv.to;
    if (!mv.captured || mv.captured === 'k') continue;
    const piece = mv.captured as PieceLetter;
    if (mv.color === studentColorWB) studentWon.push(piece);
    else opponentWon.push(piece);
  }
  const sum = (xs: PieceLetter[]): number => xs.reduce((a, p) => a + VALUE[p], 0);
  // Settled = the side that lost that square cannot profitably win it back,
  // WHOEVER is to move (a take-back next move is still a take-back). Pin-aware.
  const occupant = lastCaptureSq ? chess.get(lastCaptureSq as Square) : null;
  const settled = lastCaptureSq === null || !occupant
    || legalSeeGainFor(chess.fen(), lastCaptureSq as Square, occupant.color === 'w' ? 'b' : 'w') <= 0;
  return {
    settled,
    studentWon,
    opponentWon,
    netPawns: sum(studentWon) - sum(opponentWon),
    isExchange: studentWon.length > 0 && opponentWon.length > 0,
  };
}

/** "two knights", "a rook and a pawn" — grouped by piece so the ledger reads
 *  the way a coach says it, never as a point total. */
function nameSide(pieces: readonly PieceLetter[]): string {
  const order: PieceLetter[] = ['q', 'r', 'b', 'n', 'p'];
  const counts = new Map<PieceLetter, number>();
  for (const p of pieces) counts.set(p, (counts.get(p) ?? 0) + 1);
  const parts = order
    .filter((p) => counts.has(p))
    .map((p) => {
      const n = counts.get(p) ?? 0;
      const word = COUNT_WORD[n] ?? String(n);
      return n === 1 ? `a ${NOUN[p]}` : `${word} ${NOUN[p]}s`;
    });
  if (parts.length <= 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The net of the sequence, from the student's seat — or NULL when saying it
 * would only restate what the line already showed (Narration Voice Rule 3):
 *  - nothing was captured;
 *  - only ONE side captured (the line's own "winning the knight" already says
 *    it, and there is nothing to confuse it with);
 *  - the trade is materially even AND piece-for-piece identical (a plain
 *    recapture the student watched happen).
 */
export function describeExchange(ledger: ExchangeLedger | null): string | null {
  if (!ledger || !ledger.isExchange || !ledger.settled) return null;
  const mine = nameSide(ledger.studentWon);
  const theirs = nameSide(ledger.opponentWon);
  if (!mine || !theirs) return null;
  if (ledger.netPawns === 0 && mine === theirs) return null; // a plain recapture
  // No embedded dash: the caller joins, and two em-dashes in one sentence read
  // as a stutter when the terminal verdict follows.
  if (ledger.netPawns === 0) return `that trade is even, ${mine} for ${theirs}`;
  return ledger.netPawns > 0
    ? `you come out ahead on material, ${mine} for ${theirs}`
    : `you come out behind on material, ${mine} for ${theirs}`;
}

/** The ledger sentence for a projected line, or null. One call for every
 *  projection pass (punishment / better-line / threat) — invariant 1. */
export function exchangeNetForLine(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
): string | null {
  return describeExchange(computeExchangeLedger(fenBefore, sans, studentColorWB));
}

/**
 * THE LINE AS PROOF (WO-LAYERS-01, from 424 narrated moves of Naroditsky: a
 * line is played only to prove ONE claim — "Qxd4, Qxd4, and the knight forks on
 * c2, winning a piece" — two to four plies that END ON THE RESULT, with no
 * adjective per move). Ours spoke all six plies with a description on each
 * ("the bishop trains on their rook on a8 — pressure they have to answer…"),
 * 120–300 words a move.
 *
 * The shortest prefix of a projected line that already reaches the line's
 * FINAL result:
 *  - the whole line mates → the whole line (mate is the point), or
 *  - the whole line ends on a FINISHED trade (no take-back on the last capture
 *    square) with a net gain → the first point that net is reached and settled.
 * Null when the line settles no material point — the line proves no material point,
 * and the caller says the verdict instead of reciting it. The cut is decided by
 * the claim, never by a count (G4.5: a cap stops after N regardless of worth).
 */
export interface LineProof {
  /** Plies of the line that prove the point. */
  plies: number;
  mate: boolean;
  ledger: ExchangeLedger | null;
}

export function proofCut(
  fenBefore: string,
  sans: readonly string[],
  studentColorWB: 'w' | 'b',
): LineProof | null {
  // The claim is what the WHOLE line ends on — mate, or its settled net. A
  // pawn grabbed on the way to a mate is not the point, so the cut is the
  // shortest prefix that already reaches the line's FINAL result.
  let chess: Chess;
  try { chess = new Chess(fenBefore); } catch { return null; }
  for (const san of sans) {
    try { if (!chess.move(san)) return null; } catch { return null; }
  }
  if (chess.isCheckmate()) return { plies: sans.length, mate: true, ledger: null };
  const full = computeExchangeLedger(fenBefore, sans, studentColorWB);
  if (!full || !full.settled || full.netPawns === 0) return null;
  for (let k = 1; k <= sans.length; k += 1) {
    const ledger = computeExchangeLedger(fenBefore, sans.slice(0, k), studentColorWB);
    if (ledger && ledger.settled && ledger.netPawns === full.netPawns) return { plies: k, mate: false, ledger };
  }
  return { plies: sans.length, mate: false, ledger: full };
}

/** The result a proof line ends on, from the student's seat, in piece names:
 *  "you win a knight", "they win a rook", or the two-sided trade sentence. */
export function describeProofResult(ledger: ExchangeLedger): string {
  const two = describeExchange(ledger);
  if (two) return two;
  if (ledger.studentWon.length > 0 && ledger.opponentWon.length === 0) return `you win ${nameSide(ledger.studentWon)}`;
  if (ledger.opponentWon.length > 0 && ledger.studentWon.length === 0) return `they win ${nameSide(ledger.opponentWon)}`;
  return ledger.netPawns > 0 ? 'you come out ahead on material' : 'you come out behind on material';
}

/** A line cut to the point it PROVES AGAINST the side that starts it — mate
 *  of that side, or a settled material loss for it — rendered from that
 *  side's seat ("Qh4 and Nxh4 — they win a queen"). Null when the line
 *  proves nothing against it (then no reason may be invented). One helper for
 *  every "why that move fails" surface (WO-TEACH-02 S5): the critical-moment
 *  reveal and the live deliberation. */
export function proofAgainstMover(fen: string, uci: readonly string[], moverWB: 'w' | 'b'): string | null {
  const sans: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci) sans.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.length > 4 ? u[4] : undefined }).san);
  } catch { /* the playable prefix is what we have */ }
  if (sans.length === 0) return null;
  const proof = proofCut(fen, sans, moverWB);
  if (!proof) return null;
  // A PROOF IS HEARD, SO IT HAS A HORIZON. "Qd2? Then e4, Ne5, Nxe5, dxe5,
  // O-O, Qf4, Ng6, Qg3, h5, Be2, h4, Qe3 and Nxe5" (hand walk 2340, 13 plies)
  // proves nothing to a listener. Past the horizon the line is not a reason,
  // and a move without a reason is not ruled out loud.
  if (proof.plies > MAX_PV_DEPTH_PLIES) return null;
  const moves = andList(sans.slice(0, proof.plies));
  // The line starts with the mover's move, so a mate of the MOVER ends on an
  // even ply; an odd-length mate is the mover mating, which explains nothing.
  if (proof.mate) return proof.plies % 2 === 0 ? `${moves} — and it's mate` : null;
  if (!proof.ledger || proof.ledger.netPawns >= 0) return null;
  return `${moves} — ${describeProofResult(proof.ledger)}`;
}
