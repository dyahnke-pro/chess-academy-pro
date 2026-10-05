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
  recordAnswerEvidence,
  type AnswerDetail,
  type AnswerOrigin,
  type CapabilityOutcome,
} from './capabilityEvidence';
import { recordWrongTapMisconceptions } from './wrongTapTag';
import { recordTagDrillResult } from './misconceptionService';

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
