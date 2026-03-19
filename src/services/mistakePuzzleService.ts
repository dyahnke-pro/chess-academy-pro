import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { createDefaultSrsFields, calculateNextInterval } from './srsEngine';
import { stockfishEngine } from './stockfishEngine';
import type {
  MistakePuzzle,
  MistakeClassification,
  MistakeGamePhase,
  MistakePuzzleSourceMode,
  MistakePuzzleStatus,
  SrsGrade,
  GameRecord,
  MoveAnnotation,
} from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const CP_LOSS_THRESHOLD = 50;
const MASTERY_REPETITIONS = 3;
const MIN_PV_MOVES = 3;
const BATCH_GAME_LIMIT = 100;
const ANALYSIS_DEPTH = 12;

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `mp_${timestamp}_${random}`;
}

const PROMPT_TEXT: Record<MistakeClassification, string> = {
  inaccuracy: 'You had a better option here. Can you find it?',
  mistake: 'This move cost you. What should you have played?',
  blunder: 'Oops — this was a serious mistake. Find the best move.',
  miss: 'Your opponent made a mistake here. Find the best way to punish it!',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyCpLoss(cpLoss: number): MistakeClassification {
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 100) return 'mistake';
  return 'inaccuracy';
}

function sourceFromGameSource(source: string): MistakePuzzleSourceMode | null {
  if (source === 'coach') return 'coach';
  if (source === 'lichess') return 'lichess';
  if (source === 'chesscom') return 'chesscom';
  return null;
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return uci;
  }
}

function classifyGamePhase(fen: string, moveNumber: number): MistakeGamePhase {
  // Use both move number and piece count for classification
  if (moveNumber <= 12) return 'opening';

  // Count non-pawn, non-king pieces to detect endgame
  const board = fen.split(' ')[0];
  let minorMajorCount = 0;
  for (const ch of board) {
    if ('rnbqRNBQ'.includes(ch)) minorMajorCount++;
  }

  // Endgame: few pieces left or late in the game with reduced material
  if (minorMajorCount <= 4 || (moveNumber > 35 && minorMajorCount <= 6)) return 'endgame';

  // Opening extends a bit if still developing (many pieces, early moves)
  if (moveNumber <= 15 && minorMajorCount >= 12) return 'opening';

  return 'middlegame';
}

function replayPgnToFens(pgn: string): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  try {
    chess.loadPgn(pgn);
    const moves = chess.history();
    chess.reset();
    for (const move of moves) {
      chess.move(move);
      fens.push(chess.fen());
    }
  } catch {
    // If PGN fails to load, return what we have
  }
  return fens;
}

function determinePlayerColor(
  game: GameRecord,
  username?: string,
): 'white' | 'black' | null {
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return null;
  }
  if (username) {
    if (game.white.toLowerCase() === username.toLowerCase()) return 'white';
    if (game.black.toLowerCase() === username.toLowerCase()) return 'black';
  }
  return null;
}

/**
 * Get full PV line from Stockfish for a position, extending if needed.
 * Returns { bestMove, pvMoves } where pvMoves has at least MIN_PV_MOVES entries when possible.
 */
async function getPvLine(fen: string, depth: number): Promise<{ bestMove: string | null; pvMoves: string[] }> {
  let bestMove: string | null = null;
  let pvMoves: string[] = [];

  try {
    const analysis = await stockfishEngine.analyzePosition(fen, depth);
    bestMove = analysis.bestMove;
    const topLine = analysis.topLines[0] as { moves: string[] } | undefined;
    if (topLine && topLine.moves.length >= MIN_PV_MOVES) {
      pvMoves = topLine.moves;
    }
  } catch {
    // Fall through
  }

  if (!bestMove) return { bestMove: null, pvMoves: [] };

  // If PV line is too short, extend by playing best move and analyzing follow-up
  if (pvMoves.length < MIN_PV_MOVES) {
    pvMoves = [bestMove];
    try {
      const tempChess = new Chess(fen);
      tempChess.move({ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4), promotion: bestMove.length > 4 ? bestMove[4] : undefined });
      const followUp = await stockfishEngine.analyzePosition(tempChess.fen(), 14);
      if (followUp.topLines[0]) {
        pvMoves.push(...followUp.topLines[0].moves.slice(0, 4));
      }
    } catch {
      // Keep what we have
    }
  }

  return { bestMove, pvMoves };
}

