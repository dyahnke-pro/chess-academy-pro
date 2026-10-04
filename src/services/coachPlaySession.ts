/**
 * coachPlaySession
 * ----------------
 * State machine for "Play X against me" — the user plays a full game
 * against Stockfish while the coach narrates after each move.
 *
 * Difficulty is ELO-relative to the player's actual rating
 * (see `playerRatingService`):
 *
 *   - 'easy'    → target ELO = playerELO − 200 (comfortable practice)
 *   - 'medium'  → target ELO = playerELO     (realistic match)
 *   - 'hard'    → target ELO = playerELO + 200 (stretch game)
 *   - 'auto'    → same as 'medium'
 *
 * The offsets are THE ONE table in `engineStrength` (shared with puzzles and
 * every other opponent).
 *
 * Target ELO is mapped onto Stockfish skill (0–20) + move time by
 * linear interpolation between anchor points, so a player at 1450 sees
 * a genuinely different setup than a player at 950.
 */
import { Chess } from 'chess.js';
import { stockfishEngine } from './stockfishEngine';
import { pickBookMove, bookMoveToSquares, isBookMoveLegal } from './coachBookMove';
import { targetStrength, emitOpponentStrength, type OpponentStrength } from './engineStrength';
import type { RequestedDifficulty } from '../types';

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

/** ELO → (skill, moveTimeMs) anchors. Linearly interpolated between.
 *
 * 🔒 SKILL LEVEL IS NOT ELO, AND TREATING IT AS IF IT WERE HANDED A 1729
 * PLAYER A ~2500 OPPONENT (David 2026-08-11: "Computer seemed to be playing a
 * lot of best moves"). His game bears it out — through move 7 the coach played
 * real amateur moves off the rating band, then the book ran dry and every move
 * after that came from the engine at `skill=16`.
 *
 * Stockfish's own scale runs from roughly 1320 at skill 0 to roughly 2850 at
 * skill 20 — about 75 Elo per level. The old anchors read as though the scale
 * ran 800→2400 over the same range, so EVERY band was several hundred points
 * too strong, and the effect compounds exactly where a student notices it: an
 * opponent that never errs.
 *
 * These anchors are that real curve, inverted. Note the floor: skill 0 still
 * plays around 1320, so below that the number cannot go lower and the honest
 * levers are elsewhere (breaking book, the amateur bands, shorter movetime) —
 * which is why the sub-1300 anchors all sit at 0 rather than pretending.
 *
 * Move time is a SEPARATE axis and is unchanged; it is about how long the
 * student waits, not how well the engine plays.
 */
const ELO_ANCHORS: ReadonlyArray<{ elo: number; skill: number; moveTimeMs: number }> = [
  { elo: 800, skill: 0, moveTimeMs: 100 },
  { elo: 1200, skill: 0, moveTimeMs: 250 },
  { elo: 1500, skill: 2, moveTimeMs: 500 },
  { elo: 1800, skill: 6, moveTimeMs: 800 },
  { elo: 2100, skill: 10, moveTimeMs: 1200 },
  { elo: 2400, skill: 14, moveTimeMs: 2000 },
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

const DIFFICULTY_NAME: Record<RequestedDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  auto: 'Medium',
};

/**
 * Resolve the effective Stockfish config from a chosen difficulty and
 * the player's ELO. The target is THE ONE formula (`engineStrength
 * .targetStrength`): the student's rating plus the one offset table
 * (Easier −200 / Matched 0 / Harder +200), on the one floor. This file used to
 * carry its own ±300 table — "Hard" on Play was 100 points harder than "Hard"
 * on Learn for the same student.
 *
 * @param difficulty chosen difficulty; defaults to 'auto' (= medium)
 * @param playerElo  the student's strength — the live estimate where the
 *                   surface has one, else the one adaptive rating
 */
export function resolveConfig(
  difficulty: RequestedDifficulty | undefined,
  playerElo: number,
): PlaySessionConfig {
  const effective = difficulty ?? 'auto';
  const targetElo = targetStrength(playerElo, effective);
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

/** Last-resort move when the engine can't answer (dead / hung worker). The play
 *  surface must ALWAYS produce a move — a coach turn that never resolves freezes
 *  the board ("can't move any pieces", David 2026-09-07). A plain legal move
 *  keeps the game alive; this fires only on engine failure (rare), and the next
 *  turn gets a freshly respawned worker via `getBestMove`'s `forceRestart`. */
function fallbackLegalMove(fen: string): CoachMoveResult {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return { uci: '', from: '', to: '' };
  const pick = moves[Math.floor(Math.random() * moves.length)];
  return {
    uci: `${pick.from}${pick.to}${pick.promotion ?? ''}`,
    from: pick.from,
    to: pick.to,
    promotion: pick.promotion,
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
  /** Who asked and why — the ONE structured emission (`coach-opponent-strength`)
   *  rides on it. Built by `engineStrength.opponentStrength` from the same
   *  student strength + offset the config was resolved from. */
  strength?: OpponentStrength,
): Promise<CoachMoveResult> {
  const { move, source } = await chooseCoachMove(fen, config);
  if (strength && move.uci) emitOpponentStrength(strength, source);
  return move;
}

async function chooseCoachMove(
  fen: string,
  config: PlaySessionConfig,
): Promise<{ move: CoachMoveResult; source: 'book' | 'stockfish' | 'fallback-legal' }> {
  await setSkill(config.skill);

  // Book moves apply below full strength. At skill 20 we want pure
  // engine play so the user can't coast on rote theory.
  if (config.skill < 20) {
    const book = await pickBookMove(fen);
    if (book && isBookMoveLegal(fen, book)) {
      const squares = bookMoveToSquares(book);
      if (squares) {
        return {
          move: {
            uci: book.uci,
            from: squares.from,
            to: squares.to,
            promotion: squares.promotion,
          },
          source: 'book',
        };
      }
    }
  }

  // Pass the config skill straight into getBestMove so the weakened strength is
  // set per-call (immune to a full-strength eval resetting Skill Level on the
  // shared singleton engine between moves).
  // The Elo goes to the engine, not just into the label. Same omission as
  // `coachGameEngine`: the config has carried `targetElo` all along and the
  // engine was never told it, so Skill Level — which is not Elo — was the only
  // limiter on the Play surface too.
  try {
    const uci = await stockfishEngine.getBestMove(fen, config.moveTimeMs, config.skill, config.targetElo);
    if (!uci || uci.length < 4) return { move: fallbackLegalMove(fen), source: 'fallback-legal' };
    return { move: parseUci(uci), source: 'stockfish' };
  } catch {
    // Engine hung/died and getBestMove rejected (its watchdog forceRestarted the
    // worker). Never leave the opponent without a move — the board would freeze.
    return { move: fallbackLegalMove(fen), source: 'fallback-legal' };
  }
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
