import { db } from '../db/schema';
import { getStoredWeaknessProfile } from './weaknessAnalyzer';
import { getFlashcardStats } from './flashcardService';
import { getWeakestOpenings } from './openingService';
import type { UserProfile, WeaknessCategory } from '../types';

export type TrainingType =
  | 'guided_lesson'
  | 'tactic_drill'
  | 'opening_review'
  | 'endgame_practice'
  | 'flashcard_review'
  | 'position_practice';

export interface TrainingRecommendation {
  id: string;
  type: TrainingType;
  title: string;
  description: string;
  priority: number;
  data: {
    gameId?: string;
    openingId?: string;
    puzzleTheme?: string;
    missedTacticTypes?: string[];
  };
  estimatedMinutes: number;
}

const CATEGORY_TO_TRAINING: Record<WeaknessCategory, TrainingType> = {
  tactics: 'tactic_drill',
  calculation: 'tactic_drill',
  openings: 'opening_review',
  opening_weakspots: 'opening_review',
  endgame: 'endgame_practice',
  positional: 'tactic_drill',
  time_management: 'tactic_drill',
};

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getCoachGreeting(profile: UserProfile): string {
  const greeting = getTimeOfDayGreeting();
  const name = profile.name;

  if (profile.currentStreak >= 7) {
    return `${greeting}, ${name}! You're on fire — ${profile.currentStreak}-day streak! Let's keep the momentum going.`;
  }
  if (profile.currentStreak >= 3) {
    return `${greeting}, ${name}! Nice streak — ${profile.currentStreak} days in a row. Let's sharpen your game.`;
  }
  return `${greeting}, ${name}! Let's sharpen your game.`;
}

export async function getTrainingRecommendations(
  profile: UserProfile
): Promise<TrainingRecommendation[]> {
  const recommendations: TrainingRecommendation[] = [];

  // 1. Recent coach game with coachAnalysis → guided_lesson
  try {
    const coachGames = await db.games
      .where('source')
      .equals('coach')
      .reverse()
      .sortBy('date');

    const analyzedGame = coachGames.find((g) => g.coachAnalysis !== null);
    if (analyzedGame) {
      recommendations.push({
        id: `guided-${analyzedGame.id}`,
        type: 'guided_lesson',
        title: 'Review Your Last Coach Game',
        description: `Walk through your recent game and learn from key moments.`,
        priority: 1,
        data: { gameId: analyzedGame.id },
        estimatedMinutes: 10,
      });
    }
  } catch {
    // graceful failure — skip guided lesson
  }

  // 2. Weakness profile → targeted drills
  let hasWeaknessRecs = false;
  try {
    const weaknessProfile = await getStoredWeaknessProfile();
    if (weaknessProfile && weaknessProfile.items.length > 0) {
      const topWeakness = weaknessProfile.items[0];
      const trainingType = CATEGORY_TO_TRAINING[topWeakness.category];
      recommendations.push({
        id: `weakness-${topWeakness.category}`,
        type: trainingType,
        title: `Work on ${topWeakness.label}`,
        description: topWeakness.detail,
        priority: 2,
        data: { puzzleTheme: topWeakness.category },
        estimatedMinutes: 15,
      });
      hasWeaknessRecs = true;

      // Second weakness if severity > 60
      if (weaknessProfile.items.length > 1) {
        const secondWeakness = weaknessProfile.items[1];
        if (secondWeakness.severity > 60) {
          const secondType = CATEGORY_TO_TRAINING[secondWeakness.category];
          recommendations.push({
            id: `weakness-${secondWeakness.category}`,
            type: secondType,
            title: `Work on ${secondWeakness.label}`,
            description: secondWeakness.detail,
            priority: 4,
            data: { puzzleTheme: secondWeakness.category },
            estimatedMinutes: 10,
          });
        }
      }
    }
  } catch {
    // graceful failure — skip weakness drills
  }

  // 3. Flashcard review if due > 5
  try {
    const flashcardStats = await getFlashcardStats();
    if (flashcardStats.due > 5) {
      recommendations.push({
        id: 'flashcard-review',
        type: 'flashcard_review',
        title: 'Review Due Flashcards',
        description: `You have ${flashcardStats.due} flashcards waiting for review.`,
        priority: 3,
        data: {},
        estimatedMinutes: 10,
      });
    }
  } catch {
    // graceful failure — skip flashcard review
  }

  // 4. Bad habits → tactic_drill (only if no weakness recs)
  if (!hasWeaknessRecs) {
    const unresolvedHabits = profile.badHabits.filter((h) => !h.isResolved);
    if (unresolvedHabits.length > 0) {
      recommendations.push({
        id: 'bad-habit-drill',
        type: 'tactic_drill',
        title: 'Break a Bad Habit',
        description: `Focus on avoiding: ${unresolvedHabits[0].description}`,
        priority: 3,
        data: { missedTacticTypes: unresolvedHabits.map((h) => h.description) },
        estimatedMinutes: 10,
      });
    }
  }

  // 5. Weakest opening → opening_review (only if no opening_review already)
  const hasOpeningReview = recommendations.some(
    (r) => r.type === 'opening_review'
  );
  if (!hasOpeningReview) {
    try {
      const weakOpenings = await getWeakestOpenings(1);
      if (weakOpenings.length > 0) {
        const opening = weakOpenings[0];
        recommendations.push({
          id: `opening-${opening.id}`,
          type: 'opening_review',
          title: `Drill: ${opening.name}`,
          description: `Strengthen your weakest opening line.`,
          priority: 4,
          data: { openingId: opening.id },
          estimatedMinutes: 10,
        });
      }
    } catch {
      // graceful failure — skip opening review
    }
  }

  // Sort by priority, return top 3
  recommendations.sort((a, b) => a.priority - b.priority);
  return recommendations.slice(0, 3);
}
