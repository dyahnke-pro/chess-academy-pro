// Discussion Practice orchestration — the live faucet's loop, framework-
// agnostic so it's unit-testable and reusable across every play surface
// (OpeningPlayMode, Play-with-Coach, middlegame/endgame play). The React
// hook (useDiscussionPractice) is a thin shell over these functions.
//
// Loop: a move comes in -> detectSlip gates whether to engage -> if a
// slip, the coach asks "why did you play that?" -> the student answers
// (or skips) -> classifyMisconception maps it to a closed-set tag -> we
// log it to the shared bucket (gated by the learned/count-against rule).

import { detectSlip, type SlipInput, type SlipResult } from './slipDetector';
import {
  classifyMisconception,
  type ClassifyMisconceptionInput,
  type MisconceptionClassification,
} from './misconceptionClassifier';
import { logMisconception } from './misconceptionService';
import type { MisconceptionSource, MisconceptionTagRecord } from '../types';

/** Decide whether a played move warrants the "why?" prompt. Thin
 *  re-export so callers import one module. */
export function evaluateMove(input: SlipInput): SlipResult {
  return detectSlip(input);
}

/** The spoken-safe question the coach asks on a slip. Plain English,
 *  no SAN read as letters, no digits — the move just happened on the
 *  board, so we don't restate it. */
export function buildWhyPrompt(slip: SlipResult): string {
  if (slip.reason === 'left-book') {
    return 'That steps away from the main line. What was the idea behind it?';
  }
  return 'What was the idea behind that move?';
}

export interface CaptureMisconceptionArgs {
  classifyInput: ClassifyMisconceptionInput;
  source: MisconceptionSource;
  /** The slip's learned/count-against gate. When false we still teach
   *  (return the coachNote) but do NOT log to the weakness bucket. */
  shouldCount: boolean;
  /** Position + move context to persist with the tag. */
  context: {
    fen: string;
    playedSan?: string;
    bestSan?: string;
    cpLoss?: number;
    gamePhase?: 'opening' | 'middlegame' | 'endgame';
    moveNumber?: number;
    openingId?: string;
    openingName?: string;
    sourceGameId?: string;
  };
}

export interface CaptureMisconceptionResult {
  classification: MisconceptionClassification | null;
  /** The one-line teach to speak/show (empty when classification failed). */
  coachNote: string;
  /** True when a tag was actually written to the bucket. */
  logged: boolean;
  record?: MisconceptionTagRecord;
}

/** Classify a slip and, when it's a real misconception on a line that
 *  should count, log it. Always returns the coachNote so the surface can
 *  teach even when nothing is logged (unlearned line, or the move turned
 *  out fine). The classifier's hallucination guard means an off-vocab
 *  tag is dropped silently. */
export async function captureMisconception(
  args: CaptureMisconceptionArgs,
): Promise<CaptureMisconceptionResult> {
  const classification = await classifyMisconception(args.classifyInput);
  if (!classification) {
    return { classification: null, coachNote: '', logged: false };
  }

  const coachNote = classification.coachNote;

  // 'none' = the move was actually fine; teach nothing to log.
  if (classification.tag === 'none') {
    return { classification, coachNote, logged: false };
  }

  // The count-against rule: only learned lines / principles become
  // weaknesses. On an unlearned line we still return the teach.
  if (!args.shouldCount) {
    return { classification, coachNote, logged: false };
  }

  const record = await logMisconception({
    tag: classification.tag,
    customLabel: classification.customLabel,
    source: args.source,
    fen: args.context.fen,
    playedSan: args.context.playedSan,
    bestSan: args.context.bestSan,
    cpLoss: args.context.cpLoss,
    gamePhase: args.context.gamePhase,
    moveNumber: args.context.moveNumber,
    openingId: args.context.openingId,
    openingName: args.context.openingName,
    userReason: args.classifyInput.userReason,
    coachNote,
    sourceGameId: args.context.sourceGameId,
  });

  return {
    classification,
    coachNote,
    logged: record !== null,
    record: record ?? undefined,
  };
}
