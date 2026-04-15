/**
 * coachPlaySession
 * ----------------
 * State machine for "Play X against me" — the user plays a full game
 * against Stockfish while the coach narrates after each move.
 *
 * Difficulty is ELO-relative to the player's actual rating
 * (see `playerRatingService`):
 *
 *   - 'easy'    → target ELO = playerELO − 300 (comfortable practice)
 *   - 'medium'  → target ELO = playerELO     (realistic match)
 *   - 'hard'    → target ELO = playerELO + 300 (stretch game)
 *   - 'auto'    → same as 'medium'
 *
 * Target ELO is mapped onto Stockfish skill (0–20) + move time by
 * linear interpolation between anchor points, so a player at 1450 sees
 * a genuinely different setup than a player at 950.
 */
import { stockfishEngine } from './stockfishEngine';
import { pickBookMove, bookMoveToSquares, isBookMoveLegal } from './coachBookMove';
import type { CoachDifficulty } from './coachAgent';

export interface PlaySessionConfig {
  /** Stockfish skill level 0–20. */
  skill: number;
  /** Move time in ms. Higher = stronger. */
  moveTimeMs: number;
  /** Effective ELO the engine is trying to play at. */
  targetElo: number;
  /** User-facing label, e.g. "Medium (~1450)". */
  label: string;
}

/** ELO → (skill, moveTimeMs) anchors. Linearly interpolated between. */
const ELO_ANCHORS: ReadonlyArray<{ elo: number; skill: number; moveTimeMs: number }> = [
  { elo: 800, skill: 1, moveTimeMs: 100 },
  { elo: 1200, skill: 5, moveTimeMs: 250 },
  { elo: 1500, skill: 9, moveTimeMs: 500 },
  { elo: 1800, skill: 13, moveTimeMs: 800 },
  { elo: 2100, skill: 17, moveTimeMs: 1200 },
  { elo: 2400, skill: 20, moveTimeMs: 2000 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a target ELO onto a Stockfish config via linear interpolation
 * between the anchor points. Clamps at the extremes so absurd ratings
 * (ELO 200, ELO 3500) still produce a usable setup.
 */
export function configFromTargetElo(targetElo: number): PlaySessionConfig {
  const clamped = Math.max(
    ELO_ANCHORS[0].elo,
    Math.min(ELO_ANCHORS[ELO_ANCHORS.length - 1].elo, targetElo),
  );

  // Find bracketing anchors.
  let lo = ELO_ANCHORS[0];
  let hi = ELO_ANCHORS[ELO_ANCHORS.length - 1];
  for (let i = 0; i < ELO_ANCHORS.length - 1; i += 1) {
    if (clamped >= ELO_ANCHORS[i].elo && clamped <= ELO_ANCHORS[i + 1].elo) {
      lo = ELO_ANCHORS[i];
      hi = ELO_ANCHORS[i + 1];
      break;
    }
  }

  const span = hi.elo - lo.elo;
  const t = span === 0 ? 0 : (clamped - lo.elo) / span;
  const skill = Math.round(lerp(lo.skill, hi.skill, t));
  const moveTimeMs = Math.round(lerp(lo.moveTimeMs, hi.moveTimeMs, t));

  return {
    skill: Math.max(0, Math.min(20, skill)),
    moveTimeMs: Math.max(50, moveTimeMs),
    targetElo,
    label: `~${targetElo}`,
  };
}

const DIFFICULTY_OFFSET: Record<CoachDifficulty, number> = {
  easy: -300,
  medium: 0,
  hard: 300,
  auto: 0,
};

const DIFFICULTY_NAME: Record<CoachDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  auto: 'Medium',
};

/**
 * Resolve the effective Stockfish config from a chosen difficulty and
 * the player's actual ELO. Target ELO is player rating plus the
 * difficulty offset (±300 for easy/hard, 0 for medium/auto).
 *
 * @param difficulty chosen difficulty; defaults to 'auto' (= medium)
 * @param playerElo  the player's effective ELO from `getPlayerRating`
 */
export function resolveConfig(
  difficulty: CoachDifficulty | undefined,
  playerElo: number,
): PlaySessionConfig {
  const effective = difficulty ?? 'auto';
  const offset = DIFFICULTY_OFFSET[effective];
  const targetElo = Math.max(400, Math.round(playerElo + offset));
  const base = configFromTargetElo(targetElo);
  return {
    ...base,
    label: `${DIFFICULTY_NAME[effective]} (~${targetElo})`,
  };
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
 * instead of whatever Stockfish-at-low-skill happens to prefer). At the
 * strongest strengths we skip the book and ask the engine directly so
 * the user faces max-strength play throughout.
 */
export async function getCoachMove(
  fen: string,
  config: PlaySessionConfig,
): Promise<CoachMoveResult> {
  await setSkill(config.skill);

  // Book moves apply below full strength. At skill 20 we want pure
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
