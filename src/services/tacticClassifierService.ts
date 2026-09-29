import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { useAppStore } from '../stores/appStore';
import { PRODUCTION_BACKFILL_SCHEDULE, sleep, type BackfillSchedule } from './backfillSchedule';
import type { ClassifiedTactic, TacticType, TacticMotifStats, GameRecord } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const MIN_CP_LOSS = 80;

// ─── Tactic Labels ──────────────────────────────────────────────────────────

export const TACTIC_LABELS: Record<TacticType, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discovered_attack: 'Discovered Attack',
  back_rank: 'Back Rank',
  hanging_piece: 'Hanging Piece',
  promotion: 'Promotion',
  deflection: 'Deflection',
  overloaded_piece: 'Overloaded Piece',
  trapped_piece: 'Trapped Piece',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  x_ray: 'X-Ray',
  double_check: 'Double Check',
  removing_the_guard: 'Removing the Guard',
  checkmate: 'Checkmate',
  tactical_sequence: 'Combination',
};

// ─── Lichess Theme Mapping ──────────────────────────────────────────────────

/** Maps Lichess puzzle theme strings to our TacticType enum. */
export const LICHESS_THEME_TO_TACTIC: Partial<Record<string, TacticType>> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered_attack',
  backRankMate: 'back_rank',
  hangingPiece: 'hanging_piece',
  promotion: 'promotion',
  deflection: 'deflection',
  overloadedPiece: 'overloaded_piece',
  trappedPiece: 'trapped_piece',
  clearance: 'clearance',
  interference: 'interference',
  zwischenzug: 'zwischenzug',
  xRayAttack: 'x_ray',
  doubleCheck: 'double_check',
  attraction: 'deflection',
  capturingDefender: 'removing_the_guard',
  discoveredCheck: 'discovered_attack',
  intermezzo: 'zwischenzug',
  sacrifice: 'tactical_sequence',
};

/** Human-friendly labels for common Lichess themes not in TacticType. */
export const LICHESS_THEME_LABELS: Record<string, string> = {
  fork: 'Fork',
  pin: 'Pin',
  skewer: 'Skewer',
  discoveredAttack: 'Discovered Attack',
  discoveredCheck: 'Discovered Check',
  backRankMate: 'Back Rank Mate',
  hangingPiece: 'Hanging Piece',
  promotion: 'Promotion',
  underPromotion: 'Under-Promotion',
  deflection: 'Deflection',
  overloadedPiece: 'Overloaded Piece',
  trappedPiece: 'Trapped Piece',
  clearance: 'Clearance',
  interference: 'Interference',
  zwischenzug: 'Zwischenzug',
  intermezzo: 'Intermezzo',
  xRayAttack: 'X-Ray Attack',
  doubleCheck: 'Double Check',
  attraction: 'Attraction',
  capturingDefender: 'Removing the Defender',
  sacrifice: 'Sacrifice',
  mateIn1: 'Mate in 1',
  mateIn2: 'Mate in 2',
  mateIn3: 'Mate in 3',
  mateIn4: 'Mate in 4',
  mateIn5: 'Mate in 5',
  smotheredMate: 'Smothered Mate',
  hookMate: 'Hook Mate',
  arabianMate: 'Arabian Mate',
  anastasiaMate: 'Anastasia Mate',
  exposedKing: 'Exposed King',
  kingsideAttack: 'Kingside Attack',
  queensideAttack: 'Queenside Attack',
  quietMove: 'Quiet Move',
  defensiveMove: 'Defensive Move',
  zugzwang: 'Zugzwang',
  endgame: 'Endgame',
  middlegame: 'Middlegame',
  opening: 'Opening',
  openingTrap: 'Opening Trap',
  enPassant: 'En Passant',
  castling: 'Castling',
  advancedPawn: 'Advanced Pawn',
};

/**
 * Get the best tactic type from a Lichess puzzle's theme array.
 * Returns the first tactical theme found (ignoring phase/style tags), or null.
 */
export function getTacticTypeFromThemes(themes: string[]): TacticType | null {
  for (const theme of themes) {
    const mapped = LICHESS_THEME_TO_TACTIC[theme];
    if (mapped && mapped !== 'tactical_sequence') return mapped;
  }
  return null;
}

/**
 * Get the best human-friendly label from a Lichess puzzle's theme array.
 * Prioritizes tactical themes over phase/style themes.
 */
