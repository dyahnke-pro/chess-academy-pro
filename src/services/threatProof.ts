// threatProof — WHY "THIS COSTS A PIECE" IS TRUE (proof.ts; David 2026-10-07:
// "Anything that gets proven is stated out loud").
//
// The threat lanes open with a computed danger level ("Danger — a whole piece
// is at stake"). That level is a conclusion; this is its proof, read off the
// same exchange computer that decided the level (`computeMustDefend`, a legal
// SEE), so the two can never disagree:
//   • MATE — they have a mating move: name it.
//   • MATERIAL — the count (attacked N times, guarded M) and the capture that
//     starts it. Exact: every number is on the board.
// PURE: chess.js + threatOut.
import { Chess } from 'chess.js';
import { computeExchangeLedger, describeProofResult } from './exchangeLedger';
import { computeMustDefend, flipSideToMove } from './threatOut';
import { withProof, type Proof } from './proof';
import { MATE_POINTS, type FactStakes } from './factStakes';

const COUNT = ['no', 'once', 'twice', 'three times', 'four times', 'five times'];
const times = (n: number): string => COUNT[n] ?? `${n} times`;

/** The proof behind a threat against `student` on `fen` (the opponent's move
 *  just played), about the piece on one of `squares`; null when there is no
 *  cost to prove. */
export function threatProof(fen: string, student: 'w' | 'b', squares: readonly string[]): Proof | null {
  const them = flipSideToMove(fen);
  if (!them) return null;
  let probe: Chess;
  try { probe = new Chess(them); } catch { return null; }
  const mate = probe.moves({ verbose: true }).find((m) => m.san.endsWith('#'));
  if (mate) {
    return {
      kind: 'line', exact: true,
      short: `${mate.san} is mate`,
      full: `They threaten ${mate.san}, and it is mate`,
      line: { fen: them, sans: [mate.san] },
      squares: [mate.from, mate.to],
    };
  }
  const named = computeMustDefend(fen, student).pieces.find((p) => squares.includes(p.square));
  if (!named?.attacker) return null;
  // `attacker` is the capturing piece's TYPE (threatOut); its square is read here.
  const cap = probe.moves({ verbose: true }).find((m) => m.piece === named.attacker && m.to === named.square && !!m.captured);
  if (!cap) return null;
  const foe: 'w' | 'b' = student === 'w' ? 'b' : 'w';
  let hits = 0;
  try { hits = probe.attackers(named.square as Parameters<Chess['attackers']>[0], foe).length; } catch { return null; }
  const guard = named.defenders === 0 ? 'nothing guards it' : `it is guarded ${times(named.defenders)}`;
  // The OUTCOME comes from the ledger over the capture (a free piece is a
  // one-move line the ledger settles); a defended piece is said by its count,
  // the board fact, since the trade's result is not played out here.
  const free = named.defenders === 0 ? computeExchangeLedger(them, [cap.san], student) : null;
  const result = free && free.settled && free.netPawns < 0 ? describeProofResult(free) : null;
  return {
    kind: 'count', exact: true,
    short: result ? `${cap.san} — ${result}` : `attacked ${times(hits)}, ${guard}`,
    full: result ? `It is attacked ${times(hits)} and ${guard}: ${cap.san} — ${result}` : `It is attacked ${times(hits)} and ${guard}`,
    line: { fen: them, sans: [cap.san] },
    squares: [named.square, cap.from],
  };
}

/** The threat line with its proof — the conclusion only when none is found. */
export function provenThreatLine(line: string, fen: string, student: 'w' | 'b', squares: readonly string[]): { text: string; proof: Proof | null } {
  const proof = threatProof(fen, student, squares);
  return { text: proof ? withProof(line, proof) : line, proof };
}

/** WHAT A THREAT PUTS AT STAKE (unity U10): the same exchange read, as the
 *  door's stakes — so a trapped queen or a mate threat leads the turn instead
 *  of waiting behind a description that merely ranked higher by lane. */
export function threatStakes(fen: string, student: 'w' | 'b', squares: readonly string[]): FactStakes | null {
  const them = flipSideToMove(fen);
  if (!them) return null;
  try { if (new Chess(them).moves().some((m) => m.endsWith('#'))) return { points: MATE_POINTS, plies: 1 }; } catch { return null; }
  const named = computeMustDefend(fen, student).pieces.find((p) => squares.includes(p.square));
  return named && named.value > 0 ? { points: named.value, plies: 1 } : null;
}
