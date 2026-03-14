import { Chess } from 'chess.js';
import type {
  MiniGameAiConfig,
  MiniGameHighlightMode,
  MiniGameId,
  MiniGameDifficulty,
} from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MoveCandidate {
  from: string;
  to: string;
  promotion?: string;
  score: number;
}

export interface HighlightResult {
  dangerSquares: string[];
  safeSquares: string[];
}

export interface ArrowData {
  startSquare: string;
  endSquare: string;
  color: string;
}

// ─── Win Detection ──────────────────────────────────────────────────────────

/**
 * Check whether a side has won after the latest move.
 * A side wins when one of its pawns promotes (SAN contains '=').
 * Also checks for the edge-case where one side has no pawns remaining
 * or has no legal pawn moves on its turn.
 */
export function checkWinCondition(
  fen: string,
  lastMoveSan: string | null,
  lastMoveColor: 'w' | 'b' | null,
): 'w' | 'b' | null {
  // Promotion → immediate win for the promoting side
  if (lastMoveSan && lastMoveColor && lastMoveSan.includes('=')) {
    return lastMoveColor;
  }

  const chess = new Chess(fen);
  const board = chess.board();

  let whitePawns = 0;
  let blackPawns = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell?.type === 'p') {
        if (cell.color === 'w') whitePawns++;
        else blackPawns++;
      }
    }
  }

  // If one side has lost all pawns the other wins
  if (whitePawns === 0 && blackPawns > 0) return 'b';
  if (blackPawns === 0 && whitePawns > 0) return 'w';

  // If the side to move has no legal pawn moves it loses
  const pawnMoves = chess
    .moves({ verbose: true })
    .filter((m) => m.piece === 'p');
  if (pawnMoves.length === 0) {
    return chess.turn() === 'w' ? 'b' : 'w';
  }

  return null;
}

// ─── Square Computation ─────────────────────────────────────────────────────

/** All squares attacked by pawns of `attackerColor`. */
export function computeAttackedSquares(
  fen: string,
  attackerColor: 'w' | 'b',
): string[] {
  const chess = new Chess(fen);
  const board = chess.board();
  const attacked = new Set<string>();

  for (const row of board) {
    for (const cell of row) {
      if (cell?.type === 'p' && cell.color === attackerColor) {
        const file = cell.square.charCodeAt(0) - 97; // 0-7
        const rank = parseInt(cell.square[1]);
        const dir = attackerColor === 'w' ? 1 : -1;
        const targetRank = rank + dir;

        if (targetRank >= 1 && targetRank <= 8) {
          if (file > 0) {
            attacked.add(`${String.fromCharCode(96 + file)}${targetRank}`);
          }
          if (file < 7) {
            attacked.add(`${String.fromCharCode(98 + file)}${targetRank}`);
          }
        }
      }
    }
  }

  return [...attacked];
}

/**
 * Squares where the player's pawns can legally move **without** landing on
 * a square that is currently attacked by the opponent's pawns.
 */
export function computeSafeSquares(
  fen: string,
  playerColor: 'w' | 'b',
): string[] {
  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  const dangerSet = new Set(computeAttackedSquares(fen, opponentColor));

  const chess = new Chess(fen);
  const pawnMoves = chess
    .moves({ verbose: true })
    .filter((m) => m.piece === 'p');

  const safe = new Set<string>();
  for (const m of pawnMoves) {
    if (!dangerSet.has(m.to)) {
      safe.add(m.to);
    }
  }

  return [...safe];
}

/** Compute highlight squares based on the level's highlight mode. */
export function computeHighlights(
  fen: string,
  playerColor: 'w' | 'b',
  mode: MiniGameHighlightMode,
): HighlightResult {
  if (mode === 'none') {
    return { dangerSquares: [], safeSquares: [] };
  }

  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  const dangerSquares = computeAttackedSquares(fen, opponentColor);

  if (mode === 'danger') {
    return { dangerSquares, safeSquares: [] };
  }

  // mode === 'all'
  const safeSquares = computeSafeSquares(fen, playerColor);
  return { dangerSquares, safeSquares };
}