// ─── Generation ─────────────────────────────────────────────────────────────

/**
 * Generate mistake puzzles from a completed game.
 * For coach games, annotations already have bestMove — extraction is instant.
 * For imported games with eval-only annotations (bestMove: null), runs Stockfish.
 * For imported games with NO annotations, runs full Stockfish analysis to detect mistakes.
 */
export async function generateMistakePuzzlesFromGame(
  gameId: string,
  username?: string,
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const existing = await db.meta.get(metaKey);
  if (existing?.value === 'true') return 0;

  const game = await db.games.get(gameId);
  if (!game) return 0;

  const sourceMode = sourceFromGameSource(game.source);
  if (!sourceMode) return 0;

  const playerColor = determinePlayerColor(game, username);
  if (!playerColor) return 0;

  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return 0;

  // If no annotations exist, run Stockfish analysis to find mistakes
  if (!game.annotations || game.annotations.length === 0) {
    return analyzeGameWithStockfish(game, gameId, sourceMode, playerColor, fens);
  }

  return generateFromAnnotations(game, gameId, sourceMode, playerColor, fens);
}

/**
 * Analyze a game move-by-move with Stockfish to detect mistakes.
 * Used for imported games that lack eval annotations.
 * Extracts full PV lines for multi-move puzzle depth.
 */
async function analyzeGameWithStockfish(
  game: GameRecord,
  gameId: string,
  sourceMode: MistakePuzzleSourceMode,
  playerColor: 'white' | 'black',
  fens: string[],
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const srsDefaults = createDefaultSrsFields();
  const now = new Date().toISOString();
  const puzzles: MistakePuzzle[] = [];

  // Replay to get SAN moves
  const chess = new Chess();
  const moves: string[] = [];
  try {
    chess.loadPgn(game.pgn);
    moves.push(...chess.history());
  } catch {
    await db.meta.put({ key: metaKey, value: 'true' });
    return 0;
  }

  // Analyze each position to build an eval curve
  const evals: (number | null)[] = [];

  try {
    await stockfishEngine.initialize();
  } catch {
    await db.meta.put({ key: metaKey, value: 'true' });
    return 0;
  }

  for (let i = 0; i < fens.length; i++) {
    try {
      const analysis = await stockfishEngine.analyzePosition(fens[i], ANALYSIS_DEPTH);
      evals.push(analysis.evaluation);
    } catch {
      evals.push(null);
    }
  }

  // Walk through player moves and detect mistakes
  const annotations: MoveAnnotation[] = [];

  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const moveColor: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    if (moveColor !== playerColor) continue;

    const fenBeforeIdx = moveIdx;
    const fenAfterIdx = moveIdx + 1;

    const evalBefore = evals[fenBeforeIdx];
    const evalAfter = evals[fenAfterIdx];
    if (evalBefore === null || evalAfter === null) continue;

    // Both evals are from White's perspective
    const cpLoss = playerColor === 'white'
      ? evalBefore - evalAfter
      : evalAfter - evalBefore;

    if (cpLoss < CP_LOSS_THRESHOLD) continue;

    const moveNumber = Math.floor(moveIdx / 2) + 1;
    const classification = classifyCpLoss(cpLoss);
    const fen = fens[fenBeforeIdx];

    // Get best move + full PV line via Stockfish
    const { bestMove, pvMoves } = await getPvLine(fen, 18);
    if (!bestMove) continue;

    const bestMoveSan = uciToSan(fen, bestMove);
    const san = moves[moveIdx];

    // Player's actual move in UCI
    let playerMove = '';
    try {
      const c = new Chess(fen);
      const m = c.move(san);
      playerMove = m.from + m.to + (m.promotion ?? '');
    } catch {
      playerMove = san;
    }

    annotations.push({
      moveNumber,
      color: moveColor,
      san,
      evaluation: evalAfter / 100,
      bestMove,
      classification,
      comment: null,
    });

    puzzles.push({
      id: generateId(),
      fen,
      playerMove,
      bestMove,
      bestMoveSan,
      moves: pvMoves.join(' '),
      cpLoss: Math.round(cpLoss),
      classification,
      gamePhase: classifyGamePhase(fen, moveNumber),
      moveNumber,
      sourceGameId: gameId,
      sourceMode,
      playerColor,
      promptText: PROMPT_TEXT[classification],
      createdAt: now,
      srsInterval: srsDefaults.interval,
      srsEaseFactor: srsDefaults.easeFactor,
      srsRepetitions: srsDefaults.repetitions,
      srsDueDate: srsDefaults.dueDate,
      srsLastReview: null,
      status: 'unsolved',
      attempts: 0,
      successes: 0,
    });
  }

  // Save annotations back to the game record so they're available for game review
  if (annotations.length > 0) {
    await db.games.update(gameId, { annotations });
  }

  if (puzzles.length > 0) {
    await db.mistakePuzzles.bulkAdd(puzzles);
  }

  await db.meta.put({ key: metaKey, value: 'true' });
  return puzzles.length;
}