export function getPrimaryThemeLabel(themes: string[]): string | null {
  // Priority: tactical themes first
  const tacticalPriority = [
    'fork', 'pin', 'skewer', 'discoveredAttack', 'discoveredCheck',
    'backRankMate', 'smotheredMate', 'hookMate', 'arabianMate', 'anastasiaMate',
    'doubleCheck', 'deflection', 'attraction', 'capturingDefender',
    'sacrifice', 'clearance', 'interference', 'zwischenzug', 'intermezzo',
    'xRayAttack', 'overloadedPiece', 'trappedPiece', 'hangingPiece',
    'exposedKing', 'kingsideAttack', 'queensideAttack',
    'promotion', 'underPromotion', 'enPassant',
    'quietMove', 'defensiveMove', 'zugzwang', 'advancedPawn',
    'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5',
  ];

  for (const priority of tacticalPriority) {
    if (themes.includes(priority)) {
      return LICHESS_THEME_LABELS[priority] ?? priority;
    }
  }
  return null;
}

// ─── Classify & Persist ─────────────────────────────────────────────────────

/**
 * Classify a game's missed tactics and persist them, then mark the game
 * classified (`tacticsClassified`) so a game with ZERO missed tactics is not
 * re-derived on every read — that re-derivation, over every analysed game on
 * every open of /weaknesses, is what froze the app (2026-09-29).
 *
 * Without `force`, a game already classified (marker set, or rows present from
 * before the marker existed) is only marked. After a fresh analysis the caller
 * passes `force` so the tactics are re-derived from the NEW annotations; the
 * drill counters on rows that survive are carried over.
 */
export async function classifyTacticsFromGame(
  gameId: string,
  opts: { force?: boolean; yieldBetween?: () => Promise<void> } = {},
): Promise<number> {
  const game = await db.games.get(gameId);
  if (!game || !game.annotations || game.annotations.length === 0) return 0;

  const existing = await db.classifiedTactics.where('sourceGameId').equals(gameId).toArray();
  if (!opts.force && (game.tacticsClassified || existing.length > 0)) {
    if (!game.tacticsClassified) await db.games.update(gameId, { tacticsClassified: true });
    return 0;
  }

  const tactics = opts.yieldBetween
    ? await deriveMissedTacticsForGameYielding(game, opts.yieldBetween)
    : deriveMissedTacticsForGame(game);
  const prior = new Map(existing.map((t) => [t.id, t]));
  for (const t of tactics) {
    const was = prior.get(t.id);
    if (was) {
      t.puzzleAttempts = was.puzzleAttempts;
      t.puzzleSuccesses = was.puzzleSuccesses;
      t.createdAt = was.createdAt;
    }
  }
  const stale = existing.filter((t) => !tactics.some((n) => n.id === t.id)).map((t) => t.id);
  await db.transaction('rw', db.classifiedTactics, db.games, async () => {
    if (stale.length > 0) await db.classifiedTactics.bulkDelete(stale);
    if (tactics.length > 0) await db.classifiedTactics.bulkPut(tactics);
    await db.games.update(gameId, { tacticsClassified: true });
  });
  return tactics.length;
}

/**
 * PURE derivation of a game's missed tactics from its annotations — no DB read
 * or write. The logic classifyTacticsFromGame persists.
 *
 * 🔒 NEVER call this over the whole library on a read path (2026-09-29). The
 * /weaknesses Tactics tab once did, to dodge an unfilled cache (David
 * 2026-09-09, "still seeing 100% tactical awareness"): ~930 games × every
 * mistake × a classifier costing tens of ms on a phone, synchronous on the
 * main thread, on every open — the page froze the app. The tab now reads the
 * cache and `backfillClassifiedTactics` fills it in the background.
 */
export function deriveMissedTacticsForGame(
  game: GameRecord,
  playerColorOverride?: 'white' | 'black',
): ClassifiedTactic[] {
  const plan = planDerivation(game, playerColorOverride);
  if (!plan) return [];
  const tactics: ClassifiedTactic[] = [];
  for (const i of plan.candidates) {
    const t = classifyCandidate(plan, i);
    if (t) tactics.push(t);
  }
  return tactics;
}

/** Same derivation, but hands the thread back between every classifier call
 *  (each is tens of ms on a phone) — for the background fill. */
export async function deriveMissedTacticsForGameYielding(
  game: GameRecord,
  yieldBetween: () => Promise<void>,
): Promise<ClassifiedTactic[]> {
  const plan = planDerivation(game);
  if (!plan) return [];
  const tactics: ClassifiedTactic[] = [];
  for (const i of plan.candidates) {
    await yieldBetween();
    const t = classifyCandidate(plan, i);
    if (t) tactics.push(t);
  }
  return tactics;
}

