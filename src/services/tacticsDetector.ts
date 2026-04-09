import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import type { BoardHighlight } from '../types';
import type { TacticPattern, HangingPiece } from '../types/tacticTypes';
import { findHangingPieces } from './tacticClassifier';

// ─── Constants ──────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 100,
};

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
};

const BISHOP_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Highlight colors
const HANGING_DANGER_COLOR = 'rgba(239, 68, 68, 0.6)';   // red — piece at risk
const HANGING_TARGET_COLOR = 'rgba(249, 115, 22, 0.6)';   // orange — capturable enemy
const TACTIC_COLOR = 'rgba(234, 179, 8, 0.6)';            // yellow — tactic square

// ─── Result Type ────────────────────────────────────────────────────────────

export interface TacticsDetectionResult {
  highlights: BoardHighlight[];
  hangingPieces: HangingPiece[];
  tactics: TacticPattern[];
  summary: string;
}

// ─── Geometry Helpers ───────────────────────────────────────────────────────

function squareToCoords(sq: Square): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Board Helpers ──────────────────────────────────────────────────────────

/**
 * Get squares attacked by a piece at a given square.
 * Temporarily sets side-to-move to the piece's color so chess.js generates
 * legal moves (captures) from that square.
 */
function getAttackedSquares(chess: Chess, square: Square): Square[] {
  const piece = chess.get(square);
  if (!piece) return [];

  const fenParts = chess.fen().split(' ');
  fenParts[1] = piece.color;
  fenParts[3] = '-';

  try {
    const testChess = new Chess(fenParts.join(' '));
    const moves = testChess.moves({ square, verbose: true });
    const attacked = new Set<string>();
    for (const m of moves) {
      attacked.add(m.to);
    }
    return Array.from(attacked) as Square[];
  } catch {
    return [];
  }
}

/**
 * Trace a ray from a square in a given direction, returning pieces found.
 */
function traceRay(
  chess: Chess,
  fromSquare: Square,
  dir: [number, number],
  maxPieces: number = 2,
): Array<{ square: Square; type: PieceSymbol; color: Color }> {
  const [startFile, startRank] = squareToCoords(fromSquare);
  const pieces: Array<{ square: Square; type: PieceSymbol; color: Color }> = [];
  let file = startFile + dir[0];
  let rank = startRank + dir[1];

  while (file >= 0 && file <= 7 && rank >= 0 && rank <= 7) {
    const sq = coordsToSquare(file, rank);
    if (!sq) break;
    const piece = chess.get(sq);
    if (piece) {
      pieces.push({ square: sq, type: piece.type, color: piece.color });
      if (pieces.length >= maxPieces) break;
    }
    file += dir[0];
    rank += dir[1];
  }

  return pieces;
}

// ─── Static Tactic Detectors ────────────────────────────────────────────────

/**
 * Find all active forks: any piece attacking 2+ enemy pieces worth >= knight.
 */
function findForks(chess: Chess): TacticPattern[] {
  const forks: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece || piece.type === 'k') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const attackedSquares = getAttackedSquares(chess, sq);
      const targets: Array<{ square: Square; type: PieceSymbol }> = [];

      for (const aSq of attackedSquares) {
        const target = chess.get(aSq);
        if (target && target.color !== piece.color && PIECE_VALUE[target.type] >= 3) {
          targets.push({ square: aSq, type: target.type });
        }
      }

      if (targets.length >= 2) {
        const forkerName = PIECE_NAMES[piece.type] ?? piece.type;
        const targetDescs = targets.map(
          (t) => `${PIECE_NAMES[t.type] ?? t.type} on ${t.square}`,
        );
        forks.push({
          type: 'fork',
          involvedSquares: [sq, ...targets.map((t) => t.square)],
          description: `${capitalize(forkerName)} on ${sq} forks ${targetDescs.join(' and ')}`,
        });
      }
    }
  }

  return forks;
}

/**
 * Find all active pins: a sliding piece pinning an enemy piece against a
 * more valuable enemy piece behind it.
 */
function findPins(chess: Chess): TacticPattern[] {
  const pins: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
      const dirs =
        piece.type === 'b' ? BISHOP_DIRS
        : piece.type === 'r' ? ROOK_DIRS
        : [...BISHOP_DIRS, ...ROOK_DIRS];

      for (const dir of dirs) {
        const piecesOnRay = traceRay(chess, sq, dir);
        if (piecesOnRay.length < 2) continue;

        const first = piecesOnRay[0];
        const second = piecesOnRay[1];

        if (
          first.color === enemyColor &&
          second.color === enemyColor &&
          PIECE_VALUE[second.type] > PIECE_VALUE[first.type]
        ) {
          pins.push({
            type: 'pin',
            involvedSquares: [sq, first.square, second.square],
            description: `${capitalize(PIECE_NAMES[piece.type] ?? piece.type)} on ${sq} pins ${PIECE_NAMES[first.type] ?? first.type} on ${first.square} against ${PIECE_NAMES[second.type] ?? second.type} on ${second.square}`,
          });
        }
      }
    }
  }

  return pins;
}

