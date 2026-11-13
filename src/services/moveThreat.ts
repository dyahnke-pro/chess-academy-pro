// WHAT THE MOVE THREATENS, two or three moves deep (fix 3, 2026-11-13). The
// one-move threat is the briefing's (`detectNewThreat`: "threatening Nxe5").
// A move's threat is often longer: Bg5 threatens Bxf6 and then cxd5 (the
// knight on f6 is the only guard of d5); Ne4 against the bishop on g5 wins it
// if they look away; Qe2 pins the e4-pawn so Nxe4 is coming. Read the way the
// app reads every threat — the null move (`threatOut.flipSideToMove`): the
// engine's line with the mover to move AGAIN (`passAfter`), counted by the
// exchange ledger. Three tests, each a false line it would otherwise say:
//   · the pass line nets material where its trades settle
//     (`settledNetForLine`, the LAST finished point: Bxf6 …exf6 is even, and
//     cxd5 after it is the pawn) — not a pawn the line gives straight back;
//   · it is NEW: the mover could not already win that much on the board
//     before the move (their best line there does not);
//   · it NEEDS AN ANSWER: ignoring it costs them — the pass line's value is a
//     pawn or more above the line where they reply (`after`). "f4 threatens
//     e5" with nothing won is not a threat (the page calls it "not-so-
//     dangerous" itself).
// Pure: chess.js, the ledger and the reads the surface already has.
import { Chess } from 'chess.js';
import type { AnalysisLine } from '../types';
import { flipSideToMove } from './threatOut';
import { computeExchangeLedger, materialGainWords, settledNetForLine } from './exchangeLedger';
import { lineSeatAt, lineShape } from '../utils/andList';

export interface MoveThreat {
  /** The move's predicate: "threatens to win the pawn on d5: you play Bxf6, …". */
  clause: string;
  /** The threat line to its blow, SAN, the mover first. */
  sans: string[];
  /** Material the mover nets if they ignore it, pawns. */
  net: number;
  squares: string[];
}

/** A pawn of value the opponent must answer. */
export const THREAT_ANSWER_CP = 100;
const LINE_PLIES = 6;

function sansOf(fen: string, uci: readonly string[], max: number): string[] {
  const out: string[] = [];
  try {
    const c = new Chess(fen);
    for (const u of uci.slice(0, max)) out.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
  } catch { /* the playable prefix */ }
  return out;
}

/** Centipawns from `side`'s seat (reads are White's view; a mate is large). */
function pov(l: AnalysisLine, side: 'w' | 'b'): number {
  const v = l.mate !== null && l.mate !== undefined ? (l.mate > 0 ? 10000 : -10000) : l.evaluation;
  return side === 'w' ? v : -v;
}

export function moveThreat(
  fenBefore: string,
  san: string,
  reads: { before: readonly AnalysisLine[]; after: readonly AnalysisLine[]; passAfter: readonly AnalysisLine[] },
  studentWB: 'w' | 'b',
): MoveThreat | null {
  let fenAfter: string;
  let mover: 'w' | 'b';
  let playedUci: string;
  try {
    const c = new Chess(fenBefore);
    mover = c.turn();
    // An escape from check makes no threat of its own: what the pass line
    // wins after it was there before (bench 2026-11-13: Kh1 out of …Bxh2+
    // "threatens" the fork Nxd8+ the knight on c6 already had).
    if (c.inCheck()) return null;
    const m = c.move(san);
    playedUci = `${m.from}${m.to}${m.promotion ?? ''}`;
    if (c.inCheck()) return null; // a check is its own beat
    fenAfter = c.fen();
  } catch { return null; }
  const pass = flipSideToMove(fenAfter);
  const pa = reads.passAfter[0];
  const answered = reads.after[0];
  if (!pass || !pa || pa.moves.length === 0 || !answered) return null;
  // A MATE THREAT two or three moves long (Danya: "the rook swings to d7, the
  // knight and bishop pile in, and mate arrives in a couple of moves"). Mate in
  // one is the briefing's (`detectNewThreat`). It needs an answer: with their
  // move they can stop it (the read where they reply is no forced mate); and
  // it is new: the board before the move held no mate for the mover.
  if (pa.mate !== null && pa.mate !== undefined) {
    const n = mover === 'w' ? pa.mate : -pa.mate;
    if (n < 2 || n > 3) return null;
    const forced = (l: AnalysisLine | undefined): boolean => !!l && l.mate !== null && l.mate !== undefined && (mover === 'w' ? l.mate > 0 : l.mate < 0);
    if (forced(answered) || forced(reads.before[0])) return null;
    const mateLine = sansOf(pass, pa.moves, 2 * n - 1);
    if (mateLine.length !== 2 * n - 1 || !/#$/.test(mateLine[mateLine.length - 1])) return null;
    const shape = lineShape(mateLine, lineSeatAt(pass, studentWB), pass, 'first');
    const squares = [...new Set(mateLine.map((x) => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(x)?.[1]).filter((x): x is string => !!x))];
    return { clause: `threatens mate in ${n === 2 ? 'two' : 'three'}: ${shape}`, sans: mateLine, net: 0, squares };
  }
  // It needs an answer.
  if (pov(pa, mover) - pov(answered, mover) < THREAT_ANSWER_CP) return null;
  const sans = sansOf(pass, pa.moves, LINE_PLIES);
  const net = settledNetForLine(pass, sans, mover);
  if (net === null || net < 1) return null;
  // It is new: the best line before the move did not already win this much
  // (unless that line IS this move).
  // It is new: the mover's best line before the move — the best one that is
  // not this move — did not already win this much.
  const b0 = reads.before.find((l) => l.moves.length > 0 && l.moves[0] !== playedUci);
  if (b0) {
    const before = settledNetForLine(fenBefore, sansOf(fenBefore, b0.moves, LINE_PLIES), mover);
    if (before !== null && before >= net) return null;
  }
  // The line to its blow: the shortest prefix that already nets it.
  let cut = sans.length;
  for (let k = 1; k <= sans.length; k += 1) {
    const n = settledNetForLine(pass, sans.slice(0, k), mover);
    if (n !== null && n >= net) { cut = k; break; }
  }
  const line = sans.slice(0, cut);
  const ledger = computeExchangeLedger(pass, line, mover);
  const won = ledger ? materialGainWords(ledger) : null;
  if (!won || line.length === 0) return null;
  const shape = lineShape(line, lineSeatAt(pass, studentWB), pass, 'first');
  const squares = [...new Set(line.map((s) => /([a-h][1-8])(?:=[QRBN])?[+#]?$/.exec(s)?.[1]).filter((x): x is string => !!x))];
  return { clause: `threatens to win ${won}: ${shape}`, sans: line, net, squares };
}