// ─── AI Move Selection ──────────────────────────────────────────────────────

/** Return all pawn squares for a given colour, sorted by file. */
function getPawnSquares(chess: Chess, color: 'w' | 'b'): string[] {
  const squares: string[] = [];
  const board = chess.board();
  for (const row of board) {
    for (const cell of row) {
      if (cell?.type === 'p' && cell.color === color) {
        squares.push(cell.square);
      }
    }
  }
  return squares.sort();
}

/** Simple advancement score — how close a square is to the promotion rank. */
function advancementScore(square: string, color: 'w' | 'b'): number {
  const rank = parseInt(square[1]);
  return color === 'w' ? rank : 9 - rank;
}

/**
 * Select the AI's next pawn move.
 * Returns a UCI-style string like "e7e6" or "e7e8q" (with promotion).
 * Returns null if no legal pawn move exists.
 */
export function getAiMove(
  fen: string,
  aiConfig: MiniGameAiConfig,
  gameType: MiniGameId,
): string | null {
  const chess = new Chess(fen);
  const aiColor = chess.turn();
  const allMoves = chess.moves({ verbose: true });
  const pawnMoves = allMoves.filter((m) => m.piece === 'p');

  if (pawnMoves.length === 0) return null;

  // Random roll: play a random pawn move if below bestMoveChance threshold
  if (Math.random() >= aiConfig.bestMoveChance) {
    const pick = pawnMoves[Math.floor(Math.random() * pawnMoves.length)];
    return `${pick.from}${pick.to}${pick.promotion ?? ''}`;
  }

  // --- Smart move scoring ---
  const opponentColor = aiColor === 'w' ? 'b' : 'w';

  // Find opponent's most advanced pawn rank for blocking heuristic
  let maxOpponentAdv = 0;
  if (aiConfig.blocksAdvancedPawn) {
    for (const sq of getPawnSquares(chess, opponentColor)) {
      maxOpponentAdv = Math.max(maxOpponentAdv, advancementScore(sq, opponentColor));
    }
  }

  // Identify target pawn square for Blocker mode
  let targetSquare: string | null = null;
  if (gameType === 'blocker' && aiConfig.targetPawnFile) {
    const aiPawns = getPawnSquares(chess, aiColor);
    targetSquare =
      aiPawns.find((sq) => sq[0] === aiConfig.targetPawnFile) ?? null;
  }

  const candidates: MoveCandidate[] = pawnMoves.map((m) => {
    let score = 0;

    // Base advancement
    score += advancementScore(m.to, aiColor);

    // Capture bonus
    if (m.captured) score += 8;

    // Push already-advanced pawns (greedy race)
    if (aiConfig.prioritizesAdvancement) {
      score += advancementScore(m.from, aiColor) * 2;
    }

    // Blocking: extra reward for capturing the opponent's most-advanced pawn
    if (aiConfig.blocksAdvancedPawn && m.captured) {
      const capturedAdv = advancementScore(m.to, opponentColor);
      if (capturedAdv >= maxOpponentAdv - 1) {
        score += 12;
      }
    }

    // Blocker target-pawn bonus
    if (targetSquare && m.from === targetSquare) {
      score += 18;
    }

    // Promotion bonus (immediate win)
    if (m.promotion) score += 50;

    return {
      from: m.from,
      to: m.to,
      promotion: m.promotion ?? undefined,
      score,
    };
  });

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return `${best.from}${best.to}${best.promotion ?? ''}`;
}

// ─── Best Player Move (for hints) ──────────────────────────────────────────

