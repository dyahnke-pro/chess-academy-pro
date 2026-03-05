import { db } from '../db/schema';
import type { Achievement, UserProfile } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_puzzle',
    name: 'First Steps',
    description: 'Attempt your first puzzle',
    icon: '🐣',
    condition: (p) => p.puzzleRating > 0 || p.xp > 0,
    xpReward: 50,
  },
  {
    id: 'ten_puzzles',
    name: 'Puzzle Enthusiast',
    description: 'Attempt 10 puzzles',
    icon: '🧩',
    condition: () => false, // checked via DB stats
    xpReward: 100,
  },
  {
    id: 'hundred_puzzles',
    name: 'Puzzle Master',
    description: 'Attempt 100 puzzles',
    icon: '🏆',
    condition: () => false,
    xpReward: 250,
  },
  {
    id: 'perfect_session',
    name: 'Perfect Session',
    description: 'Complete a session with 100% accuracy',
    icon: '💯',
    condition: () => false,
    xpReward: 200,
  },
  {
    id: 'streak_3',
    name: 'Hat Trick',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    condition: (p) => p.currentStreak >= 3,
    xpReward: 100,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    condition: (p) => p.currentStreak >= 7,
    xpReward: 200,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    condition: (p) => p.currentStreak >= 30,
    xpReward: 500,
  },
  {
    id: 'reach_1500',
    name: 'Rising Star',
    description: 'Reach 1500 puzzle rating',
    icon: '⭐',
    condition: (p) => p.puzzleRating >= 1500,
    xpReward: 150,
  },
  {
    id: 'reach_1800',
    name: 'Advanced Player',
    description: 'Reach 1800 puzzle rating',
    icon: '🌟',
    condition: (p) => p.puzzleRating >= 1800,
    xpReward: 300,
  },
  {
    id: 'reach_2000',
    name: 'Expert',
    description: 'Reach 2000 puzzle rating',
    icon: '💎',
    condition: (p) => p.puzzleRating >= 2000,
    xpReward: 500,
  },
  {
    id: 'coach_session',
    name: "Coach's Pet",
    description: 'Use the AI coach',
    icon: '🎓',
    condition: (p) => p.xp > 0,
    xpReward: 100,
  },
  {
    id: 'first_coach_win',
    name: 'First Victory',
    description: 'Win your first game vs the coach',
    icon: '🥇',
    condition: () => false, // checked via DB stats
    xpReward: 150,
  },
  {
    id: 'coach_win_streak_3',
    name: 'Unstoppable',
    description: 'Win 3 games vs the coach',
    icon: '🏅',
    condition: () => false,
    xpReward: 250,
  },
  {
    id: 'beat_hard',
    name: 'Giant Slayer',
    description: 'Win a game on Hard difficulty',
    icon: '⚔️',
    condition: () => false,
    xpReward: 300,
  },
  {
    id: 'no_hints',
    name: 'Solo Thinker',
    description: 'Win a game without using hints',
    icon: '🧠',
    condition: () => false,
    xpReward: 200,
  },
  {
    id: 'kid_piece_master',
    name: 'Piece Scholar',
    description: 'Complete all 6 piece lessons in Kid Mode',
    icon: '♟️',
    condition: () => false,
    xpReward: 100,
  },
  {
    id: 'all_themes',
    name: 'Theme Collector',
    description: 'Earn 5 or more achievements',
    icon: '🎨',
    condition: (p) => p.achievements.length >= 5,
    xpReward: 150,
  },
];

const LEVEL_TITLES: Record<number, string> = {
  1: 'Beginner',
  2: 'Pawn',
  3: 'Knight',
  4: 'Bishop',
  5: 'Rook',
  6: 'Queen',
};

const XP_PER_LEVEL = 500;

export function getLevelTitle(level: number): string {
  if (level >= 7) return 'Grandmaster';
  return LEVEL_TITLES[level] ?? 'Beginner';
}

export function getXpToNextLevel(xp: number): { current: number; needed: number; percent: number } {
  const current = xp % XP_PER_LEVEL;
  const needed = XP_PER_LEVEL;
  const percent = Math.round((current / needed) * 100);
  return { current, needed, percent };
}

export async function checkAndAwardAchievements(profile: UserProfile): Promise<Achievement[]> {
  const newlyEarned: Achievement[] = [];

  // Get puzzle attempt count from DB for attempt-based achievements
  const puzzles = await db.puzzles.filter((p) => p.attempts > 0).toArray();
  const totalAttempts = puzzles.reduce((sum, p) => sum + p.attempts, 0);

  // Check session-based achievements
  const sessions = await db.sessions.toArray();
  const hasPerfectSession = sessions.some((s) => s.puzzleAccuracy === 100 && s.puzzlesSolved > 0);

  // Coach game stats
  const coachGames = await db.games.filter((g) => g.source === 'coach').toArray();
  const coachWins = coachGames.filter((g) => g.result === '1-0').length;
  const hasHardWin = coachGames.some(
    (g) => g.result === '1-0' && g.event.includes('Hard'),
  );
  const hasNoHintWin = coachGames.some(
    (g) => g.result === '1-0' && g.event.includes('NoHints'),
  );

  for (const achievement of ACHIEVEMENTS) {
    if (profile.achievements.includes(achievement.id)) continue;

    let earned = false;

    switch (achievement.id) {
      case 'ten_puzzles':
        earned = totalAttempts >= 10;
        break;
      case 'hundred_puzzles':
        earned = totalAttempts >= 100;
        break;
      case 'perfect_session':
        earned = hasPerfectSession;
        break;
      case 'first_coach_win':
        earned = coachWins >= 1;
        break;
      case 'coach_win_streak_3':
        earned = coachWins >= 3;
        break;
      case 'beat_hard':
        earned = hasHardWin;
        break;
      case 'no_hints':
        earned = hasNoHintWin;
        break;
      default:
        earned = achievement.condition(profile);
        break;
    }

    if (earned) {
      newlyEarned.push(achievement);
    }
  }

  if (newlyEarned.length > 0) {
    const updatedAchievements = [...profile.achievements, ...newlyEarned.map((a) => a.id)];
    const totalNewXp = newlyEarned.reduce((sum, a) => sum + a.xpReward, 0);
    const updatedXp = profile.xp + totalNewXp;
    const updatedLevel = Math.floor(updatedXp / XP_PER_LEVEL) + 1;

    await db.profiles.update(profile.id, {
      achievements: updatedAchievements,
      xp: updatedXp,
      level: updatedLevel,
    });
  }

  return newlyEarned;
}
