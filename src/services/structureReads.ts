// structureReads — the batch-6 structure computers composed ONCE, by WHEN they
// apply (surfaceComposition: a surface calls these four, never each computer):
//   · the student's move  — what it did to the structure, squares, plan;
//   · their move          — what it did to YOUR structure / squares;
//   · the board           — standing structural facts, student to move;
//   · the engine's lines  — plan choices read off the MultiPV;
//   · the game            — the trend across the student's moves.
// Every read carries its proof (structureJudgementKit.StructureRead). Pure.
import type { Color } from 'chess.js';
import type { StructureRead } from './structureJudgementKit';
import {
  secondWeakness, keyPawn, fixOnBishopColour, recaptureSealed, enPassantStructure, formation,
  breakTradesWeakPawn, dontRepair, mirroredAsymmetry, formationChoice,
} from './pawnJudgement';
import {
  restriction, pawnFreeze, pieceBlocksOwnPawn, semiOutpost, maskedWeakness, safeSquareRoute, fileEntryCovered,
  dontPlugFile, unmovedUnits, mutualRestriction, fileOpenedForDefender,
} from './squareJudgement';
import {
  rightIdeaWrongPiece, keepPlanChangeRoute, planOverOneMove, placementFutureLine, smallEdges, fightingLine,
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
}

function safe(f: () => StructureRead | null): StructureRead | null {
  try { return f(); } catch { return null; }
}

/** Everything the student's move teaches about structure, squares and plan. */
export function studentMoveStructure(i: StudentMoveStructureInput): StructureRead[] {
  const { fenBefore, san, student, cpLoss, bestSan, bestUci, reply } = i;
  return [
    safe(() => rightIdeaWrongPiece(fenBefore, san, bestSan, cpLoss)),
    safe(() => keepPlanChangeRoute(fenBefore, san, bestUci, cpLoss, reply)),
    safe(() => planOverOneMove(fenBefore, san, bestSan, cpLoss)),
    safe(() => dontPlugFile(fenBefore, san, student, cpLoss, bestSan)),
    safe(() => fileOpenedForDefender(fenBefore, san, student, reply, cpLoss)),
    safe(() => enPassantStructure(fenBefore, san, student, cpLoss, bestSan)),
    safe(() => fixOnBishopColour(fenBefore, san, student)),
    safe(() => breakTradesWeakPawn(fenBefore, san, student, cpLoss)),
    safe(() => dontRepair(fenBefore, san, student, cpLoss, bestSan)),
    safe(() => semiOutpost(fenBefore, san, student, cpLoss)),
    safe(() => safeSquareRoute(fenBefore, san, student, bestUci, cpLoss)),
    safe(() => formation(fenBefore, san, student)),
    safe(() => pawnFreeze(fenBefore, san, student, cpLoss)),
    safe(() => formationChoice(fenBefore, san, student, bestSan, cpLoss)),
    safe(() => wedgePaysLater(fenBefore, san, student, bestUci, cpLoss)),
    safe(() => closedTacticalChance(fenBefore, san, student, bestUci, cpLoss)),
  ].filter((r): r is StructureRead => r !== null);
}

/** What THEIR move did to the student's structure and squares. */
export function theirMoveStructure(fenBefore: string, san: string, student: Color): StructureRead[] {
  return [
    safe(() => recaptureSealed(fenBefore, san, student)),
    safe(() => unmovedUnits(fenBefore, san, student)),
  ].filter((r): r is StructureRead => r !== null);
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

/** Plan choices read off the student's MultiPV at `fen` (student to move). */
export function linesStructure(
  fen: string, student: Color,
  lines: readonly { moves: readonly string[]; evaluation: number; mate?: number | null }[],
): StructureRead[] {
  return [
    safe(() => fightingLine(fen, student, lines)),
    safe(() => (lines[0] ? placementFutureLine(fen, student, lines[0].moves) : null)),
  ].filter((r): r is StructureRead => r !== null);
}

/** The trend across the student's own moves in a game. */
export function gameStructureTrend(moves: readonly { san: string; cpLoss: number }[]): StructureRead | null {
  return safe(() => smallEdges(moves));
}
