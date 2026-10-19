// structureReads — the batch-6 structure computers composed ONCE, by WHEN they
// apply (surfaceComposition: a surface calls these four, never each computer):
//   · the student's move  — what it did to the structure, squares, plan;
//   · their move          — what it did to YOUR structure / squares;
//   · the board           — standing structural facts, student to move;
//   · the engine's lines  — plan choices read off the MultiPV;
//   · the game            — the trend across the student's moves.
// Every read carries its proof (structureJudgementKit.StructureRead). Pure.
import type { Color } from 'chess.js';
import { play, type StructureRead } from './structureJudgementKit';
import { kingCommitted } from './splitPosition';
import { squaresProof } from './proof';
import { rooksOnSeventh, kingToCentre, pawnForDevelopment } from './endgameMoveReads';
import {
  givePawnBack, defendsBoth, missedDefendsBoth, knightJumpApart, mateThreatWinsMore, mateThreatCostsYou, queenTradeRead,
} from './practicalReads';
import {
  secondWeakness, keyPawn, fixOnBishopColour, recaptureSealed, enPassantStructure, formation,
  breakTradesWeakPawn, dontRepair, mirroredAsymmetry, formationChoice,
} from './pawnJudgement';
import {
  restriction, pawnFreeze, pieceBlocksOwnPawn, semiOutpost, maskedWeakness, safeSquareRoute, fileEntryCovered,
  dontPlugFile, unmovedUnits, mutualRestriction, fileOpenedForDefender,
} from './squareJudgement';
import {
  rightIdeaWrongPiece, keepPlanChangeRoute, planOverOneMove, placementFutureLine, fightingLine,
  wedgePaysLater, closedTacticalChance,
} from './planJudgement';

export type { StructureRead, StructureAct } from './structureJudgementKit';

export interface StudentMoveStructureInput {
  fenBefore: string;
  /** The student's move, SAN. */
  san: string;
  student: Color;
  /** The move's engine cost against the best move, centipawns (≥ 0). */
  cpLoss: number;
  /** The engine's best move at `fenBefore`, SAN, or null. */
  bestSan: string | null;
  /** The engine's best line at `fenBefore`, UCI (best move first), or []. */
  bestUci: readonly string[];
  /** Their answer to the student's move, SAN, when known (played, or the
   *  engine's best reply on review). */
  reply: string | null;
  /** REQUIRED: may the better move be named? Review yes; Learn free play no
   *  (David 2026-10-10) — a read that names it speaks its held form, and one
   *  with no held form stays quiet. */
  namesBetterMove: boolean;
}

function safe(f: () => StructureRead | null): StructureRead | null {
  try { return f(); } catch { return null; }
}

/** Everything the student's move teaches about structure, squares and plan. */
export function studentMoveStructure(i: StudentMoveStructureInput): StructureRead[] {
  const { fenBefore, san, student, cpLoss, bestSan, bestUci, reply } = i;
  // A STANDING CLAIM — what the board IS after the student's move ("d4 and e4
  // stand side by side: together they cover …", "your knight on d5 is safe
  // there") — is read on the board right after the move and spoken once
  // their reply is on it. A reply that changed one of its squares made it
  // false by the time it is heard (Smith-Morra replay 2026-10-19: 2.d4's
  // phalanx, said after …cxd4 took the d4 pawn). A judgement of the MOVE
  // ("Nd5 was the right square, but…", "you leave the pawn to them on
  // purpose") stays true whatever the reply does, and so do the reads that
  // already look at the reply.
  const changed = reply ? squaresTheReplyChanged(fenBefore, san, reply) : null;
  const standing = (r: StructureRead | null): StructureRead | null => (r && changed && r.squares.some((sq) => changed.has(sq)) ? null : r);
  const reads = [
    safe(() => rightIdeaWrongPiece(fenBefore, san, bestSan, cpLoss)),
    safe(() => keepPlanChangeRoute(fenBefore, san, bestUci, cpLoss, reply)),
    safe(() => planOverOneMove(fenBefore, san, bestSan, cpLoss)),
    safe(() => dontPlugFile(fenBefore, san, student, cpLoss, bestSan)),
    safe(() => fileOpenedForDefender(fenBefore, san, student, reply, cpLoss)),
    standing(safe(() => enPassantStructure(fenBefore, san, student, cpLoss, bestSan))),
    standing(safe(() => fixOnBishopColour(fenBefore, san, student))),
    safe(() => breakTradesWeakPawn(fenBefore, san, student, cpLoss)),
    standing(safe(() => dontRepair(fenBefore, san, student, cpLoss, bestSan))),
    standing(safe(() => semiOutpost(fenBefore, san, student, cpLoss))),
    standing(safe(() => safeSquareRoute(fenBefore, san, student, bestUci, cpLoss))),
    standing(safe(() => formation(fenBefore, san, student))),
    standing(safe(() => pawnFreeze(fenBefore, san, student, cpLoss))),
    safe(() => formationChoice(fenBefore, san, student, bestSan, cpLoss)),
    standing(safe(() => wedgePaysLater(fenBefore, san, student, bestUci, cpLoss))),
    safe(() => closedTacticalChance(fenBefore, san, student, bestUci, cpLoss)),
    standing(safe(() => rooksOnSeventh(fenBefore, san, student, cpLoss))),
    standing(safe(() => kingToCentre(fenBefore, san, student, cpLoss))),
    safe(() => pawnForDevelopment(fenBefore, san, student, cpLoss)),
    safe(() => givePawnBack(fenBefore, san, student, cpLoss)),
    standing(safe(() => defendsBoth(fenBefore, san, student, cpLoss))),
    safe(() => missedDefendsBoth(fenBefore, san, student, cpLoss)),
    safe(() => mateThreatWinsMore(fenBefore, san, student, cpLoss)),
    safe(() => queenTradeRead(fenBefore, san, student, cpLoss)),
  ].filter((r): r is StructureRead => r !== null);
  if (i.namesBetterMove) return reads;
  // A read that names the better move carries its held form (`heldForm`);
  // every other read never names it.
  return reads.map((r) => (r.heldForm ? { ...r, text: r.heldForm.text, squares: r.heldForm.squares, proof: r.heldForm.proof, heldForm: undefined } : r));
}

