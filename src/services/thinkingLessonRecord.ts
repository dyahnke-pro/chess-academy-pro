// thinkingLessonRecord — where a "Learn how to think" answer goes, and how a
// step's standing is read. ONE record: lesson answers are capability evidence
// on the SAME tags game analysis files slips under (dual-use; plan "Memory"),
// written by the ONE answer recorder (`recordAnswer`) every asking surface
// uses — never a lesson-only table.
//
// A lesson answer proves KNOW (origin `lesson`: the board posed it, the key is
// computed); games prove USE (David 2026-10-04 decision #2). A step's standing
// — and so which tier is open — is read on KNOW.
import type { Color } from 'chess.js';
import { capabilityProven, summariseEvidence, type CapabilityEvidenceRecord, type CapabilityProfile } from './capabilityEvidence';
import { THINKING_STEPS, foldForSteps, type ThinkingStep } from './thinkingSteps';
import { recordAnswer } from './answerRecord';
import { wrongTapTag } from './wrongTapTag';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnsweredQuestion } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';

export async function recordThinkingAnswer(
  answer: AnsweredQuestion,
  tags: readonly MisconceptionTagId[],
): Promise<void> {
  if (answer.stage === 'show' || tags.length === 0) return;
  const { fen, key } = answer.position;
  const studentColor = (fen.split(' ')[1] === 'b' ? 'b' : 'w') as Color;
  // What each wrong tap proves the student misread (null when the board does
  // not prove it) — the same computer Analysis Practice uses.
  const wrongTags = [...new Set(answer.summary.extras
    .map((square) => wrongTapTag({ fen, key, square, questionTag: tags[0], studentColor }))
    .filter((t): t is MisconceptionTagId => !!t))];
  for (const [i, tag] of tags.entries()) {
    await recordAnswer({
      questionTag: tag,
      fen,
      origin: 'lesson',
      solved: answer.summary.solved,
      // The misconceptions are one fact about this answer: written once.
      answer: { ...answer.summary.detail, wrongTags: i === 0 ? wrongTags : [], surface: 'thinking-lesson', questionId: answer.step },
    });
  }
}

/**
 * THE ONE STEP READING (2026-10-23). A step is proven only by answers to ITS
 * OWN question: the lesson rows whose `questionId` is the step.
 *
 * Why not the tag profile: the steps SHARE tags ("their targets", "forcing
 * moves" and "hit two" all train `missed-tactic`), and every answer writes a
 * row per tag — so ten clean "their targets" answers turned "forcing moves" and
 * "hit two" green without either ever being asked, and the four tier-1 steps
 * opened tier 3 with tier 2 never taught (measured 2026-10-23). The tag profile
 * stays the right reading for a TAG (the heat map); a STEP reads its own rows.
 * A mixed round's step choice is filed as `step-choice` and proves no step.
 * PURE.
 */
export function stepKnowProfile(rows: readonly CapabilityEvidenceRecord[], step: string): CapabilityProfile {
  return summariseEvidence(foldForSteps(rows.filter((r) => r.answer?.questionId === step)), [], {}, 'know');
}

/** A step's standing on its own answers (`stepKnowProfile`). PURE. */
export function stepStanding(rows: readonly CapabilityEvidenceRecord[], step: string): StepStanding {
  const tags = step in THINKING_STEPS ? THINKING_STEPS[step as ThinkingStep].tags : [];
  return standingFromProfile(stepKnowProfile(rows, step), tags);
}

/** A standing from a profile: green when every tag is proven, red when any
 *  tag's latest evidence is a break, grey when never asked. PURE. A STEP reads
 *  this through `stepStanding`, never off the shared tag profile. */
export function standingFromProfile(profile: CapabilityProfile, tags: readonly MisconceptionTagId[]): StepStanding {
  if (tags.length === 0) return 'grey';
  const entries = tags.map((t) => profile.get(t));
  if (entries.every((e) => capabilityProven(e))) return 'green';
  if (entries.some((e) => e && e.broken > 0 && e.heldStreak === 0)) return 'red';
  return 'grey';
}
