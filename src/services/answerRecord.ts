/**
 * answerRecord — THE ONE WAY A SURFACE RECORDS AN ANSWER (Learn how to think,
 * UNIFICATION RULE, "Recording an answer").
 *
 * Every surface that asks the student something — a lesson step, Analysis
 * Practice, the Review reading card — calls this once per settled question.
 * It writes the three records an answer feeds, so no surface wires them by
 * hand and none can drift:
 *
 *  1. the KNOW evidence row (`recordAnswerEvidence`) — held / broken /
 *     prompted, with the answer's detail;
 *  2. the misconception each wrong tap named (`recordWrongTapMisconceptions`);
 *  3. the drill spacing for the question's tag (`recordTagDrillResult`) — a
 *     clean, unhelped read spaces the tag's due instances out; a question the
 *     student could not answer brings them back. This was a parallel call in
 *     Analysis Practice beside a meta counter nobody read; it now rides here.
 */
import type { MisconceptionTagId } from '../data/misconceptionTags';
import {
  answerEvidenceOutcome,
  capabilitiesPosed,
  recordAnswerEvidence,
  type AnswerDetail,
  type AnswerOrigin,
  type CapabilityOutcome,
} from './capabilityEvidence';
import { recordWrongTapMisconceptions } from './wrongTapTag';
import { recordTagDrillResult } from './misconceptionService';
import { positionPosed } from './moveInsight';
import { Chess } from 'chess.js';

export interface AnswerRecordResult {
  outcome: CapabilityOutcome;
  prompted: boolean;
  /** Whether the evidence row was written (false: no tag, or the write failed). */
  evidence: boolean;
  wrongTagsWritten: MisconceptionTagId[];
}

export async function recordAnswer(a: {
  /** The capability the question tests; null = a general question (material,
   *  who is winning) that trains no tag — nothing is written for it. */
  questionTag: MisconceptionTagId | null;
  fen: string;
  origin: AnswerOrigin;
  /** Did the student reach the answer (right), rather than have it shown? */
  solved: boolean;
  answer: AnswerDetail;
}): Promise<AnswerRecordResult> {
  const { outcome, prompted } = answerEvidenceOutcome({ solved: a.solved, answer: a.answer });
  let evidence = false;
  if (a.questionTag) {
    evidence = await recordAnswerEvidence({ tag: a.questionTag, outcome, fen: a.fen, origin: a.origin, prompted, answer: a.answer });
    try {
      if (outcome === 'held' && !prompted) await recordTagDrillResult(a.questionTag, true);
      else if (!a.solved) await recordTagDrillResult(a.questionTag, false);
    } catch { /* spacing never breaks the question */ }
  }
  const wrongTagsWritten = a.answer.wrongTags.length > 0
    ? await recordWrongTapMisconceptions({
        tags: a.answer.wrongTags,
        fen: a.fen,
        source: a.origin,
        taps: a.answer.taps.map((t) => t.square),
        help: a.answer.help,
      })
    : [];
  return { outcome, prompted, evidence, wrongTagsWritten };
}

/**
 * A "find the move" question (the opening checkpoint quiz, Play's quiz):
 * the question's capability is COMPUTED from the board — the leading
 * fundamental the expected move answers (`capabilitiesPosed`), never a
 * hand-written tag — and the answer goes through `recordAnswer` like every
 * other question (persistent memory, 2026-10-19: these answers used to end
 * at an audit row and never reached the record).
 */
export async function recordMoveQuestionAnswer(a: {
  fen: string;
  expectedSan: string;
  solved: boolean;
  wrongAttempts: number;
  help: AnswerDetail['help'];
  surface: string;
  /** 'lesson' for a question the coach asked; 'reading' for a find the
   *  student made reading back over their own game. */
  origin?: AnswerOrigin;
}): Promise<AnswerRecordResult | null> {
  const mover: 'white' | 'black' = a.fen.split(' ')[1] === 'b' ? 'black' : 'white';
  let tag: MisconceptionTagId | null = null;
  try {
    // Both computers a puzzle's evidence reads: the fundamentals the move
    // answers, and what the position itself asks (the insight computer).
    const posed = [...capabilitiesPosed(a.fen, a.expectedSan, mover), ...positionPosed(a.fen, { bestSan: a.expectedSan })];
    tag = posed.sort((x, y) => y.posedImportance - x.posedImportance)[0]?.tag ?? null;
  } catch { tag = null; }
  if (!tag) return null;   // the board asked no capability we own: nothing to file
  return recordAnswer({
    questionTag: tag,
    fen: a.fen,
    origin: a.origin ?? 'lesson',
    solved: a.solved,
    answer: {
      taps: [], extras: [], wrongAttempts: a.wrongAttempts, msToFirst: null, msBetween: [],
      help: a.help, spoken: false, chainDepth: 0, wrongTags: [], typed: a.expectedSan, surface: a.surface,
    },
  });
}

/**
 * Review's free board: the first move the student tries from the position of
 * their own slip, graded against the engine's better move (persistent memory,
 * 2026-10-19 — finding it earned nothing). Prompted when the better-move arrow
 * was showing: the arrow IS the answer, so that find counts as neither.
 */
export async function recordFreeBoardFind(a: {
  fenBefore: string;
  bestUci: string;
  triedUci: string;
  arrowShown: boolean;
}): Promise<AnswerRecordResult | null> {
  let bestSan: string | null = null;
  try {
    const mv = new Chess(a.fenBefore).move({ from: a.bestUci.slice(0, 2), to: a.bestUci.slice(2, 4), promotion: a.bestUci[4] ?? 'q' });
    bestSan = mv.san;
  } catch { bestSan = null; }
  if (!bestSan) return null;
  const found = a.triedUci.slice(0, 4) === a.bestUci.slice(0, 4);
  return recordMoveQuestionAnswer({
    fen: a.fenBefore, expectedSan: bestSan, solved: found, wrongAttempts: found ? 0 : 1,
    help: a.arrowShown ? 'show' : 'none', surface: 'review-free-board', origin: 'reading',
  });
}