/**
 * Generate puzzles from existing annotations (coach games or games with eval data).
 */
async function generateFromAnnotations(
  game: GameRecord,
  gameId: string,
  sourceMode: MistakePuzzleSourceMode,
  playerColor: 'white' | 'black',
  fens: string[],
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const srsDefaults = createDefaultSrsFields();
  const now = new Date().toISOString();
  const puzzles: MistakePuzzle[] = [];
  const annotations = game.annotations ?? [];

  for (const annotation of annotations) {
    if (annotation.color !== playerColor) continue;

    const isQualifying =
      annotation.classification === 'inaccuracy' ||
      annotation.classification === 'mistake' ||
      annotation.classification === 'blunder' ||
      annotation.classification === 'miss';
    if (!isQualifying) continue;

    // Calculate the FEN index: move 1 white = index 0 (before) → 1 (after),
    // move 1 black = index 1 (before) → 2 (after), etc.
    const fenIndex = (annotation.moveNumber - 1) * 2 + (annotation.color === 'black' ? 1 : 0);
    if (fenIndex < 0 || fenIndex >= fens.length) continue;

    const fen = fens[fenIndex]; // position BEFORE the bad move

    // Determine cpLoss from eval data
    let cpLoss: number | null = null;
    if (annotation.evaluation !== null) {
      let prevEval: number | null = null;
      for (const ann of annotations) {
        const annIdx = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
        if (annIdx === fenIndex - 1) {
          prevEval = ann.evaluation;
          break;
        }
      }

      if (prevEval !== null) {
        if (playerColor === 'white') {
          cpLoss = Math.round(Math.max(0, (prevEval - annotation.evaluation) * 100));
        } else {
          cpLoss = Math.round(Math.max(0, (annotation.evaluation - prevEval) * 100));
        }
      }
    }

    if (cpLoss === null) {
      if (annotation.classification === 'blunder') cpLoss = 350;
      else if (annotation.classification === 'mistake') cpLoss = 175;
      else if (annotation.classification === 'miss') cpLoss = 100;
      else cpLoss = 75;
    }

    if (cpLoss < CP_LOSS_THRESHOLD) continue;

    // Get bestMove + PV line via Stockfish (or annotation for quick fallback)
    let bestMove = annotation.bestMove;
    const { bestMove: sfBestMove, pvMoves } = await getPvLine(fen, 18);
    if (!bestMove) bestMove = sfBestMove;
    if (!bestMove) continue;

    const movesUci = pvMoves.length > 0 ? pvMoves.join(' ') : bestMove;
    const bestMoveSan = uciToSan(fen, bestMove);
    const classification: MistakeClassification = annotation.classification === 'miss' ? 'miss' : classifyCpLoss(cpLoss);
    const gamePhase = classifyGamePhase(fen, annotation.moveNumber);

    // Determine player's move in UCI format from annotation SAN
    let playerMove = '';
    try {
      const chess = new Chess(fen);
      const move = chess.move(annotation.san);
      playerMove = move.from + move.to + (move.promotion ?? '');
    } catch {
      playerMove = annotation.san;
    }

    puzzles.push({
      id: generateId(),
      fen,
      playerMove,
      bestMove,
      bestMoveSan,
      moves: movesUci,
      cpLoss,
      classification,
      gamePhase,
      moveNumber: annotation.moveNumber,
      sourceGameId: gameId,
      sourceMode,
      playerColor,
      promptText: PROMPT_TEXT[classification],
      createdAt: now,
      srsInterval: srsDefaults.interval,
      srsEaseFactor: srsDefaults.easeFactor,
      srsRepetitions: srsDefaults.repetitions,
      srsDueDate: srsDefaults.dueDate,
      srsLastReview: null,
      status: 'unsolved',
      attempts: 0,
      successes: 0,
    });
  }

  if (puzzles.length > 0) {
    await db.mistakePuzzles.bulkAdd(puzzles);
  }

  await db.meta.put({ key: metaKey, value: 'true' });
  return puzzles.length;
}

