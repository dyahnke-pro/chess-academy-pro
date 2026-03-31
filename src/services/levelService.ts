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