interface DerivationPlan {
  game: GameRecord;
  playerColor: 'white' | 'black';
  context: ReturnType<typeof resolveGameContext>;
  fens: string[];
  /** Annotation indices worth classifying: the player's mistakes/blunders with a
   *  known best move and a real eval swing. Cheap to compute — the expensive
   *  step is `detectTacticType`, run once per candidate. */
  candidates: number[];
  cpLoss: Map<number, number>;
}

function planDerivation(
  game: GameRecord,
  playerColorOverride?: 'white' | 'black',
): DerivationPlan | null {
  if (!game.annotations || game.annotations.length === 0) return null;
  const playerColor = playerColorOverride ?? resolvePlayerColor(game);
  if (!playerColor) return null;

  // Replay PGN to get FENs for each position
  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  const annotations = game.annotations;
  const candidates: number[] = [];
  const cpLossAt = new Map<number, number>();
  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];

    // Only player's mistakes/blunders with a known best move
    if (ann.color !== playerColor) continue;
    const cls = ann.classification;
    if (cls !== 'mistake' && cls !== 'blunder') continue;
    if (!ann.bestMove) continue;

    // Compute cpLoss from eval deltas. `MoveAnnotation.evaluation` is
    // CENTIPAWNS (types/index.ts: "Stockfish evaluation in centipawns";
    // gameAnalysisService writes the engine's cp score straight in). This
    // block used to multiply by 100 on the belief that evals were stored in
    // pawns — so every classified tactic carried a cost 100× too large, the
    // 80cp floor admitted every 1cp wobble, and the coach told a student a
    // missed hanging piece "cost 365.5 points" (WO-STANDARD-01 D-17, prod
    // tape 2026-09-22). One unit, the one the type declares.
    const evalAfter = ann.evaluation;
    const prevAnn = i > 0 ? annotations[i - 1] : null;
    const evalBefore = prevAnn?.evaluation ?? null;
    let cpLoss = 0;
    if (evalBefore !== null && evalAfter !== null) {
      cpLoss = Math.abs(
        playerColor === 'white' ? evalBefore - evalAfter : evalAfter - evalBefore,
      );
    }
    if (cpLoss < MIN_CP_LOSS) continue;
    // FEN before this move was played
    if (!fens[i]) continue;
    candidates.push(i);
    cpLossAt.set(i, cpLoss);
  }
  return {
    game,
    playerColor,
    context: resolveGameContext(game, playerColor),
    fens,
    candidates,
    cpLoss: cpLossAt,
  };
}

function classifyCandidate(plan: DerivationPlan, i: number): ClassifiedTactic | null {
  const ann = plan.game.annotations?.[i];
  const fenBefore = plan.fens[i];
  if (!ann || !ann.bestMove || !fenBefore) return null;
  const cpLoss = plan.cpLoss.get(i) ?? 0;

  const tacticType = detectTacticType(fenBefore, ann.bestMove);
  if (tacticType === 'tactical_sequence') return null; // Skip unclassifiable

  const bestMoveSan = uciToSan(fenBefore, ann.bestMove);
  return {
    id: `ct-${plan.game.id}-${i}`,
    sourceGameId: plan.game.id,
    moveIndex: i,
    fen: fenBefore,
    bestMoveUci: ann.bestMove,
    bestMoveSan: bestMoveSan ?? ann.bestMove,
    playerMoveUci: '', // Not critical for display
    playerMoveSan: ann.san,
    playerColor: plan.playerColor,
    tacticType,
    evalSwing: cpLoss,
    explanation: generateExplanation(tacticType, bestMoveSan ?? ann.bestMove, cpLoss),
    opponentName: plan.context.opponentName,
    gameDate: plan.context.gameDate,
    openingName: plan.context.openingName,
    puzzleAttempts: 0,
    puzzleSuccesses: 0,
    createdAt: new Date().toISOString(),
  };
}

let fillInFlight: Promise<number> | null = null;

/**
 * Fill the classifiedTactics cache for every analysed game not yet classified,
 * scheduled per `backfillSchedule` rules: yield between classifier calls,
 * persist per game (a killed app keeps its progress), never on the boot path.
 * Single-flight — a second caller joins the running fill instead of starting a
 * parallel one. `onGame` fires after each game lands so a surface can refresh.
 * Returns the number of new tactics found.
 */
