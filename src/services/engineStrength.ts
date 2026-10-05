/**
 * engineStrength — ONE ENGINE STRENGTH (David 2026-10-04: "we need to unify
 * the strength of the engines").
 *
 * Before this module there were THREE difficulty offset tables answering the
 * same question three ways — puzzles ±200 (`studentPuzzleRating`), the Learn /
 * Openings opponent −300 / +200 with a 600 floor (`coachGameEngine`), and the
 * Play opponent −300 / +300 with a 400 floor (`coachPlaySession`). So "Hard"
 * meant +200 on one tab and +300 on the next, and "Easy" on Tactics was a
 * different distance from the student than "Easy" against the coach.
 *
 * Now there is one table, one floor and one target function, and every
 * opponent declares WHY it is playing (its purpose) in an exhaustive table with
 * no default — a new opponent surface fails to compile until someone decides
 * whether it spars, teaches, proves a position, or demonstrates at full
 * strength.
 *
 * Merging moved two numbers, stated here so it is not discovered later:
 *  - Play's "Hard" is now +200 (was +300) and its "Easy" −200 (was −300);
 *  - Learn / Openings "Easy" is now −200 (was −300) and the floor 400 (was 600).
 *
 * Pure leaf: imports only other leaves (no Dexie, no store, no engine).
 */
import { DEFAULT_STUDENT_RATING } from './ratingBands';
import { limitStrengthElo } from './engineConstants';
import { emitOpponentMove } from './opponentMoveEvents';

/** The three settings the student can choose. Easier / Matched / Harder. */
export type StrengthDifficulty = 'easy' | 'medium' | 'hard';

/** THE one offset table — puzzles and every opponent read it. A `Record` over
 *  the union, so a fourth setting fails to compile until it has an answer. */
export const DIFFICULTY_OFFSET: Readonly<Record<StrengthDifficulty, number>> = {
  easy: -200,
  medium: 0,
  hard: 200,
};

/** THE one floor. The same number the live estimate clamps at, so a target
 *  can never sit below a rating the estimator can express. */
export const STRENGTH_FLOOR = 400;

/** The offset for a setting. `'auto'` (a chat request that named no
 *  difficulty) and an absent setting are Matched. */
export function difficultyOffset(difficulty: StrengthDifficulty | 'auto' | undefined): number {
  if (difficulty === undefined || difficulty === 'auto') return 0;
  return DIFFICULTY_OFFSET[difficulty];
}

/** The opponent's target rating: the student's strength plus their chosen
 *  offset, floored. The one formula every sparring opponent uses. */
export function targetStrength(studentElo: number, difficulty: StrengthDifficulty | 'auto' | undefined): number {
  return Math.max(STRENGTH_FLOOR, Math.round(studentElo + difficultyOffset(difficulty)));
}

/**
 * Why an opponent is on the board.
 *  - `spar`     — a game against the student, matched to them.
 *  - `lesson`   — a game steered toward today's lesson, still matched (the
 *                 steering layer is a later phase; the purpose exists so the
 *                 surface can declare it).
 *  - `play-out` — the student proving a position; may carry a deliberate
 *                 offset (a proof against a weak defender proves little).
 *  - `demo`     — the engine showing good chess at FULL strength. Never matched.
 */
export type OpponentPurpose = 'spar' | 'lesson' | 'play-out' | 'demo';

/** Every place an engine plays moves on the student's board. */
export type OpponentSurface =
  | 'learn'                    // /coach/teach free play (getAdaptiveMove)
  | 'play'                     // /coach/play (fast path + getAdaptiveMove fallback)
  | 'opening-play'             // WLPP Play rung (OpeningPlayMode)
  | 'mistake-puzzle-freeplay'  // "keep playing" after a mistake puzzle
  | 'endgame-playout'          // useEndgamePlayout engine fallback (6 callers)
  | 'watch-play-out'           // Learn's "watch it play out" demo
  | 'punish-playout'           // the punishment line played out
  | 'opening-matchup'          // White-vs-Black matchup construction
  | 'model-game-explore'       // ModelGameViewer explore replies
  | 'middlegame-practice';     // MiddlegamePractice engine side