/** Score and return the best pawn move for the player (used by hint system). */
export function getBestPlayerMove(
  fen: string,
  playerColor: 'w' | 'b',
): { from: string; to: string } | null {
  const chess = new Chess(fen);
  if (chess.turn() !== playerColor) return null;

  const pawnMoves = chess
    .moves({ verbose: true })
    .filter((m) => m.piece === 'p');
  if (pawnMoves.length === 0) return null;

  const opponentColor = playerColor === 'w' ? 'b' : 'w';
  const dangerSet = new Set(computeAttackedSquares(fen, opponentColor));

  let best: { from: string; to: string } | null = null;
  let bestScore = -Infinity;

  for (const m of pawnMoves) {
    let score = advancementScore(m.to, playerColor);

    // Prefer safe squares
    if (!dangerSet.has(m.to)) score += 4;

    // Prefer captures
    if (m.captured) score += 6;

    // Promotion is best
    if (m.promotion) score += 50;

    if (score > bestScore) {
      bestScore = score;
      best = { from: m.from, to: m.to };
    }
  }

  return best;
}

// ─── Hint Arrows ────────────────────────────────────────────────────────────

/**
 * Compute hint arrows.
 *  - hintLevel 1 → red arrows showing enemy pawn attack lines
 *  - hintLevel 2 → green arrow pointing to recommended move
 */
export function getHintArrows(
  fen: string,
  playerColor: 'w' | 'b',
  hintLevel: number,
): ArrowData[] {
  if (hintLevel <= 0) return [];

  const arrows: ArrowData[] = [];
  const opponentColor = playerColor === 'w' ? 'b' : 'w';

  if (hintLevel >= 1) {
    // Show attack arrows from opponent pawns to the squares they threaten
    const chess = new Chess(fen);
    const board = chess.board();
    for (const row of board) {
      for (const cell of row) {
        if (cell?.type === 'p' && cell.color === opponentColor) {
          const file = cell.square.charCodeAt(0) - 97;
          const rank = parseInt(cell.square[1]);
          const dir = opponentColor === 'w' ? 1 : -1;
          const targetRank = rank + dir;
          if (targetRank >= 1 && targetRank <= 8) {
            if (file > 0) {
              arrows.push({
                startSquare: cell.square,
                endSquare: `${String.fromCharCode(96 + file)}${targetRank}`,
                color: 'rgba(239, 68, 68, 0.7)',
              });
            }
            if (file < 7) {
              arrows.push({
                startSquare: cell.square,
                endSquare: `${String.fromCharCode(98 + file)}${targetRank}`,
                color: 'rgba(239, 68, 68, 0.7)',
              });
            }
          }
        }
      }
    }
  }

  if (hintLevel >= 2) {
    const best = getBestPlayerMove(fen, playerColor);
    if (best) {
      arrows.push({
        startSquare: best.from,
        endSquare: best.to,
        color: 'rgba(34, 197, 94, 0.85)',
      });
    }
  }

  return arrows;
}

// ─── Star Calculation ───────────────────────────────────────────────────────

/**
 * Calculate star rating (1–3) for a completed level.
 *  - 3 stars: no hints used (on level 3) and ≤ 2 extra moves
 *  - 2 stars: ≤ 1 hint or 3–4 extra moves
 *  - 1 star:  completed (anything worse)
 *
 * On levels 1–2 hints don't penalise stars.
 */
export function computeStars(
  hintsUsed: number,
  extraMoves: number,
  level: MiniGameDifficulty,
): number {
  const hintPenalty = level === 3 ? hintsUsed : 0;

  if (hintPenalty === 0 && extraMoves <= 2) return 3;
  if (hintPenalty <= 1 && extraMoves <= 4) return 2;
  return 1;
}

// ─── Target Pawn Square (Blocker) ───────────────────────────────────────────

/**
 * Identify the target pawn's current square for visual marking in Blocker.
 * Returns null if the target pawn has been captured or isn't found.
 */
export function getTargetPawnSquare(
  fen: string,
  aiColor: 'w' | 'b',
  targetPawnFile: string | undefined,
): string | null {
  if (!targetPawnFile) return null;
  const chess = new Chess(fen);
  const pawns = getPawnSquares(chess, aiColor);
  return pawns.find((sq) => sq[0] === targetPawnFile) ?? null;
}
