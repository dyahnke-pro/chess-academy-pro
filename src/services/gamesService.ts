import type { OpeningRecord } from '../types';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

// ─── Scoring ─────────────────────────────────────────────────────────────────

type GuessGrade = 'brilliant' | 'great' | 'good' | 'miss';

export function gradeGuess(evalDelta: number): GuessGrade {
  const absDelta = Math.abs(evalDelta);
  if (absDelta < 10) return 'brilliant';
  if (absDelta < 30) return 'great';
  if (absDelta < 60) return 'good';
  return 'miss';
}

export function getStars(mistakes: number, hintsUsed: number): number {
  const total = mistakes + hintsUsed;
  if (total === 0) return 3;
  if (total <= 2) return 2;
  return 1;
}

// ─── Encouraging Messages ────────────────────────────────────────────────────

const WRONG_MOVE_MESSAGES = [
  'Almost! Think about controlling the center here.',
  'Good instinct, but there\'s a move that fits the plan better.',
  'Not quite — try thinking about piece development.',
  'Close! What piece needs to come out next?',
  'The idea is right, but the move order matters here.',
  'Think about what square your piece wants to reach.',
  'You\'re on the right track — try a different piece.',
  'Remember the opening\'s key ideas here.',
];

const CORRECT_MOVE_MESSAGES = [
  'That\'s the one!',
  'Nice move!',
  'Exactly right!',
  'You\'ve got it!',
  'Well played!',
  'Spot on!',
  'Perfect!',
  'Great!',
];

const WELCOME_TEMPLATES = [
  'Let\'s play through the {name}! Play the correct moves for {color}.',
  'Time to practice the {name}! You\'re playing {color}.',
  'Let\'s see how well you know the {name}. You\'ve got {color}.',
];

export function getWrongMoveMessage(opening: OpeningRecord, moveIndex: number): string {
  const base = WRONG_MOVE_MESSAGES[moveIndex % WRONG_MOVE_MESSAGES.length];
  if (opening.keyIdeas && opening.keyIdeas.length > 0) {
    // ROTATED, NOT ROLLED. The stem beside it already rotates on `moveIndex`;
    // this line rolled, so the same wrong move at the same point in the same
    // line quoted a different key idea each attempt — the one place a student
    // is repeating themselves on purpose and most needs to hear the same thing.
    const idea = opening.keyIdeas[moveIndex % opening.keyIdeas.length];
    // Every third wrong move, reference a key idea
    if (moveIndex % 3 === 2) {
      return `Remember: ${idea}. Try again!`;
    }
  }
  return base;
}

/** ROTATED, NOT ROLLED — `moveIndex` is the stable key, so walking the same
 *  line twice gives the same encouragement in the same order instead of a fresh
 *  shuffle. The parameter is REQUIRED rather than defaulted: a default is how a
 *  caller silently inherits a constant stem and the variety quietly dies. */
export function getCorrectMoveMessage(moveIndex: number): string {
  return rotateStem(CORRECT_MOVE_MESSAGES, moveIndex);
}

export function getWelcomeMessage(opening: OpeningRecord): string {
  // ROTATED, NOT ROLLED, keyed on the opening's own id — so each opening has
  // its own greeting and keeps it, rather than every visit re-rolling.
  const template = rotateStem(WELCOME_TEMPLATES, stemKeyOf(opening.id ?? opening.name));
  return template
    .replace('{name}', opening.name)
    .replace('{color}', opening.color === 'white' ? 'White' : 'Black');
}
