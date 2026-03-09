import type { CapturedPieces } from '../types';

const STARTING_PIECES: Record<string, number> = {
  P: 8, R: 2, N: 2, B: 2, Q: 1, K: 1,
  p: 8, r: 2, n: 2, b: 2, q: 1, k: 1,
};

const PIECE_VALUES: Record<string, number> = {
  q: 9, r: 5, b: 3, n: 3, p: 1,
};

const PIECE_UNICODE: Record<string, string> = {
  q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
  Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
};

/**
 * Parse a FEN string and count pieces on the board.
 */
function countPieces(fen: string): Record<string, number> {
  const placement = fen.split(' ')[0];
  const counts: Record<string, number> = {};

  for (const ch of placement) {
    if (/[a-zA-Z]/.test(ch) && ch !== '/') {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }

  return counts;
}

/**
 * Get captured pieces from a FEN string.
 * Returns pieces each side has captured, sorted by value (highest first).
 */
export function getCapturedPieces(fen: string): CapturedPieces {
  const current = countPieces(fen);

  // White pieces captured = starting white pieces - current white pieces
  // These are captured BY black
  const whiteLost: string[] = [];
  const blackLost: string[] = [];

  // Check white pieces (uppercase) — captured by black
  for (const piece of ['Q', 'R', 'B', 'N', 'P']) {
    const starting = STARTING_PIECES[piece];
    const remaining = current[piece] ?? 0;

    // Handle promotions: if more pieces than starting, pawns promoted
    if (piece !== 'P' && remaining > starting) {
      // Extra pieces came from pawn promotion — don't count as captured
      continue;
    }

    let lost = starting - Math.min(remaining, starting);

    // If a non-pawn piece has more than starting count, some pawns promoted to it
    // Reduce pawn losses for promotions
    if (piece === 'P') {
      // Count extra non-pawn pieces (promotions)
      for (const np of ['Q', 'R', 'B', 'N']) {
        const extra = Math.max(0, (current[np] ?? 0) - STARTING_PIECES[np]);
        lost = Math.max(0, lost - extra);
      }
    }

    for (let i = 0; i < lost; i++) {
      whiteLost.push(piece.toLowerCase());
    }
  }

  // Check black pieces (lowercase) — captured by white
  for (const piece of ['q', 'r', 'b', 'n', 'p']) {
    const starting = STARTING_PIECES[piece];
    const remaining = current[piece] ?? 0;

    if (piece !== 'p' && remaining > starting) {
      continue;
    }

    let lost = starting - Math.min(remaining, starting);

    if (piece === 'p') {
      for (const np of ['q', 'r', 'b', 'n']) {
        const extra = Math.max(0, (current[np] ?? 0) - STARTING_PIECES[np]);
        lost = Math.max(0, lost - extra);
      }
    }

    for (let i = 0; i < lost; i++) {
      blackLost.push(piece);
    }
  }

  // Sort by piece value descending
  const sortByValue = (a: string, b: string): number =>
    (PIECE_VALUES[a] ?? 0) - (PIECE_VALUES[b] ?? 0);

  // white captured = black's losses (lowercase pieces), black captured = white's losses
  return {
    white: blackLost.sort(sortByValue).reverse(),
    black: whiteLost.sort(sortByValue).reverse(),
  };
}

/**
 * Calculate material advantage. Positive = white ahead.
 */
export function getMaterialAdvantage(fen: string): number {
  const current = countPieces(fen);
  let whiteTotal = 0;
  let blackTotal = 0;

  for (const [piece, count] of Object.entries(current)) {
    const lower = piece.toLowerCase();
    if (lower === 'k') continue;
    const value = PIECE_VALUES[lower] ?? 0;
    if (piece === piece.toUpperCase()) {
      whiteTotal += value * count;
    } else {
      blackTotal += value * count;
    }
  }

  return whiteTotal - blackTotal;
}

/**
 * Convert a UCI move string to a board arrow for react-chessboard.
 */
export function uciToArrow(
  uci: string,
  color: string,
): { startSquare: string; endSquare: string; color: string } | null {
  if (!uci || uci.length < 4) return null;
  return {
    startSquare: uci.slice(0, 2),
    endSquare: uci.slice(2, 4),
    color,
  };
}

/**
 * Get Unicode symbol for a piece character.
 */
export function pieceToUnicode(piece: string): string {
  return PIECE_UNICODE[piece] ?? piece;
}