/**
 * Find all active skewers: a sliding piece attacking a valuable enemy piece
 * with a less valuable enemy piece behind it.
 */
function findSkewers(chess: Chess): TacticPattern[] {
  const skewers: TacticPattern[] = [];
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      if (piece.type !== 'b' && piece.type !== 'r' && piece.type !== 'q') continue;

      const sq = coordsToSquare(c, 7 - r);
      if (!sq) continue;

      const enemyColor: Color = piece.color === 'w' ? 'b' : 'w';
      const dirs =
        piece.type === 'b' ? BISHOP_DIRS
        : piece.type === 'r' ? ROOK_DIRS
        : [...BISHOP_DIRS, ...ROOK_DIRS];

      for (const dir of dirs) {
        const piecesOnRay = traceRay(chess, sq, dir);
        if (piecesOnRay.length < 2) continue;

        const first = piecesOnRay[0];
        const second = piecesOnRay[1];

        if (
          first.color === enemyColor &&
          second.color === enemyColor &&
          PIECE_VALUE[first.type] > PIECE_VALUE[second.type] &&
          PIECE_VALUE[second.type] >= 1
        ) {
          skewers.push({
            type: 'skewer',
            involvedSquares: [sq, first.square, second.square],
            description: `${capitalize(PIECE_NAMES[piece.type] ?? piece.type)} on ${sq} skewers ${PIECE_NAMES[first.type] ?? first.type} on ${first.square} with ${PIECE_NAMES[second.type] ?? second.type} on ${second.square} behind it`,
          });
        }
      }
    }
  }

  return skewers;
}

// ─── Main Detection Function ────────────────────────────────────────────────

/**
 * Analyze a position for hanging pieces and simple tactics (forks, pins,
 * skewers). Returns board highlights for visualization plus structured data
 * and a human-readable summary for the coach prompt.
 *
 * Uses only chess.js — no engine required. Deterministic and fast.
 */
export function detectTactics(fen: string): TacticsDetectionResult {
  try {
    const chess = new Chess(fen);
    const turn = chess.turn();

    const hangingPieces = findHangingPieces(chess);
    const forks = findForks(chess);
    const pins = findPins(chess);
    const skewers = findSkewers(chess);
    const tactics = [...forks, ...pins, ...skewers];

    // Build highlights — hanging pieces first, then tactic squares
    const highlights: BoardHighlight[] = [];
    const highlightedSquares = new Set<string>();

    for (const hp of hangingPieces) {
      if (highlightedSquares.has(hp.square)) continue;
      highlightedSquares.add(hp.square);
      const color = hp.color === turn ? HANGING_DANGER_COLOR : HANGING_TARGET_COLOR;
      highlights.push({ square: hp.square, color });
    }

    for (const tactic of tactics) {
      for (const sq of tactic.involvedSquares) {
        if (highlightedSquares.has(sq)) continue;
        highlightedSquares.add(sq);
        highlights.push({ square: sq, color: TACTIC_COLOR });
      }
    }

    const summary = buildSummary(hangingPieces, tactics, turn);
    return { highlights, hangingPieces, tactics, summary };
  } catch {
    return { highlights: [], hangingPieces: [], tactics: [], summary: '' };
  }
}

// ─── Summary Builder ────────────────────────────────────────────────────────

/**
 * Build a human-readable summary for the coach prompt.
 */
function buildSummary(
  hangingPieces: HangingPiece[],
  tactics: TacticPattern[],
  sideToMove: Color,
): string {
  const lines: string[] = [];

  if (hangingPieces.length > 0) {
    const playerHanging = hangingPieces.filter((hp) => hp.color === sideToMove);
    const opponentHanging = hangingPieces.filter((hp) => hp.color !== sideToMove);

    if (playerHanging.length > 0) {
      const descs = playerHanging.map(
        (hp) => `${PIECE_NAMES[hp.piece] ?? hp.piece} on ${hp.square}`,
      );
      lines.push(`Side to move has hanging pieces: ${descs.join(', ')}`);
    }

    if (opponentHanging.length > 0) {
      const descs = opponentHanging.map(
        (hp) => `${PIECE_NAMES[hp.piece] ?? hp.piece} on ${hp.square}`,
      );
      lines.push(`Opponent has hanging pieces: ${descs.join(', ')}`);
    }
  }

  if (tactics.length > 0) {
    lines.push(`Active tactics: ${tactics.map((t) => t.description).join('; ')}`);
  }

  return lines.join('\n');
}