export function backfillClassifiedTactics(opts: {
  schedule?: BackfillSchedule;
  onGame?: (done: number, total: number) => void;
} = {}): Promise<number> {
  if (fillInFlight) return fillInFlight;
  const schedule = opts.schedule ?? PAGE_BACKFILL_SCHEDULE;
  fillInFlight = (async () => {
    if (schedule.startDelayMs > 0) await sleep(schedule.startDelayMs);
    const pending = await db.games
      .filter((g) => !g.tacticsClassified && !!g.annotations && g.annotations.length > 0)
      .primaryKeys();
    let total = 0;
    let done = 0;
    for (const id of pending) {
      try {
        total += await classifyTacticsFromGame(id, { yieldBetween: schedule.yieldBetweenRows });
      } catch {
        // Continue with remaining games
      }
      done++;
      opts.onGame?.(done, pending.length);
      await schedule.yieldBetweenRows();
    }
    return total;
  })().finally(() => { fillInFlight = null; });
  return fillInFlight;
}

/** A page-triggered fill: the page has already painted, so no boot delay. */
const PAGE_BACKFILL_SCHEDULE: BackfillSchedule = { ...PRODUCTION_BACKFILL_SCHEDULE, startDelayMs: 0 };

// ─── Stats & Queries ────────────────────────────────────────────────────────

/**
 * Get tactic motif stats: for each tactic type, how many were missed in games
 * and how the user performs on related puzzles.
 */
export async function getTacticMotifStats(): Promise<TacticMotifStats[]> {
  const allTactics = await db.classifiedTactics.toArray();
  const allMistakePuzzles = await db.mistakePuzzles.toArray();

  // Group classified tactics by type
  const byType = new Map<TacticType, ClassifiedTactic[]>();
  for (const t of allTactics) {
    const arr = byType.get(t.tacticType) ?? [];
    arr.push(t);
    byType.set(t.tacticType, arr);
  }

  // Map puzzle themes to tactic types (puzzles from Lichess use theme tags)
  const puzzleThemeToTactic = LICHESS_THEME_TO_TACTIC;

  // Get puzzle stats grouped by tactic type
  const puzzleStatsByType = new Map<TacticType, { attempts: number; successes: number }>();
  const allPuzzles = await db.puzzles.toArray();
  for (const p of allPuzzles) {
    if (p.attempts === 0) continue;
    for (const theme of p.themes) {
      const tacticType = puzzleThemeToTactic[theme];
      if (!tacticType) continue;
      const existing = puzzleStatsByType.get(tacticType) ?? { attempts: 0, successes: 0 };
      existing.attempts += p.attempts;
      existing.successes += p.successes;
      puzzleStatsByType.set(tacticType, existing);
    }
  }

  // Also count mistake puzzle performance for each tactic type
  for (const mp of allMistakePuzzles) {
    if (mp.attempts === 0) continue;
    // Mistake puzzles don't have a tactic type yet, but we can match by sourceGameId + moveNumber
    const matching = allTactics.find(
      (t) => t.sourceGameId === mp.sourceGameId && t.moveIndex === mp.moveNumber,
    );
    if (matching) {
      const existing = puzzleStatsByType.get(matching.tacticType) ?? { attempts: 0, successes: 0 };
      existing.attempts += mp.attempts;
      existing.successes += mp.successes;
      puzzleStatsByType.set(matching.tacticType, existing);
    }
  }

  // Build stats array
  const stats: TacticMotifStats[] = [];
  const allTypes: TacticType[] = [
    'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank',
    'hanging_piece', 'promotion', 'deflection', 'overloaded_piece',
    'trapped_piece', 'clearance', 'interference', 'zwischenzug',
    'x_ray', 'double_check', 'removing_the_guard',
  ];

  for (const type of allTypes) {
    const missedInGames = byType.get(type)?.length ?? 0;
    const puzzleStats = puzzleStatsByType.get(type);
    const puzzleAttempts = puzzleStats?.attempts ?? 0;
    const puzzleAccuracy = puzzleAttempts > 0
      ? Math.round(((puzzleStats?.successes ?? 0) / puzzleAttempts) * 100)
      : 0;

    // Game awareness: what % of games with this tactic type did the user NOT miss it?
    // We only track misses, so awareness = 0 if we have misses but no data on hits
    // For now, show inverse severity: fewer misses relative to games = higher awareness
    const totalGamesWithTactics = allTactics.length;
    const gameAwareness = totalGamesWithTactics > 0
      ? Math.max(0, Math.round(100 - (missedInGames / Math.max(totalGamesWithTactics, 1)) * 100))
      : 0;

    if (missedInGames > 0 || puzzleAttempts > 0) {
      stats.push({
        tacticType: type,
        missedInGames,
        puzzleAttempts,
        puzzleAccuracy,
        gameAwareness,
      });
    }
  }

  // Sort by most missed first
  stats.sort((a, b) => b.missedInGames - a.missedInGames);
  return stats;
}

