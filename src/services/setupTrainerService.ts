/**
 * setupTrainerService
 * -------------------
 * The Setup Trainer is CALCULATION training mixed with tactics spotting
 * (David 2026-06-11): a quiet preparatory move (non-capture, non-check)
 * that sets up a real tactical motif, after which the student must
 * CALCULATE and PLAY the whole tactic to the end. Harder = the tactic is
 * further out (a longer line, more calculation depth).
 *
 * Source = the engine-verified Lichess corpus (`puzzles.json`, seeded into
 * `db.puzzles`), NOT the student's own games. We shape-filter the corpus to
 * positions whose SOLVER's first move is quiet and whose solution carries a
 * tactical motif, then size difficulty by solver-move count. Every move comes
 * from the corpus + chess.js — the LLM decides no chess here (G0/G3).
 *
 * This replaces the old game-rewind generator (`tacticSetupService.ts`), which
 * made the student replay the literal line that happened in one of their games
 * — arbitrary, fragile (exact-FEN match), and only ever asked for one move
 * before auto-playing the rest.
 */
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { calculateRatingDelta, shuffleArray } from './puzzleService';
import { createDefaultSrsFields } from './srsEngine';
import type {
  PuzzleRecord,
  SetupPuzzle,
  SetupPuzzleDifficulty,
  TacticType,
} from '../types';

// ─── Tactic-motif gate ──────────────────────────────────────────────────────
// A puzzle qualifies as a "spot the tactic" payoff only if it carries one of
// these Lichess motif themes. This deliberately EXCLUDES pure pawn-race /
// promotion endgames (which are calculation but not tactics spotting).
const TACTIC_MOTIFS = new Set<string>([
  'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice',
  'deflection', 'attraction', 'clearance', 'interference', 'intermezzo',
  'xRayAttack', 'hangingPiece', 'trappedPiece', 'overloading',
  'backRankMate', 'smotheredMate', 'mateIn2', 'mateIn3', 'mateIn4',
  'kingsideAttack', 'queensideAttack', 'attackingF2F7',
]);

// Lichess theme → our TacticType badge, priority-ordered (first match wins).
const THEME_TO_TYPE: Array<[string, TacticType]> = [
  ['doubleCheck', 'double_check'],
  ['backRankMate', 'back_rank'],
  ['smotheredMate', 'back_rank'],
  ['fork', 'fork'],
  ['pin', 'pin'],
  ['skewer', 'skewer'],
  ['discoveredAttack', 'discovered_attack'],
  ['xRayAttack', 'x_ray'],
  ['deflection', 'deflection'],
  ['interference', 'interference'],
  ['clearance', 'clearance'],
  ['intermezzo', 'zwischenzug'],
  ['trappedPiece', 'trapped_piece'],
  ['overloading', 'overloaded_piece'],
  ['hangingPiece', 'hanging_piece'],
  ['promotion', 'promotion'],
];

function classifyTacticType(themes: string[]): TacticType {
  const set = new Set(themes);
  for (const [theme, type] of THEME_TO_TYPE) {
    if (set.has(theme)) return type;
  }
  return 'tactical_sequence';
}

// ─── Shape helpers ───────────────────────────────────────────────────────────

interface UciParts { from: string; to: string; promotion?: string }

function parseUci(uci: string): UciParts {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}

/**
 * Number of moves the SOLVER plays. In Lichess format `moves[0]` is the
 * opponent's setup move (auto-played to reach the solving position); the
 * solver then plays moves[1], moves[3], … (always ending on the solver's
 * decisive move), so solverCount = ceil((len - 1) / 2).
 */
export function solverMoveCount(moves: string): number {
  const len = moves.split(' ').filter(Boolean).length;
  if (len < 2) return 0;
  return Math.ceil((len - 1) / 2);
}

/**
 * Difficulty = calculation depth (David: harder = more moves / further out).
 *   L1 = 2 solver moves (quiet setup + the blow),
 *   L2 = 3 solver moves,
 *   L3 = 4+ solver moves.
 * A 1-solver-move puzzle is plain spotting (no setup) → null (excluded).
 */
export function levelForMoves(moves: string): SetupPuzzleDifficulty | null {
  const solver = solverMoveCount(moves);
  if (solver === 2) return 1;
  if (solver === 3) return 2;
  if (solver >= 4) return 3;
  return null;
}

/**
 * The setup character: after the opponent's auto-played first move, the
 * solver's FIRST move must be QUIET — not a capture and not a check. That's
 * what makes the trainer "calculate the setup" rather than "grab the piece."
 */
export function firstSolverMoveIsQuiet(fen: string, moves: string): boolean {
  const list = moves.split(' ').filter(Boolean);
  if (list.length < 2) return false;
  try {
    const chess = new Chess(fen);
    const opp = parseUci(list[0]);
    chess.move({ from: opp.from, to: opp.to, promotion: opp.promotion });
    const solver = parseUci(list[1]);
    const result = chess.move({ from: solver.from, to: solver.to, promotion: solver.promotion });
    const isCapture = result.isCapture() || result.isEnPassant();
    const givesCheck = chess.inCheck(); // side-to-move (opponent) now in check
    return !isCapture && !givesCheck;
  } catch {
    return false;
  }
}

/** True when a corpus puzzle is a valid setup puzzle at the given level. */
export function isSetupShape(puzzle: PuzzleRecord, level: SetupPuzzleDifficulty): boolean {
  if (levelForMoves(puzzle.moves) !== level) return false;
  if (!puzzle.themes.some((t) => TACTIC_MOTIFS.has(t))) return false;
  return firstSolverMoveIsQuiet(puzzle.fen, puzzle.moves);
}

