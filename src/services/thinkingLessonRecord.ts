// thinkingLessonRecord — where a "Learn how to think" answer goes, and how a
// step's standing is read. ONE record: lesson answers are capability evidence
// on the SAME tags game analysis files slips under (dual-use; plan "Memory"),
// never a lesson-only table.
//
// A lesson answer proves KNOW (the board posed it, the key is computed); games
// prove USE (David 2026-10-04 decision #2). `prompted` is honest: any help
// (a nudge, a reveal, "I don't know") makes the row count as neither.
import { capabilityProven, getCapabilityProfile, recordLaneEvidence, type CapabilityProfile } from './capabilityEvidence';
import { emitWeaknessModelChanged } from './weaknessModelEvents';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { AnsweredQuestion } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';

/** A lesson question is posed by construction (the fair-key filter), so it
 *  carries full importance. */
const LESSON_IMPORTANCE = 100;

export async function recordThinkingAnswer(
  answer: AnsweredQuestion,
  tags: readonly MisconceptionTagId[],
): Promise<void> {
  if (answer.stage === 'show') return;
  const s = answer.summary;
  for (const tag of tags) {
    await recordLaneEvidence({
      tag,
      outcome: s.held ? 'held' : 'broken',
      fen: answer.position.fen,
      playedSan: s.taps.join(' '),
      posedImportance: LESSON_IMPORTANCE,
      origin: 'learn',
      prompted: s.prompted,
      ...(answer.position.gameId ? { sourceGameId: answer.position.gameId } : {}),
    });
  }
  // The heat map and the green tile refresh live.
  emitWeaknessModelChanged();
}

/** A step's standing from the record: green when every tag is proven, red when
 *  any tag's latest evidence is a break, grey when never asked. PURE. */
export function standingFromProfile(profile: CapabilityProfile, tags: readonly MisconceptionTagId[]): StepStanding {
  if (tags.length === 0) return 'grey';
  const entries = tags.map((t) => profile.get(t));
  if (entries.every((e) => capabilityProven(e))) return 'green';
  if (entries.some((e) => e && e.broken > 0 && e.heldStreak === 0)) return 'red';
  return 'grey';
}

export async function stepStanding(tags: readonly MisconceptionTagId[]): Promise<StepStanding> {
  return standingFromProfile(await getCapabilityProfile(), tags);
}
