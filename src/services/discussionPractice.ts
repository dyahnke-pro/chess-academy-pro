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
import type { MisconceptionCandidate } from './misconceptionDiagnosis';
import { getMisconceptionTag } from '../data/misconceptionTags';
import { logMisconception } from './misconceptionService';
import { addMistakePuzzleFromCapture } from './mistakePuzzleService';
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
  /** True when CODE couldn't auto-tag confidently — the surface should POP THE
   *  PICKER with `candidates` (most-probable first) and log the user's pick via
   *  `logPickedMisconception`. Nothing is logged yet in this case. */
  needsPicker: boolean;
  /** Ranked candidates for the picker (best guess first). Empty = code found no
   *  specific bucket; the surface shows the judgment-list floor + Random. */
  candidates: MisconceptionCandidate[];
}

/** Classify a slip and, when it's a real misconception on a line that
 *  should count, log it. Always returns the coachNote so the surface can
 *  teach even when nothing is logged (unlearned line, or the move turned
 *  out fine). The classifier's hallucination guard means an off-vocab
 *  tag is dropped silently. */
export async function captureMisconception(
  args: CaptureMisconceptionArgs,
): Promise<CaptureMisconceptionResult> {
  // Thread the eval drop (the detector's key signal) from the capture context
  // so the code-first diagnosis works without the caller restructuring its
  // classifyInput. The caller's explicit cpLossStudent wins when present.
  const classifyInput: ClassifyMisconceptionInput = {
    ...args.classifyInput,
    cpLossStudent: args.classifyInput.cpLossStudent ?? args.context.cpLoss ?? null,
    bestSan: args.classifyInput.bestSan ?? args.context.bestSan,
  };
  const classification = await classifyMisconception(classifyInput);
  if (!classification) {
    return { classification: null, coachNote: '', logged: false, needsPicker: false, candidates: [] };
  }

  const coachNote = classification.coachNote;

  // CODE is unsure → the surface pops the picker (ranked candidates, best guess
  // first) and logs the user's pick via `logPickedMisconception`. Don't log yet.
  if (classification.needsPicker) {
    return { classification, coachNote, logged: false, needsPicker: true, candidates: classification.candidates };
  }

  // 'none' = the move was actually fine; teach nothing to log.
  if (classification.tag === 'none') {
    return { classification, coachNote, logged: false, needsPicker: false, candidates: classification.candidates };
  }

  // The count-against rule: only learned lines / principles become
  // weaknesses. On an unlearned line we still return the teach.
  if (!args.shouldCount) {
    return { classification, coachNote, logged: false, needsPicker: false, candidates: classification.candidates };
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

  // Option B (David 2026-05-25): a logged tactical/concrete slip with a
  // known best move ALSO becomes a drillable mistakePuzzle, so coach-caught
  // mistakes surface in My Mistakes + Tactics, not just as a tally. Deduped
  // by position inside the helper; fire-and-forget so capture never blocks.
  if (record && args.context.bestSan) {
    void addMistakePuzzleFromCapture({
      fen: args.context.fen,
      playedSan: args.context.playedSan ?? '',
      bestSan: args.context.bestSan,
      cpLoss: args.context.cpLoss,
      gamePhase: args.context.gamePhase,
      moveNumber: args.context.moveNumber,
      openingName: args.context.openingName,
      sourceGameId: args.context.sourceGameId,
    }).catch(() => undefined);
  }

  return {
    classification,
    coachNote,
    logged: record !== null,
    record: record ?? undefined,
    needsPicker: false,
    candidates: classification.candidates,
  };
}

/** Log the bucket the USER picked from the pop-up (the <90%-confidence path).
 *  `tag` is a closed-set id or 'random' (the honest escape → stored as the
 *  'other' catch-all with a 'random' label). The grounded coachNote is the
 *  bucket's blurb. Returns the logged record (or null when the line shouldn't
 *  count / 'random' is chosen and we only want the tally). */
export async function logPickedMisconception(args: {
  tag: string;
  source: MisconceptionSource;
  shouldCount: boolean;
  context: CaptureMisconceptionArgs['context'];
  userReason?: string;
}): Promise<MisconceptionTagRecord | null> {
  if (!args.shouldCount) return null;
  const isRandom = args.tag === 'random' || args.tag === 'none';
  const tag = isRandom ? 'other' : args.tag;
  const record = await logMisconception({
    tag,
    customLabel: isRandom ? 'random / not sure' : undefined,
    source: args.source,
    fen: args.context.fen,
    playedSan: args.context.playedSan,
    bestSan: args.context.bestSan,
    cpLoss: args.context.cpLoss,
    gamePhase: args.context.gamePhase,
    moveNumber: args.context.moveNumber,
    openingId: args.context.openingId,
    openingName: args.context.openingName,
    userReason: args.userReason,
    coachNote: getMisconceptionTag(tag)?.blurb ?? '',
    sourceGameId: args.context.sourceGameId,
  });
  // A user-picked concrete (non-random) tag with a best move also becomes a
  // drillable mistake puzzle — same as the auto path.
  if (record && !isRandom && args.context.bestSan) {
    void addMistakePuzzleFromCapture({
      fen: args.context.fen,
      playedSan: args.context.playedSan ?? '',
      bestSan: args.context.bestSan,
      cpLoss: args.context.cpLoss,
      gamePhase: args.context.gamePhase,
      moveNumber: args.context.moveNumber,
      openingName: args.context.openingName,
      sourceGameId: args.context.sourceGameId,
    }).catch(() => undefined);
  }
  return record;
}
