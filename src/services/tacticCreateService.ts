import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { detectTacticType } from './missedTacticService';
import { mistakePuzzleToPuzzleRecord } from './puzzleService';
import type { MistakePuzzle, TacticType, PuzzleRecord } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TacticCreateItem {
  puzzle: PuzzleRecord;
  originalMistake: MistakePuzzle;
  tacticType: TacticType;
  /** Full game replay moves from the start up to the tactic position */
  replayMoves: ReplayMove[];
  /** How many replay moves to show before the tactic (adaptive) */
  contextDepth: number;
}

export interface ReplayMove {
  san: string;
  fen: string;
  moveNumber: number;
  isWhite: boolean;
}

// ─── Adaptive Context Depth ───────────────────────────────────────────────
// Persisted per-player. Starts at 8 moves of replay, scales up with
// consecutive solves until the player replays from move 1.

const CONTEXT_META_KEY = 'tactic_create_context_depth';
const MIN_CONTEXT = 8;
const MAX_CONTEXT = 999; // effectively unlimited — full game
const CONTEXT_STEP = 4;  // add 4 moves of replay per consecutive solve

export async function getContextDepth(): Promise<number> {
  const meta = await db.meta.get(CONTEXT_META_KEY);
  if (!meta) return MIN_CONTEXT;
  const val = parseInt(meta.value, 10);
  return isNaN(val) ? MIN_CONTEXT : Math.max(MIN_CONTEXT, Math.min(val, MAX_CONTEXT));
}

export async function updateContextDepth(consecutiveSolves: number): Promise<number> {
  const depth = Math.min(MIN_CONTEXT + consecutiveSolves * CONTEXT_STEP, MAX_CONTEXT);
  await db.meta.put({ key: CONTEXT_META_KEY, value: String(depth) });
  return depth;
}

export async function resetContextDepth(): Promise<void> {
  await db.meta.put({ key: CONTEXT_META_KEY, value: String(MIN_CONTEXT) });
}

// ─── Replay Builder ───────────────────────────────────────────────────────

function buildFullReplay(gamePgn: string, mistakeFen: string): ReplayMove[] {
  try {
    const chess = new Chess();
    chess.loadPgn(gamePgn);
    const history = chess.history();
    chess.reset();

    const moves: ReplayMove[] = [];
    for (let i = 0; i < history.length; i++) {
      chess.move(history[i]);
      moves.push({
        san: history[i],
        fen: chess.fen(),
        moveNumber: Math.floor(i / 2) + 1,
        isWhite: i % 2 === 0,
      });
      // Stop at the tactic position
      if (chess.fen() === mistakeFen) break;
    }

    return moves;
  } catch {
    return [];
  }
}

// ─── Queue Builder ────────────────────────────────────────────────────────

/**
 * Build a Create-mode queue. Selects tactical mistake puzzles that have
 * source games with enough moves for meaningful game replay.
 *
 * The contextDepth determines how many moves of the game to replay
 * before the tactic appears. It scales adaptively across sessions.
 */
export async function buildTacticCreateQueue(
  count: number = 10,
  filterTypes?: TacticType[],
): Promise<TacticCreateItem[]> {
  const contextDepth = await getContextDepth();

  // Get mistake puzzles with source games and significant CP loss
  const allMistakes = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 50 && m.sourceGameId !== '')
    .toArray();

  // Classify and filter to tactical types only
  const classified: Array<{ mistake: MistakePuzzle; tacticType: TacticType }> = [];
  for (const m of allMistakes) {
    const tacticType = detectTacticType(m.fen, m.bestMove);
    if (tacticType === 'tactical_sequence') continue;
    if (filterTypes && !filterTypes.includes(tacticType)) continue;
    classified.push({ mistake: m, tacticType });
  }

  // Shuffle for variety — Create mode is about sustained alertness,
  // not SRS-optimized repetition (that's Layer 2's job)
  shuffleArray(classified);

  const result: TacticCreateItem[] = [];

  for (const { mistake, tacticType } of classified) {
    if (result.length >= count) break;

    // Load the source game
    const game = await db.games.get(mistake.sourceGameId);
    if (!game?.pgn) continue;

    const replayMoves = buildFullReplay(game.pgn, mistake.fen);

    // Need enough moves for a meaningful replay
    // At minimum, require 6 moves so the player gets some game feel
    if (replayMoves.length < 6) continue;

    result.push({
      puzzle: mistakePuzzleToPuzzleRecord(mistake),
      originalMistake: mistake,
      tacticType,
      replayMoves,
      contextDepth: Math.min(contextDepth, replayMoves.length),
    });
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function shuffleArray(array: unknown[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
