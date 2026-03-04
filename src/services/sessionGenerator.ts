import { getWeakestThemes } from './puzzleService';
import { getWeakestOpenings } from './openingService';
import { db } from '../db/schema';
import type { SessionPlan, SessionBlock, SessionRecord, UserProfile } from '../types';

export async function generateDailySession(profile: UserProfile): Promise<SessionPlan> {
  const totalMinutes = profile.preferences.dailySessionMinutes;

  // Determine block allocations (25% openings, 35% puzzles, 15% flashcards, 25% analysis)
  const openingMinutes = Math.round(totalMinutes * 0.25);
  const puzzleMinutes = Math.round(totalMinutes * 0.35);
  const flashcardMinutes = Math.round(totalMinutes * 0.15);
  const analysisMinutes = totalMinutes - openingMinutes - puzzleMinutes - flashcardMinutes;

  const blocks: SessionBlock[] = [];

  // 1. Opening review — use weakest opening
  const weakOpenings = await getWeakestOpenings(1);
  blocks.push({
    type: 'opening_review',
    targetMinutes: openingMinutes,
    openingId: weakOpenings.length > 0 ? weakOpenings[0].id : undefined,
    completed: false,
  });

  // 2. Puzzle drill — use weakest theme
  const weakThemes = await getWeakestThemes(1);
  blocks.push({
    type: 'puzzle_drill',
    targetMinutes: puzzleMinutes,
    puzzleTheme: weakThemes.length > 0 ? weakThemes[0] : 'fork',
    completed: false,
  });

  // 3. Flashcards
  blocks.push({
    type: 'flashcards',
    targetMinutes: flashcardMinutes,
    completed: false,
  });

  // 4. Game analysis / endgame drill
  blocks.push({
    type: 'endgame_drill',
    targetMinutes: analysisMinutes,
    completed: false,
  });

  return { blocks, totalMinutes };
}

export async function createSession(profile: UserProfile): Promise<SessionRecord> {
  const plan = await generateDailySession(profile);
  const today = new Date().toISOString().split('T')[0];

  const session: SessionRecord = {
    id: `session-${Date.now()}`,
    date: today,
    profileId: profile.id,
    durationMinutes: 0,
    plan,
    completed: false,
    puzzlesSolved: 0,
    puzzleAccuracy: 0,
    xpEarned: 0,
    coachSummary: null,
  };

  await db.sessions.put(session);
  return session;
}

export async function completeSession(
  sessionId: string,
  stats: { puzzlesSolved: number; puzzleAccuracy: number; durationMinutes: number },
): Promise<number> {
  // Calculate XP: base 50 + 10 per puzzle + accuracy bonus
  const baseXp = 50;
  const puzzleXp = stats.puzzlesSolved * 10;
  const accuracyBonus = stats.puzzleAccuracy >= 0.8 ? 25 : stats.puzzleAccuracy >= 0.6 ? 10 : 0;
  const totalXp = baseXp + puzzleXp + accuracyBonus;

  await db.sessions.update(sessionId, {
    completed: true,
    durationMinutes: stats.durationMinutes,
    puzzlesSolved: stats.puzzlesSolved,
    puzzleAccuracy: stats.puzzleAccuracy,
    xpEarned: totalXp,
  });

  return totalXp;
}

export async function updateStreak(profile: UserProfile): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const lastActive = profile.lastActiveDate;

  let currentStreak = profile.currentStreak;

  if (lastActive === today) {
    // Already active today
    return { currentStreak, longestStreak: profile.longestStreak };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastActive === yesterdayStr) {
    currentStreak += 1;
  } else {
    currentStreak = 1;
  }

  const longestStreak = Math.max(currentStreak, profile.longestStreak);

  await db.profiles.update(profile.id, {
    currentStreak,
    longestStreak,
    lastActiveDate: today,
  });

  return { currentStreak, longestStreak };
}

export async function getRecentSessions(limit: number = 7): Promise<SessionRecord[]> {
  return db.sessions
    .orderBy('date')
    .reverse()
    .limit(limit)
    .toArray();
}
