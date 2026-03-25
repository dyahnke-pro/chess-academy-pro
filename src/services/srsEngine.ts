import type { SrsGrade, SrsResult } from '../types';

// FSRS-4.5 algorithm — Free Spaced Repetition Scheduler
// https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
//
// We store FSRS state in the existing SrsResult fields:
//   interval   → scheduled days until next review
//   easeFactor → FSRS stability (days to reach 90% retention) × 100 (stored ×100 to stay float-safe)
//   repetitions→ FSRS review count (0 = new card)
//   dueDate    → ISO date of next review

// ── FSRS-4.5 optimised weights (from open-spaced-repetition defaults) ─────
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0589,
  1.4351, 0.1544, 1.0071, 1.9395, 0.1100, 0.2900, 2.2700, 0.2400, 2.9898,
];

const DESIRED_RETENTION = 0.9; // 90% target recall rate
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // ≈ 0.0000 (internal constant)

// Grade → rating (1=Again, 2=Hard, 3=Good, 4=Easy)
function gradeToRating(grade: SrsGrade): 1 | 2 | 3 | 4 {
  switch (grade) {
    case 'again': return 1;
    case 'hard':  return 2;
    case 'good':  return 3;
    case 'easy':  return 4;
  }
}

// Initial stability for new cards by first grade
function initialStability(rating: 1 | 2 | 3 | 4): number {
  return Math.max(W[rating - 1], 0.1);
}

// Retrievability at elapsed days given stability
function retrievability(elapsed: number, stability: number): number {
  return Math.pow(1 + FACTOR * elapsed / stability, DECAY);
}

// Next stability after a successful recall
function stabilityAfterRecall(
  difficulty: number,
  stability: number,
  retrievability_: number,
  rating: 2 | 3 | 4, // hard, good, easy
): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus  = rating === 4 ? W[16] : 1;
  return stability * (
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp((1 - retrievability_) * W[10]) - 1) *
    hardPenalty *
    easyBonus + 1
  );
}

// Next stability after forgetting (again)
function stabilityAfterForgetting(
  difficulty: number,
  stability: number,
  retrievability_: number,
): number {
  return (
    W[11] *
    Math.pow(difficulty, -W[12]) *
    (Math.pow(stability + 1, W[13]) - 1) *
    Math.exp((1 - retrievability_) * W[14])
  );
}

// Convert stability (days at 90% retention) to scheduled interval
function scheduledInterval(stability: number): number {
  const interval = Math.round(
    (stability / FACTOR) * (Math.pow(DESIRED_RETENTION, 1 / DECAY) - 1),
  );
  return Math.max(interval, 1);
}

// ── Decode/encode stored fields ──────────────────────────────────────────────
//
// We reuse the SrsResult fields as follows:
//   easeFactor → stability × 100 (stored as integer centistability)
//   repetitions → FSRS repetition count (0 = new)
//
// A legacy SM-2 card (easeFactor ≈ 2.5) is treated as a new card on first FSRS review.

function decodeStability(easeFactor: number): number {
  // FSRS stabilities start at >0 and are stored ×100.
  // Old SM-2 ease factors are ≤3.0 — treat as new card.
  if (easeFactor < 10) return 0; // legacy/new card
  return easeFactor / 100;
}

function encodeStability(stability: number): number {
  return Math.round(stability * 100);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculates the next SRS interval using FSRS-4.5.
 *
 * Field mapping (for external compatibility):
 *   easeFactor   → stability × 100 (centistability)
 *   repetitions  → number of reviews completed
 *   interval     → days until next review
 */
export function calculateNextInterval(
  grade: SrsGrade,
  currentInterval: number,
  easeFactor: number,
  repetitions: number,
): SrsResult {
  const rating = gradeToRating(grade);
  const rawStability = decodeStability(easeFactor);
  const isNew = repetitions === 0 || rawStability === 0;

  let newStability: number;
  let newRepetitions: number;

  if (isNew) {
    // First review — use initial values
    newStability = initialStability(rating);
    newRepetitions = rating === 1 ? 0 : 1;
  } else {
    const elapsed = Math.max(currentInterval, 0);
    const ret = retrievability(elapsed, rawStability);

    // difficulty isn't stored separately in SrsResult, so approximate at mid-range (5).
    // Full FSRS would require a dedicated difficulty field per card.
    const difficulty = 5;

    if (rating === 1) {
      // Forgotten — reset
      newStability = stabilityAfterForgetting(difficulty, rawStability, ret);
      newRepetitions = 0;
    } else {
      newStability = stabilityAfterRecall(difficulty, rawStability, ret, rating);
      newRepetitions = repetitions + 1;
    }
  }

  const interval = scheduledInterval(newStability);
  const dueDate = getFutureDate(interval);

  return {
    interval,
    easeFactor: encodeStability(newStability),
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
    easeFactor: 0, // 0 = new card (stability not yet set)
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

function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}