/** Every square whose occupant their reply changed (emptied, filled or taken
 *  — castling and en passant included), or null when the moves do not play. */
export function squaresTheReplyChanged(fenBefore: string, san: string, reply: string): Set<string> | null {
  const mid = play(fenBefore, san);
  if (!mid) return null;
  const after = play(mid.after.fen(), reply.replace(/^…/, ''));
  if (!after) return null;
  const out = new Set<string>();
  const a = mid.after.board();
  const b = after.after.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const x = a[r][f]; const y = b[r][f];
    if ((x?.type ?? '') !== (y?.type ?? '') || (x?.color ?? '') !== (y?.color ?? '')) out.add(`${'abcdefgh'[f]}${8 - r}`);
  }
  return out;
}

/** What THEIR move did to the student's structure and squares. */
export function theirMoveStructure(fenBefore: string, san: string, student: Color): StructureRead[] {
  return [
    safe(() => recaptureSealed(fenBefore, san, student)),
    safe(() => unmovedUnits(fenBefore, san, student)),
    safe(() => kingCommittedRead(fenBefore, san, student)),
    safe(() => knightJumpApart(fenBefore, san, student)),
    safe(() => mateThreatCostsYou(fenBefore, san, student)),
  ].filter((r): r is StructureRead => r !== null);
}

/** Their king castled while the student's is central: the plan changes. */
function kingCommittedRead(fenBefore: string, san: string, student: Color): StructureRead | null {
  const after = play(fenBefore, san);
  if (!after) return null;
  const k = kingCommitted(after.after.fen(), student);
  if (!k) return null;
  const proof = squaresProof(k.text, k.squares);
  return proof ? { act: 'king-committed', text: k.text, squares: k.squares, proof, key: `king-committed:${k.squares[0]}` } : null;
}

/** The standing structural facts of the board, from the student's seat. */
export function boardStructure(fen: string, student: Color): StructureRead[] {
  return [
    safe(() => keyPawn(fen, student)),
    safe(() => secondWeakness(fen, student)),
    safe(() => maskedWeakness(fen, student)),
    safe(() => restriction(fen, student)),
    safe(() => pieceBlocksOwnPawn(fen, student)),
    safe(() => fileEntryCovered(fen, student)),
    safe(() => mirroredAsymmetry(fen, student)),
    safe(() => mutualRestriction(fen, student)),
  ].filter((r): r is StructureRead => r !== null);
}

/** Plan choices read off the student's MultiPV at `fen` (student to move).
 *  Every read here is about the move they are ABOUT to make, so `namesMoves`
 *  is required: false holds the move and keeps the idea (Alekhine walk
 *  2026-10-19 — "Nf3 creates the imbalance… c4 keeps it quiet" before the
 *  student had moved). */
export function linesStructure(
  fen: string, student: Color,
  lines: readonly { moves: readonly string[]; evaluation: number; mate?: number | null }[],
  namesMoves: boolean,
): StructureRead[] {
  const reads = [
    safe(() => fightingLine(fen, student, lines)),
    safe(() => (lines[0] ? placementFutureLine(fen, student, lines[0].moves) : null)),
  ].filter((r): r is StructureRead => r !== null);
  if (namesMoves) return reads;
  return reads.map((r) => (r.heldForm ? { ...r, text: r.heldForm.text, squares: r.heldForm.squares, proof: r.heldForm.proof, heldForm: undefined } : r));
}