/**
 * Batch-generate mistake puzzles for multiple imported games.
 * Runs sequentially to avoid overloading Stockfish.
 */
export async function generateMistakePuzzlesForBatch(
  gameIds: string[],
  username: string,
): Promise<number> {
  // Limit to most recent games to avoid bogging down the system
  const limitedIds = gameIds.slice(-BATCH_GAME_LIMIT);
  let total = 0;
  for (const id of limitedIds) {
    total += await generateMistakePuzzlesFromGame(id, username);
  }
  return total;
}

// ─── Re-analysis ─────────────────────────────────────────────────────────────

export interface ReanalysisProgress {
  current: number;
  total: number;
  puzzlesFound: number;
}

/**
 * Re-analyze all imported games that haven't produced mistake puzzles.
 * Clears cached meta keys and existing puzzles, then re-runs Stockfish analysis.
 * Reports progress via callback so the UI can show a progress indicator.
 */
export async function reanalyzeImportedGames(
  onProgress?: (progress: ReanalysisProgress) => void,
): Promise<number> {
  // Find all imported games (chesscom + lichess)
  const allGames = await db.games
    .filter((g) => g.source === 'chesscom' || g.source === 'lichess')
    .toArray();

  if (allGames.length === 0) return 0;

  // Clear all existing mistake puzzles from imported games
  const importedPuzzles = await db.mistakePuzzles
    .filter((p) => p.sourceMode === 'chesscom' || p.sourceMode === 'lichess')
    .toArray();
  if (importedPuzzles.length > 0) {
    await db.mistakePuzzles.bulkDelete(importedPuzzles.map((p) => p.id));
  }

  // Clear cached meta keys so games get re-processed
  const metaKeys = allGames.map((g) => `mistakes_generated_${g.id}`);
  await db.meta.bulkDelete(metaKeys);

  // Also clear annotations on games that had none originally (so Stockfish re-analyzes)
  for (const game of allGames) {
    if (game.annotations && game.annotations.length > 0) {
      const hasFullAnnotations = game.annotations.length > 5;
      if (!hasFullAnnotations) {
        await db.games.update(game.id, { annotations: null });
      }
    }
  }

  // Determine username from first imported game
  let username = '';
  for (const game of allGames) {
    if (game.source === 'chesscom' || game.source === 'lichess') {
      username = game.white.toLowerCase();
      break;
    }
  }

  // Re-run analysis on all games
  let totalPuzzles = 0;
  for (let i = 0; i < allGames.length; i++) {
    onProgress?.({ current: i + 1, total: allGames.length, puzzlesFound: totalPuzzles });

    const freshGame = await db.games.get(allGames[i].id);
    if (!freshGame) continue;

    const count = await generateMistakePuzzlesFromGame(
      freshGame.id,
      username || freshGame.white,
    );
    totalPuzzles += count;
  }

  onProgress?.({ current: allGames.length, total: allGames.length, puzzlesFound: totalPuzzles });
  return totalPuzzles;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getMistakePuzzlesDue(
  limit: number = 20,
): Promise<MistakePuzzle[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.mistakePuzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

export async function getMistakePuzzlesByGame(
  gameId: string,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('sourceGameId')
    .equals(gameId)
    .toArray();
}

export async function getMistakePuzzlesByClassification(
  classification: MistakeClassification,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('classification')
    .equals(classification)
    .toArray();
}

export async function getAllMistakePuzzles(): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles.toArray();
}

export async function getMistakePuzzlesByPhase(
  phase: MistakeGamePhase,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('gamePhase')
    .equals(phase)
    .toArray();
}

// ─── Grading ────────────────────────────────────────────────────────────────

export async function gradeMistakePuzzle(
  id: string,
  grade: SrsGrade,
  correct: boolean,
): Promise<void> {
  const puzzle = await db.mistakePuzzles.get(id);
  if (!puzzle) return;

  const srs = calculateNextInterval(
    grade,
    puzzle.srsInterval,
    puzzle.srsEaseFactor,
    puzzle.srsRepetitions,
  );

  const newAttempts = puzzle.attempts + 1;
  const newSuccesses = correct ? puzzle.successes + 1 : puzzle.successes;

  let newStatus: MistakePuzzleStatus = puzzle.status;
  if (correct && puzzle.status === 'unsolved') {
    newStatus = 'solved';
  }
  if (correct && srs.repetitions >= MASTERY_REPETITIONS) {
    newStatus = 'mastered';
  }
  if (!correct && puzzle.status !== 'mastered') {
    newStatus = puzzle.successes > 0 ? 'solved' : 'unsolved';
  }

  await db.mistakePuzzles.update(id, {
    srsInterval: srs.interval,
    srsEaseFactor: srs.easeFactor,
    srsRepetitions: srs.repetitions,
    srsDueDate: srs.dueDate,
    srsLastReview: new Date().toISOString().split('T')[0],
    status: newStatus,
    attempts: newAttempts,
    successes: newSuccesses,
  });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteMistakePuzzle(id: string): Promise<void> {
  await db.mistakePuzzles.delete(id);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface MistakePuzzleStats {
  total: number;
  unsolved: number;
  solved: number;
  mastered: number;
  byClassification: {
    inaccuracy: number;
    mistake: number;
    blunder: number;
    miss: number;
  };
  byPhase: {
    opening: number;
    middlegame: number;
    endgame: number;
  };
  dueCount: number;
}

export async function getMistakePuzzleStats(): Promise<MistakePuzzleStats> {
  const all = await db.mistakePuzzles.toArray();
  const today = new Date().toISOString().split('T')[0];

  const stats: MistakePuzzleStats = {
    total: all.length,
    unsolved: 0,
    solved: 0,
    mastered: 0,
    byClassification: { inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 },
    byPhase: { opening: 0, middlegame: 0, endgame: 0 },
    dueCount: 0,
  };

  for (const p of all) {
    if (p.status === 'unsolved') stats.unsolved++;
    else if (p.status === 'solved') stats.solved++;
    else stats.mastered++;

    stats.byClassification[p.classification]++;

    stats.byPhase[p.gamePhase]++;

    if (p.srsDueDate <= today) stats.dueCount++;
  }

  return stats;
}
