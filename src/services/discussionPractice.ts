// Discussion Practice orchestration — the live faucet's loop, framework-
// agnostic so it's unit-testable and reusable across every play surface
// (OpeningPlayMode, Play-with-Coach, middlegame/endgame play). The React
// hook (useDiscussionPractice) is a thin shell over these functions.
//
// Loop: a move comes in -> detectSlip gates whether to engage -> if a
// slip, the coach asks "why did you play that?" -> the student answers
// (or skips) -> classifyMisconception maps it to a closed-set tag -> we
// log it to the shared bucket (gated by the learned/count-against rule).

import { detectSlip, slipSeverityLabel, type SlipInput, type SlipResult } from './slipDetector';
import { detectTactics } from './tacticsDetector';
import { assembleEngineReasoning } from './groundedAnswer';
import {
  classifyMisconception,
  type ClassifyMisconceptionInput,
  type MisconceptionClassification,
} from './misconceptionClassifier';
import { logMisconception } from './misconceptionService';
import { addMistakePuzzleFromCapture } from './mistakePuzzleService';
import type { MisconceptionSource, MisconceptionTagRecord } from '../types';

/** Decide whether a played move warrants the "why?" prompt. Thin
 *  re-export so callers import one module. */
export function evaluateMove(input: SlipInput): SlipResult {
  return detectSlip(input);
}

/** The spoken-safe question the coach asks. CLEAN + NEUTRAL by contract
 *  (CLAUDE.md §coach-voice, rule 1): IDENTICAL for good and bad moves, with
 *  ZERO board facts — no piece, no square, no tactic, and no "that steps away
 *  from the line" (which telegraphs it was worse). The student must not know
 *  whether they're praised or corrected, or the reasoning data is
 *  contaminated. The grounded truth lives in the REVEAL, after they answer. */
export function buildWhyPrompt(_slip?: SlipResult): string {
  return "Why'd you play that?";
}

/** The GROUNDED reveal — shown ONLY after the student commits a reason (or taps
 *  Hint). Danya-voiced, computed from the board (G0): names what the move DID.
 *  - slip → what it ALLOWED (a mover piece now hanging), else a neutral "gives
 *    ground" (the precise refutation is the classifier's coachNote on capture).
 *  - good → the tactic the move SET UP (a probe: "did you spot it?").
 *  Conservative — never claims a tactic that isn't on the board. */
export function buildGroundedReveal(args: {
  kind: 'slip' | 'good';
  fenAfter: string;
  moverColor: 'w' | 'b';
  bestSan?: string;
}): string {
  const det = detectTactics(args.fenAfter);
  if (args.kind === 'good') {
    const named = det.tactics.find((t) => t.type !== 'none');
    if (named) {
      return `That sets up a ${named.type.replace(/_/g, ' ')} — did you spot it?`;
    }
    return 'Solid — that keeps your position humming.';
  }
  // slip: name what the move left hanging (precise, side-aware), else neutral.
  const hang = det.hangingPieces.find((hp) => hp.color === args.moverColor);
  if (hang) {
    return `That leaves the ${PIECE_LABEL[hang.piece] ?? 'piece'} on ${hang.square} hanging.`;
  }
  return 'Not quite — that gives ground; there was better.';
}

const PIECE_LABEL: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

/**
 * buildSlipReveal — the FULL grounded teach shown after the "why did you play
 * that?" picker (David 2026-07-10: "I want the best move to be told, along with
 * the why behind it" + "I need to know if it's a blunder or mistake"). Composes,
 * all from the board + engine (G0, never invented):
 *   1. the CLASSIFICATION — "That was a blunder." / "a mistake."
 *   2. WHAT the move let slip — a hanging mover piece, when there is one.
 *   3. the BEST move + the engine's REASONING walk (assembleEngineReasoning over
 *      the engine PV) — the thing the student should have played, and why.
 * Falls back gracefully: no PV → just names the best move; no hang → skips (2).
 */
export function buildSlipReveal(args: {
  cpLoss: number;
  fenBefore: string;
  fenAfter: string;
  moverColor: 'w' | 'b';
  bestSan?: string;
  /** The engine's best line in SAN from `fenBefore` (index 0 = the best move). */
  bestPvSan?: string[];
  /** White-perspective eval at the best line's end, for the verdict clause. */
  evalCp?: number | null;
  mateIn?: number | null;
}): string {
  const parts: string[] = [];

  const severity = slipSeverityLabel(args.cpLoss);
  if (severity) parts.push(`That was ${severity === 'inaccuracy' ? 'an' : 'a'} ${severity}.`);

  // What the move let slip — a hanging mover piece (precise, side-aware).
  const det = detectTactics(args.fenAfter);
  const hang = det.hangingPieces.find((hp) => hp.color === args.moverColor);
  if (hang) parts.push(`It leaves the ${PIECE_LABEL[hang.piece] ?? 'piece'} on ${hang.square} hanging.`);

  // The best move + the engine's reasoning walk — the headline teach.
  const moverFull: 'white' | 'black' = args.moverColor === 'w' ? 'white' : 'black';
  const reasoning = args.bestPvSan && args.bestPvSan.length > 0
    ? assembleEngineReasoning({
        fenBefore: args.fenBefore,
        pvSan: args.bestPvSan,
        moverColor: moverFull,
        evalCp: args.evalCp ?? null,
        mateIn: args.mateIn ?? null,
        studentSide: moverFull,
      })
    : null;
  if (reasoning) {
    // Reframe "The engine plays X" → "The best move was X" for a slip teach.
    parts.push(reasoning.facts.replace(/^The engine plays /, 'The best move was '));
  } else if (args.bestSan) {
    parts.push(`The best move was ${args.bestSan}.`);
  } else if (!hang) {
    parts.push('There was better.');
  }

  return parts.join(' ').trim();
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

  // Always LOG the slip so it shows in Thinking Errors. The `counted` flag
  // carries the learned/count-against gate: an un-learned line is display-only
  // and doesn't inflate the formal weakness profile. (The classifier already
  // ran above — the old early-return threw its result away on un-learned lines,
  // which is why Thinking Errors sat empty after bulk import. We're not removing
  // the LLM call; we're keeping the result we already paid for.)
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
    counted: args.shouldCount,
  });

  // Option B (David 2026-05-25): a logged tactical/concrete slip with a
  // known best move ALSO becomes a drillable mistakePuzzle, so coach-caught
  // mistakes surface in My Mistakes + Tactics, not just as a tally. Deduped
  // by position inside the helper; fire-and-forget so capture never blocks.
  if (record && args.shouldCount && args.context.bestSan) {
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
  };
}
