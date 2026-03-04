import { db } from '../db/schema';
import { getCoachCommentary } from './coachApi';
import { getThemeSkills } from './puzzleService';
import type { CoachContext, CoachPersonality, BadHabit, UserProfile } from '../types';

// ─── Bad Habit Detection ────────────────────────────────────────────────────

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

export async function updateBadHabits(profile: UserProfile): Promise<BadHabit[]> {
  const habits = await detectBadHabits(profile);
  await db.profiles.update(profile.id, { badHabits: habits });
  return habits;
}

// ─── Post-Game Analysis ─────────────────────────────────────────────────────

export async function getPostGameAnalysis(
  context: CoachContext,
  personality: CoachPersonality,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('post_game_analysis', context, personality, onStream);
}

// ─── Daily Lesson ───────────────────────────────────────────────────────────

export async function getDailyLesson(
  context: CoachContext,
  personality: CoachPersonality,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('daily_lesson', context, personality, onStream);
}

// ─── Bad Habit Report ───────────────────────────────────────────────────────

export async function getBadHabitReport(
  context: CoachContext,
  personality: CoachPersonality,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('bad_habit_report', context, personality, onStream);
}

// ─── Weekly Report ──────────────────────────────────────────────────────────

export async function getWeeklyReport(
  context: CoachContext,
  personality: CoachPersonality,
  onStream?: (chunk: string) => void,
): Promise<string> {
  return getCoachCommentary('weekly_report', context, personality, onStream);
}

// ─── Build Context from Profile ─────────────────────────────────────────────

export function buildProfileContext(profile: UserProfile): CoachContext {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    lastMoveSan: null,
    moveNumber: 0,
    pgn: '',
    openingName: null,
    stockfishAnalysis: null,
    playerMove: null,
    moveClassification: null,
    playerProfile: {
      rating: profile.currentRating,
      style: profile.coachPersonality,
      weaknesses: profile.badHabits
        .filter((h) => !h.isResolved)
        .map((h) => h.description),
    },
  };
}
