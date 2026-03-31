import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { useAppStore } from '../stores/appStore';
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
  tactical_sequence: 'Tactical Sequence',
};

// ─── Classify & Persist ─────────────────────────────────────────────────────

/**
 * Classify all missed tactics from a single analyzed game and persist them.
 * Called after game analysis is complete (annotations available).
 */
export async function classifyTacticsFromGame(gameId: string): Promise<number> {
  const game = await db.games.get(gameId);
  if (!game || !game.annotations || game.annotations.length === 0) return 0;

  // Check if we already classified this game
  const existing = await db.classifiedTactics.where('sourceGameId').equals(gameId).count();
  if (existing > 0) return 0;

  const playerColor = resolvePlayerColor(game);
  if (!playerColor) return 0;

  const context = resolveGameContext(game, playerColor);

  // Replay PGN to get FENs for each position
  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return 0;

  const annotations = game.annotations;
  const tactics: ClassifiedTactic[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const ann = annotations[i];

    // Only player's mistakes/blunders with a known best move
    if (ann.color !== playerColor) continue;

    const cls = ann.classification;
    if (cls !== 'mistake' && cls !== 'blunder') continue;
    if (!ann.bestMove) continue;

    // Compute cpLoss from eval deltas: evaluation is stored as centipawns/100
    // Compare this move's eval with the previous move's eval
    const evalAfter = ann.evaluation;
    const prevAnn = i > 0 ? annotations[i - 1] : null;
    const evalBefore = prevAnn?.evaluation ?? null;

    let cpLoss = 0;
    if (evalBefore !== null && evalAfter !== null) {
      // Evals are stored in pawns (centipawns / 100), convert back to centipawns
      const cpBefore = evalBefore * 100;
      const cpAfter = evalAfter * 100;
      cpLoss = Math.abs(
        playerColor === 'white' ? cpBefore - cpAfter : cpAfter - cpBefore,
      );
    }
    if (cpLoss < MIN_CP_LOSS) continue;

    // FEN before this move was played
    const fenBefore = fens[i] ?? null;
    if (!fenBefore) continue;

    const tacticType = detectTacticType(fenBefore, ann.bestMove);
    if (tacticType === 'tactical_sequence') continue; // Skip unclassifiable

    const bestMoveSan = uciToSan(fenBefore, ann.bestMove);

    tactics.push({
      id: `ct-${gameId}-${i}`,
      sourceGameId: gameId,
      moveIndex: i,
      fen: fenBefore,
      bestMoveUci: ann.bestMove,
      bestMoveSan: bestMoveSan ?? ann.bestMove,
      playerMoveUci: '', // Not critical for display
      playerMoveSan: ann.san,
      playerColor,
      tacticType,
      evalSwing: cpLoss,
      explanation: generateExplanation(tacticType, bestMoveSan ?? ann.bestMove, cpLoss),
      opponentName: context.opponentName,
      gameDate: context.gameDate,
      openingName: context.openingName,
      puzzleAttempts: 0,
      puzzleSuccesses: 0,
      createdAt: new Date().toISOString(),
    });
  }

  if (tactics.length > 0) {
    await db.classifiedTactics.bulkPut(tactics);
  }

  return tactics.length;
}

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
  const puzzleThemeToTactic: Partial<Record<string, TacticType>> = {
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
  };

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
    'x_ray', 'double_check',
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
    fork: `Missed fork with ${bestMove} (${pawns} pawns lost)`,
    pin: `Missed pin with ${bestMove} (${pawns} pawns lost)`,
    skewer: `Missed skewer with ${bestMove} (${pawns} pawns lost)`,
    discovered_attack: `Missed discovered attack with ${bestMove} (${pawns} pawns lost)`,
    back_rank: `Missed back rank tactic with ${bestMove} (${pawns} pawns lost)`,
    hanging_piece: `Missed capturing hanging piece with ${bestMove} (${pawns} pawns lost)`,
    promotion: `Missed promotion with ${bestMove} (${pawns} pawns lost)`,
    deflection: `Missed deflection with ${bestMove} (${pawns} pawns lost)`,
    overloaded_piece: `Missed overloaded piece exploit with ${bestMove} (${pawns} pawns lost)`,
    trapped_piece: `Missed trapping a piece with ${bestMove} (${pawns} pawns lost)`,
    clearance: `Missed clearance sacrifice with ${bestMove} (${pawns} pawns lost)`,
    interference: `Missed interference tactic with ${bestMove} (${pawns} pawns lost)`,
    zwischenzug: `Missed zwischenzug with ${bestMove} (${pawns} pawns lost)`,
    x_ray: `Missed x-ray attack with ${bestMove} (${pawns} pawns lost)`,
    double_check: `Missed double check with ${bestMove} (${pawns} pawns lost)`,
    tactical_sequence: `Missed tactic with ${bestMove} (${pawns} pawns lost)`,
  };
  return labels[tacticType];
}