/**
 * Get all classified tactics for a specific game.
 */
export async function getTacticsForGame(gameId: string): Promise<ClassifiedTactic[]> {
  return db.classifiedTactics.where('sourceGameId').equals(gameId).toArray();
}

/**
 * Get total count of classified tactics.
 */
export async function getClassifiedTacticCount(): Promise<number> {
  return db.classifiedTactics.count();
}

/**
 * Get recent classified tactics across all games.
 */
export async function getRecentClassifiedTactics(limit: number = 20): Promise<ClassifiedTactic[]> {
  return db.classifiedTactics
    .orderBy('createdAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get classified tactics filtered by tactic type.
 */
export async function getTacticsByType(type: TacticType): Promise<ClassifiedTactic[]> {
  return db.classifiedTactics.where('tacticType').equals(type).toArray();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolvePlayerColor(game: GameRecord): 'white' | 'black' | null {
  // The declared seat first (see `playerIdentity.resolvePlayerColor`; gate
  // `seatResolversReadDeclaredSeat.test.ts`).
  if (game.studentSide === 'white' || game.studentSide === 'black') return game.studentSide;
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return 'white';
  }
  const profile = useAppStore.getState().activeProfile;
  if (profile) {
    const name = profile.name.toLowerCase();
    if (game.white.toLowerCase().includes(name) || name.includes(game.white.toLowerCase())) return 'white';
    if (game.black.toLowerCase().includes(name) || name.includes(game.black.toLowerCase())) return 'black';
  }
  return 'white';
}

function resolveGameContext(
  game: GameRecord,
  playerColor: 'white' | 'black',
): { opponentName: string | null; gameDate: string | null; openingName: string | null } {
  return {
    opponentName: playerColor === 'white' ? game.black : game.white,
    gameDate: game.date,
    openingName: game.eco,
  };
}

function replayPgnToFens(pgn: string): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  try {
    chess.loadPgn(pgn);
    const history = chess.history();
    chess.reset();
    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
    }
  } catch {
    // Return what we have
  }
  return fens;
}

function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const result = chess.move({ from, to, promotion });
    return result.san;
  } catch {
    return null;
  }
}

function generateExplanation(tacticType: TacticType, bestMove: string, cpLoss: number): string {
  const pawns = (cpLoss / 100).toFixed(1);
  const labels: Record<TacticType, string> = {
    fork: `Missed fork with ${bestMove} (${pawns} points lost)`,
    pin: `Missed pin with ${bestMove} (${pawns} points lost)`,
    skewer: `Missed skewer with ${bestMove} (${pawns} points lost)`,
    discovered_attack: `Missed discovered attack with ${bestMove} (${pawns} points lost)`,
    back_rank: `Missed back rank tactic with ${bestMove} (${pawns} points lost)`,
    hanging_piece: `Missed capturing hanging piece with ${bestMove} (${pawns} points lost)`,
    promotion: `Missed promotion with ${bestMove} (${pawns} points lost)`,
    deflection: `Missed deflection with ${bestMove} (${pawns} points lost)`,
    overloaded_piece: `Missed overloaded piece exploit with ${bestMove} (${pawns} points lost)`,
    trapped_piece: `Missed trapping a piece with ${bestMove} (${pawns} points lost)`,
    clearance: `Missed clearance sacrifice with ${bestMove} (${pawns} points lost)`,
    interference: `Missed interference tactic with ${bestMove} (${pawns} points lost)`,
    zwischenzug: `Missed zwischenzug with ${bestMove} (${pawns} points lost)`,
    x_ray: `Missed x-ray attack with ${bestMove} (${pawns} points lost)`,
    double_check: `Missed double check with ${bestMove} (${pawns} points lost)`,
    removing_the_guard: `Missed removing the guard with ${bestMove} (${pawns} points lost)`,
    checkmate: `Missed forced checkmate with ${bestMove} (${pawns} points lost)`,
    tactical_sequence: `Missed tactic with ${bestMove} (${pawns} points lost)`,
  };
  return labels[tacticType];
}