/**
 * Build the runtime SetupPuzzle from a corpus record. `setupFen` is the
 * position AFTER the opponent's auto-played first move (solver to move);
 * `solutionMoves` is the full alternating line the student plays through
 * (their moves on even indices, opponent replies auto-play on odd).
 */
export function buildSetupPuzzle(record: PuzzleRecord): SetupPuzzle {
  const list = record.moves.split(' ').filter(Boolean);
  const chess = new Chess(record.fen);
  const opp = parseUci(list[0]);
  chess.move({ from: opp.from, to: opp.to, promotion: opp.promotion });
  const setupFen = chess.fen();
  const playerColor: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';

  const line = list.slice(1);
  // Compute the final position so `tacticFen` is meaningful (unused by the
  // board, but keeps the persisted/SRS shape honest).
  let tacticFen = setupFen;
  try {
    const walk = new Chess(setupFen);
    for (const uci of line) {
      const p = parseUci(uci);
      walk.move({ from: p.from, to: p.to, promotion: p.promotion });
    }
    tacticFen = walk.fen();
  } catch {
    // Leave tacticFen at setupFen if the line can't fully replay (rare).
  }

  const difficulty = levelForMoves(record.moves) ?? 1;
  const srs = createDefaultSrsFields();

  return {
    id: `sp_${record.id}`,
    setupFen,
    solutionMoves: line.join(' '),
    tacticFen,
    tacticMoves: '', // unused — the student plays the whole line, no reveal phase
    tacticType: classifyTacticType(record.themes),
    difficulty,
    sourceGameId: null,
    sourceMistakePuzzleId: null,
    playerColor,
    openingName: record.openingTags ?? null,
    srsInterval: srs.interval,
    srsEaseFactor: srs.easeFactor,
    srsRepetitions: srs.repetitions,
    srsDueDate: srs.dueDate,
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    createdAt: new Date().toISOString(),
  };
}

// ─── Adaptive session ────────────────────────────────────────────────────────

export interface SetupTrainerItem {
  puzzle: SetupPuzzle;
  /** The corpus puzzle's Lichess rating — drives the adaptive Elo update. */
  rating: number;
}

export interface SetupAdaptiveSession {
  level: SetupPuzzleDifficulty;
  /** Adaptive band anchor; drifts on solve/fail. */
  targetRating: number;
  solved: number;
  attempted: number;
  streak: number;
  consecutiveWrong: number;
  seenIds: Set<string>;
}

const RATING_FLOOR = 600;
const RATING_CEILING = 2800;
const CORRECT_BUMP = 50;
const WRONG_PENALTY = 40;
const EXTRA_WRONG_PENALTY = 20;

function clampRating(r: number): number {
  return Math.max(RATING_FLOOR, Math.min(RATING_CEILING, r));
}

export function createSetupSession(
  level: SetupPuzzleDifficulty,
  baseRating: number,
): SetupAdaptiveSession {
  return {
    level,
    targetRating: clampRating(baseRating),
    solved: 0,
    attempted: 0,
    streak: 0,
    consecutiveWrong: 0,
    seenIds: new Set<string>(),
  };
}

const SELECTION_BANDS = [250, 500, 850, 1300];

/**
 * Pick the next setup puzzle near the session's adaptive target rating. Scans
 * the rating band (shuffled), filtered to setup-shape + tactical-motif +
 * unseen, and returns the first match — widening the band until one is found.
 */
export async function pickSetupPuzzle(
  session: SetupAdaptiveSession,
): Promise<SetupTrainerItem | null> {
  for (const bandWidth of SELECTION_BANDS) {
    const min = Math.max(0, session.targetRating - bandWidth);
    const max = session.targetRating + bandWidth;
    const candidates = shuffleArray(
      await db.puzzles.where('rating').between(min, max).toArray(),
    );
    for (const p of candidates) {
      if (session.seenIds.has(p.id)) continue;
      if (!isSetupShape(p, session.level)) continue;
      return { puzzle: buildSetupPuzzle(p), rating: p.rating };
    }
  }
  return null;
}

export interface SetupResult {
  session: SetupAdaptiveSession;
  /** The student's new puzzle rating after this attempt (K=32 Elo). */
  newPlayerRating: number;
}

/**
 * Record a solve/miss: update running counts, drift the adaptive target, and
 * compute the student's new `puzzleRating` via the shared K=32 Elo delta.
 */
export function recordSetupResult(
  session: SetupAdaptiveSession,
  puzzleId: string,
  puzzleRating: number,
  correct: boolean,
  playerRating: number,
): SetupResult {
  const next: SetupAdaptiveSession = {
    ...session,
    seenIds: new Set(session.seenIds),
  };
  next.seenIds.add(puzzleId);
  next.attempted += 1;

  if (correct) {
    next.solved += 1;
    next.streak += 1;
    next.consecutiveWrong = 0;
    next.targetRating = clampRating(session.targetRating + CORRECT_BUMP);
  } else {
    next.streak = 0;
    const penalty = WRONG_PENALTY + session.consecutiveWrong * EXTRA_WRONG_PENALTY;
    next.consecutiveWrong += 1;
    next.targetRating = clampRating(session.targetRating - penalty);
  }

  const newPlayerRating =
    playerRating + calculateRatingDelta(playerRating, puzzleRating, correct);

  return { session: next, newPlayerRating };
}
