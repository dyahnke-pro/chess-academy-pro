/**
 * badHabitDetector — the LEAF home of `detectBadHabits`.
 *
 * GROUNDING INVERSION (Phase 6): the coach's "am I improving / what should I
 * work on?" answer is the student's OWN computed history — never the LLM's
 * guess. That answer is assembled by `assembleProgressAnswer` (groundedAnswer.ts)
 * from the bad-habit list THIS module computes from real puzzle/theme data.
 *
 * It lives here, not in `coachFeatureService`, on purpose: `coachFeatureService`
 * imports `coachApi`, so calling `detectBadHabits` back from `coachApi` (where
 * the chat-grounding interception runs) would be a service↔service import cycle
 * — the exact "dodge" the inversion forbids (WO stumbling-block #1: move pure
 * computers to the leaf, same as `explainBestMoveGrounded`). This module imports
 * only `puzzleService` (itself cycle-free) + types, so `coachApi` can compute
 * the FRESH habit profile with no cycle. `coachFeatureService` re-exports it for
 * backward compatibility.
 */
import { getThemeSkills } from './puzzleService';
import type { BadHabit, UserProfile } from '../types';

export async function detectBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const themeSkills = await getThemeSkills();
  const habits: BadHabit[] = [...profile.badHabits];
  const today = new Date().toISOString().split('T')[0];

  // Check for weak themes (accuracy < 40% with 5+ attempts)
  for (const skill of themeSkills) {
    if (skill.accuracy < 0.4 && skill.attempts >= 5) {
      const existingIdx = habits.findIndex((h) => h.id === `weak-${skill.theme}`);
      if (existingIdx >= 0) {
        habits[existingIdx] = {
          ...habits[existingIdx],
          occurrences: habits[existingIdx].occurrences + 1,
          lastSeen: today,
          isResolved: skill.accuracy >= 0.6,
        };
      } else {
        habits.push({
          id: `weak-${skill.theme}`,
          description: `Struggling with ${skill.theme} puzzles (${Math.round(skill.accuracy * 100)}% accuracy)`,
          occurrences: 1,
          lastSeen: today,
          isResolved: false,
        });
      }
    }
  }

  // Mark habits as resolved if accuracy improved
  for (const habit of habits) {
    if (habit.id.startsWith('weak-')) {
      const theme = habit.id.replace('weak-', '');
      const skill = themeSkills.find((s) => s.theme === theme);
      if (skill && skill.accuracy >= 0.6) {
        habit.isResolved = true;
      }
    }
  }

  return habits;
}
