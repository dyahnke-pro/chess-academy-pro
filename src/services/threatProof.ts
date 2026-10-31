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
import { computeMustDefend, flipSideToMove, mateThreatsAgainst } from './threatOut';
import { withProof, type Proof } from './proof';
import { mateStakes, type FactStakes } from './factStakes';
import { CAPTURE_VALUE } from './pieceValues';
import { PIECE_NAMES } from '../types/tacticTypes';
import { looseKey, plyOfFen } from './conceptKey';
import { unmarked } from '../utils/sanMark';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';
import { afterCaptureSan } from '../utils/captureWords';
import { withArticle } from '../utils/andList';

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
  const mate = mateThreatsAgainst(fen, student).moves[0];
  if (mate) {
    return {
      kind: 'line', exact: true,
      short: `${unmarked(mate.san)} is mate`,
      full: `They threaten ${unmarked(mate.san)}, and it is mate`,
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
  // one-move line the ledger settles). A DEFENDED piece is said by what the
  // trade nets them — the legal SEE `computeMustDefend` already played
  // (`named.value`) — because "it is guarded twice" is no reason when a pawn
  // takes a knight: the guards only take back a pawn (Learn walk 2026-10-13:
  // the count went out as the why and explained nothing).
  const free = named.defenders === 0 ? computeExchangeLedger(them, [cap.san], student) : null;
  const result = free && free.settled && free.netPawns < 0 ? describeProofResult(free) : null;
  // In PIECES, never a point count (V3: no statistic is spoken).
  const attackerName = PIECE_NAMES[cap.piece] ?? 'piece';
  const targetName = PIECE_NAMES[named.piece] ?? 'piece';
  const targetValue = CAPTURE_VALUE[named.piece] ?? 0;
  const cheaper = named.defenders > 0 && (CAPTURE_VALUE[cap.piece] ?? 0) < targetValue;
  const netsTarget = afterCaptureSan({ kind: 'nets', captured: named.piece, free: false }, 'verb');
  const net = !result && named.defenders > 0 && named.value > 0
    ? (cheaper
      // ROTATED on the threat itself (Learn tape 2026-10-28: four threats in a
      // game, one sentence each time). The same threat says the same words.
      ? rotateStem([
        `${cap.san} ${netsTarget} for ${withArticle(attackerName)}, even after you take back`,
        `${cap.san} trades their ${attackerName} for your ${targetName}, and you come out behind even after you take back`,
        // Never "<capture> takes your X": the capture is already a verb, and
        // "hxg4 takes your bishop" was heard "H-pawn takes g4 takes your
        // bishop" (prod Learn walk 2026-10-29) — nor "wins your X" after it
        // (David 2026-10-30: "queen takes d8, takes the queen"). The SAN says
        // the capture; what it nets follows (`captureWords`).
        `After ${cap.san}, taking back only gets you ${withArticle(attackerName)} — you lose your ${targetName}`,
      ], stemKeyOf(`${them}|${cap.san}`))
      : named.value >= targetValue
        ? `${cap.san} ${netsTarget} outright — you cannot take back enough`
        : `${cap.san} still wins material after you take back`)
    : null;
  // No second "cheaper piece" clause: "wins your bishop for their pawn, even
  // after you take back" IS the consequence, and Learn's warning already says
  // why a guard does not help — said twice in one turn on the 2026-10-14 tape.
  return {
    kind: 'count', exact: true,
    short: result ? `${cap.san} — ${result}` : net ?? `attacked ${times(hits)}, ${guard}`,
    full: result ? `It is attacked ${times(hits)} and ${guard}: ${cap.san} — ${result}` : net ?? `It is attacked ${times(hits)} and ${guard}`,
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
  try { if (new Chess(them).moves().some((m) => m.endsWith('#'))) return mateStakes('them', 1, false); } catch { return null; }
  const named = computeMustDefend(fen, student).pieces.find((p) => squares.includes(p.square));
  return named && named.value > 0 ? { points: named.value, plies: 1 } : null;
}

/** THE LOOSE-PIECE CLAIMS a threat on `squares` makes: each of the student's
 *  pieces there that is attacked and unguarded, read off the same exchange
 *  computer as the proof (`computeMustDefend`), keyed by the spell that starts
 *  on this board (`looseKey(sq, ply)`, the same key the Learn threat lane
 *  attaches — OS-11 #3). */
export function looseClaims(fen: string, student: 'w' | 'b', squares: readonly string[]): string[] {
  return computeMustDefend(fen, student).pieces
    .filter((p) => squares.includes(p.square) && p.defenders === 0 && !!p.attacker)
    .map((p) => looseKey(p.square, plyOfFen(fen)));
}
