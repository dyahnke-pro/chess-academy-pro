/**
 * coachPlaySession
 * ----------------
 * State machine for "Play X against me" — the user plays a full game
 * against Stockfish while the coach narrates after each move.
 *
 * Difficulty:
 *   - 'auto'    → rating-matched: mapped from the user's current rating
 *   - 'easy'    → Stockfish skill 3, 200ms
 *   - 'medium'  → Stockfish skill 10, 600ms
 *   - 'hard'    → Stockfish skill 20, 1500ms
 *
 * This is a framework-agnostic service. The React page calls
 * `configureForDifficulty` once at session start and then
 * `getCoachMove(fen)` after each user move.
 */
import { stockfishEngine } from './stockfishEngine';
import { pickBookMove, bookMoveToSquares, isBookMoveLegal } from './coachBookMove';
import type { CoachDifficulty } from './coachAgent';

export interface PlaySessionConfig {
  /** Stockfish skill level 0–20. */
  skill: number;
  /** Move time in ms. Higher = stronger. */
  moveTimeMs: number;
  /** User-facing label for the HUD. */
  label: string;
}

/**
 * Rating-matched config. Maps a user rating (ELO-ish) into a reasonable
 * Stockfish skill/time combo so club players aren't crushed by full-
 * strength play.
 */
export function configFromRating(rating: number | undefined): PlaySessionConfig {
  const r = rating ?? 1200;
  if (r < 900) return { skill: 2, moveTimeMs: 150, label: 'Level: friendly' };
  if (r < 1200) return { skill: 5, moveTimeMs: 250, label: 'Level: casual' };
  if (r < 1500) return { skill: 9, moveTimeMs: 500, label: 'Level: club' };
  if (r < 1800) return { skill: 13, moveTimeMs: 800, label: 'Level: strong' };
  if (r < 2100) return { skill: 17, moveTimeMs: 1200, label: 'Level: expert' };
  return { skill: 20, moveTimeMs: 1500, label: 'Level: master' };
}

/**
 * Explicit difficulty picker config. Overrides rating match.
 */
export function configForDifficulty(difficulty: CoachDifficulty): PlaySessionConfig {
  switch (difficulty) {
    case 'easy':
      return { skill: 3, moveTimeMs: 200, label: 'Easy' };
    case 'medium':
      return { skill: 10, moveTimeMs: 600, label: 'Medium' };
    case 'hard':
      return { skill: 20, moveTimeMs: 1500, label: 'Hard' };
    case 'auto':
    default:
      // Caller should pass rating to configFromRating for 'auto';
      // if they didn't, fall back to medium.
      return { skill: 10, moveTimeMs: 600, label: 'Medium' };
  }
}

/**
 * Decide the effective config, preferring explicit difficulty, falling
 * back to rating-matched when difficulty is 'auto'.
 */
export function resolveConfig(
  difficulty: CoachDifficulty | undefined,
  rating: number | undefined,
): PlaySessionConfig {
  if (!difficulty || difficulty === 'auto') return configFromRating(rating);
  return configForDifficulty(difficulty);
}

export interface CoachMoveResult {
  /** UCI move string, e.g. "e2e4" or "e7e8q". */
  uci: string;
  /** Source + target squares parsed from UCI. */
  from: string;
  to: string;
  promotion?: string;
}

function parseUci(uci: string): CoachMoveResult {
  return {
    uci,
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

/**
 * Ask the coach for its next move. In the opening phase we consult the
 * Lichess Opening Explorer so play feels natural (real popular replies
 * instead of whatever Stockfish-at-low-skill happens to prefer). At
 * `hard` difficulty we skip the book and ask the engine directly so
 * the user faces max strength throughout.
 */
export async function getCoachMove(
  fen: string,
  config: PlaySessionConfig,
): Promise<CoachMoveResult> {
  await setSkill(config.skill);

  // Book moves apply at easy/medium strengths. At hard we want pure
  // engine play so the user can't coast on rote theory.
  if (config.skill < 20) {
    const book = await pickBookMove(fen);
    if (book && isBookMoveLegal(fen, book)) {
      const squares = bookMoveToSquares(book);
      if (squares) {
        return {
          uci: book.uci,
          from: squares.from,
          to: squares.to,
          promotion: squares.promotion,
        };
      }
    }
  }

  const uci = await stockfishEngine.getBestMove(fen, config.moveTimeMs);
  return parseUci(uci);
}

/**
 * Send a UCI "setoption name Skill Level value N" command. Safe to
 * call multiple times — idempotent if the skill is unchanged.
 */
let _currentSkill: number | null = null;
export async function setSkill(skill: number): Promise<void> {
  if (_currentSkill === skill) return;
  const engine = stockfishEngine as unknown as {
    initialize: () => Promise<void>;
    send?: (msg: string) => void;
    _send?: (msg: string) => void;
  };
  try {
    await engine.initialize();
    const send = engine.send ?? engine._send;
    if (typeof send === 'function') {
      send.call(engine, `setoption name Skill Level value ${skill}`);
      _currentSkill = skill;
    }
  } catch {
    // Stockfish unavailable (e.g. in tests/jsdom). Silently skip —
    // the engine will be retried on getBestMove.
  }
}

/** Reset internal skill cache — tests only. */
export function __resetSkillCacheForTests(): void {
  _currentSkill = null;
}