/** THE purpose table. Exhaustive, no default: a new surface does not compile
 *  until it declares one. */
export const OPPONENT_PURPOSE: Readonly<Record<OpponentSurface, OpponentPurpose>> = {
  'learn': 'spar',
  'play': 'spar',
  'opening-play': 'spar',
  'mistake-puzzle-freeplay': 'play-out',
  'endgame-playout': 'play-out',
  'watch-play-out': 'demo',
  'punish-playout': 'demo',
  'opening-matchup': 'demo',
  'model-game-explore': 'demo',
  'middlegame-practice': 'demo',
};

/** Everything that decided one opponent's strength — the input to the engine
 *  AND the row the audit reads, so the two cannot disagree. */
export interface OpponentStrength {
  surface: OpponentSurface;
  purpose: OpponentPurpose;
  /** The student's strength the target was built from (the live estimate
   *  where the surface has one, else the one adaptive rating). */
  studentElo: number;
  difficulty: StrengthDifficulty | 'auto';
  offset: number;
  /** The target rating, or `null` for a demo — full strength, no cap. */
  target: number | null;
}

/** Resolve one opponent's strength from the one table. */
export function opponentStrength(
  surface: OpponentSurface,
  studentElo: number,
  difficulty: StrengthDifficulty | 'auto' | undefined,
): OpponentStrength {
  const purpose = OPPONENT_PURPOSE[surface];
  const setting = difficulty ?? 'auto';
  if (purpose === 'demo') {
    return { surface, purpose, studentElo: Math.round(studentElo), difficulty: setting, offset: 0, target: null };
  }
  return {
    surface,
    purpose,
    studentElo: Math.round(studentElo),
    difficulty: setting,
    offset: difficultyOffset(setting),
    target: targetStrength(studentElo, setting),
  };
}

/** The Elo the engine is actually limited to for a target (`UCI_Elo` cannot go
 *  below its own floor), or null at full strength. */
export function engineEloFor(strength: OpponentStrength): number | null {
  return strength.target === null ? null : limitStrengthElo(strength.target);
}

/** Publish one opponent move at its strength — the ONE emission every engine
 *  opponent makes, so the audit can hold that they all read the same number. */
export function emitOpponentStrength(strength: OpponentStrength, source: string): void {
  emitOpponentMove({
    surface: strength.surface,
    purpose: strength.purpose,
    studentElo: strength.studentElo,
    difficulty: strength.difficulty,
    offset: strength.offset,
    target: strength.target,
    engineElo: engineEloFor(strength),
    source,
  });
}

/**
 * How strong the student is AS A PLAYER — the seed every opponent is matched
 * against before the live estimate has moved.
 *
 * 🔒 ONE OWNER (moved here from `coachGameEngine`, 2026-10-04). `currentRating`
 * is the playing rating — set by the student and re-written at every boot by
 * `calibrateStrength` from the adaptive estimate (`getPlayerRatingEstimate`).
 * `puzzleRating` is the tactics Elo, a different skill that runs high; it was
 * the source of "the computer seemed to be playing a lot of best moves" (David
 * 2026-08-11) on the surfaces that read it. Only when no playing rating exists
 * does the puzzle rating stand in — a poor proxy, but better than a constant,
 * and a fresh profile has them equal anyway.
 */
export function studentPlayingRating(
  profile: { currentRating?: number | null; puzzleRating?: number | null } | null | undefined,
): number {
  const set = profile?.currentRating;
  if (typeof set === 'number' && Number.isFinite(set) && set > 0) return set;
  const puzzles = profile?.puzzleRating;
  if (typeof puzzles === 'number' && Number.isFinite(puzzles) && puzzles > 0) return puzzles;
  // THE ONE DEFAULT (the app serves beginners — David 2026-09-23).
  return DEFAULT_STUDENT_RATING;
}
