import type { SrsGrade, SrsResult } from '../types';

// SM-2 algorithm — same as Anki
// https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const EASE_BONUS = 0.1;

/**
 * Calculates the next SRS interval based on SM-2.
 */
export function calculateNextInterval(
  grade: SrsGrade,
  currentInterval: number,
  easeFactor: number,
  repetitions: number,
): SrsResult {
  const q = gradeToQuality(grade);
  let newRepetitions: number;
  let newInterval: number;
  let newEaseFactor: number;

  if (q < 3) {
    // Failed — reset repetitions, restart interval
    newRepetitions = 0;
    newInterval = 1;
    newEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    // Passed
    newRepetitions = repetitions + 1;
    newEaseFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
    );

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * newEaseFactor);
    }

    // Bonus for Easy
    if (grade === 'easy') {
      newInterval = Math.round(newInterval * (1 + EASE_BONUS));
      newEaseFactor = Math.min(newEaseFactor + 0.15, 3.0);
    }
  }

  const dueDate = getFutureDate(newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
    dueDate,
  };
}

/**
 * Creates default SRS fields for a new card.
 */
export function createDefaultSrsFields(): Pick<
  SrsResult,
  'interval' | 'easeFactor' | 'repetitions' | 'dueDate'
> {
  return {
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    repetitions: 0,
    dueDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * Returns true if a card is due for review today or earlier.
 */
export function isCardDue(srsDueDate: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return srsDueDate <= today;
}

/**
 * Converts a human-readable grade to SM-2 quality score (0–5).
 */
function gradeToQuality(grade: SrsGrade): number {
  switch (grade) {
    case 'again': return 1;
    case 'hard':  return 3;
    case 'good':  return 4;
    case 'easy':  return 5;
  }
}

/**
 * Returns an ISO date string N days in the future.
 */
function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Returns the display label for a grade button (e.g. "Good · 4d").
 */
export function getGradeLabel(
  grade: SrsGrade,
  currentInterval: number,
  easeFactor: number,
  repetitions: number,
): string {
  const result = calculateNextInterval(grade, currentInterval, easeFactor, repetitions);
  const label = grade.charAt(0).toUpperCase() + grade.slice(1);
  return `${label} · ${formatInterval(result.interval)}`;
}

function formatInterval(days: number): string {
  if (days === 0) return 'now';
  if (days === 1) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}
