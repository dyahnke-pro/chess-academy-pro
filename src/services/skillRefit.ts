/**
 * THE SKILL TABLE REFIT LIST (mistakes round 2). A skill with no calibrated
 * row in the population table (`skill-difficulty.json`) — and no parent motif
 * row to borrow (`parentSkillTag`) — scores nothing on the skill meters: the
 * meter is honest ("we cannot say how hard that was"), and the skill waits on
 * the next refit. This is that list, computed from the one tag vocabulary, so
 * a new record tag joins it the day it is written and leaves it the day the
 * table is re-measured (CLAUDE.md: the whole table is refit with the scoring
 * that writes it, never merged).
 */
import { MISCONCEPTION_TAGS, type MisconceptionTagId } from '../data/misconceptionTags';
import { skillDifficulty } from './skillMetersLoader';

/** Every record tag the population table cannot score yet, in vocabulary
 *  order. `other` is a catch-all, never a skill. */
export function skillRefitList(): MisconceptionTagId[] {
  return MISCONCEPTION_TAGS.map((t) => t.id).filter((id) => id !== 'other' && skillDifficulty(id) === null);
}
