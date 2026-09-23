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
import { Chess } from 'chess.js';

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
    lastCaptureSq = mv.captured ? mv.to : null;
    if (!mv.captured || mv.captured === 'k') continue;
    const piece = mv.captured as PieceLetter;
    if (mv.color === studentColorWB) studentWon.push(piece);
    else opponentWon.push(piece);
  }
  const sum = (xs: PieceLetter[]): number => xs.reduce((a, p) => a + VALUE[p], 0);
  const settled = lastCaptureSq === null
    || !chess.moves({ verbose: true }).some((m) => m.to === lastCaptureSq && !!m.captured);
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
