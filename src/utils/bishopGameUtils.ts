/**
 * Pure utility functions for bishop mini-games.
 * No React or chess.js dependencies — all logic is custom.
 */

/** Convert algebraic square (e.g. 'e4') to zero-based coords. */
export function squareToCoords(square: string): { file: number; rank: number } {
  return {
    file: square.charCodeAt(0) - 97, // a=0 … h=7
    rank: parseInt(square[1]) - 1,    // 1=0 … 8=7
  };
}

/** Convert zero-based coords back to algebraic square. */
export function coordsToSquare(file: number, rank: number): string {
  return `${String.fromCharCode(97 + file)}${rank + 1}`;
}

/** True if the square is a light square (a1 is dark, a2 is light, etc.). */
export function isLightSquare(square: string): boolean {
  const { file, rank } = squareToCoords(square);
  return (file + rank) % 2 !== 0;
}

/** True if the square is a dark square. */
export function isDarkSquare(square: string): boolean {
  return !isLightSquare(square);
}

/** Check if a piece character is a black piece (lowercase). */
function isBlackPiece(piece: string): boolean {
  return piece === piece.toLowerCase() && piece !== piece.toUpperCase();
}

const DIAGONALS: Array<{ df: number; dr: number }> = [
  { df: 1, dr: 1 },
  { df: 1, dr: -1 },
  { df: -1, dr: 1 },
  { df: -1, dr: -1 },
];

/**
 * Get all legal moves for a bishop at the given square.
 * Walks each diagonal until hitting the edge or a piece.
 * Can capture black pieces (stops on them). Cannot pass through or capture white pieces.
 */
export function getBishopMoves(
  bishopSquare: string,
  pieces: Record<string, string>,
): string[] {
  const { file, rank } = squareToCoords(bishopSquare);
  const moves: string[] = [];

  for (const { df, dr } of DIAGONALS) {
    let f = file + df;
    let r = rank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const sq = coordsToSquare(f, r);
      const occupant = pieces[sq];
      if (occupant) {
        if (isBlackPiece(occupant)) {
          moves.push(sq); // can capture
        }
        break; // blocked by any piece
      }
      moves.push(sq);
      f += df;
      r += dr;
    }
  }

  return moves;
}

/**
 * Build a FEN string from a piece map for display in ChessBoard.
 * Adds dummy kings at a1 (white) and h8 (black) if not already present,
 * so chess.js accepts the position.
 */
export function positionToFen(pieces: Record<string, string>): string {
  const board = { ...pieces };
  // Ensure kings exist for chess.js validity
  if (!Object.values(board).includes('K')) {
    board['a1'] = 'K';
  }
  if (!Object.values(board).includes('k')) {
    board['h8'] = 'k';
  }

  const ranks: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let rank = '';
    let empty = 0;
    for (let f = 0; f <= 7; f++) {
      const sq = coordsToSquare(f, r);
      const piece = board[sq];
      if (piece) {
        if (empty > 0) {
          rank += empty;
          empty = 0;
        }
        rank += piece;
      } else {
        empty++;
      }
    }
    if (empty > 0) rank += empty;
    ranks.push(rank);
  }

  return `${ranks.join('/')} w - - 0 1`;
}

/**
 * Advance all black pawns one rank toward rank 1 (downward).
 * A pawn on rank 1 cannot advance further (already promoted/lost).
 * Returns a new pieces object.
 */
export function advancePawns(pieces: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [sq, piece] of Object.entries(pieces)) {
    if (piece === 'p') {
      const { file, rank } = squareToCoords(sq);
      if (rank > 0) {
        const newSq = coordsToSquare(file, rank - 1);
        // Only advance if destination is empty (don't stack on existing pieces)
        if (!pieces[newSq] && !next[newSq]) {
          next[newSq] = 'p';
        } else {
          next[sq] = 'p'; // stay in place if blocked
        }
      } else {
        next[sq] = 'p'; // already on rank 1
      }
    } else {
      next[sq] = piece;
    }
  }

  return next;
}

/** True if any black pawn has reached rank 1 (index 0). */
export function checkPawnPromotion(pieces: Record<string, string>): boolean {
  for (const [sq, piece] of Object.entries(pieces)) {
    if (piece === 'p') {
      const { rank } = squareToCoords(sq);
      if (rank === 0) return true;
    }
  }
  return false;
}

/** Count all enemy (black/lowercase) pieces excluding the dummy king. */
export function countEnemyPieces(pieces: Record<string, string>): number {
  let count = 0;
  for (const piece of Object.values(pieces)) {
    if (isBlackPiece(piece) && piece !== 'k') {
      count++;
    }
  }
  return count;
}

/** Count all black pawns specifically. */
export function countBlackPawns(pieces: Record<string, string>): number {
  let count = 0;
  for (const piece of Object.values(pieces)) {
    if (piece === 'p') count++;
  }
  return count;
}

/**
 * Get squares the bishop currently threatens (attacks).
 * Same as getBishopMoves but may be used for UI highlight separately.
 */
export function getThreatenedSquares(
  bishopSquare: string,
  pieces: Record<string, string>,
): string[] {
  return getBishopMoves(bishopSquare, pieces);
}

/**
 * Find all squares containing a specific piece type.
 */
export function findPieceSquares(
  pieces: Record<string, string>,
  pieceChar: string,
): string[] {
  return Object.entries(pieces)
    .filter(([, p]) => p === pieceChar)
    .map(([sq]) => sq);
}

/**
 * Get the promotion rank squares (rank 1) for visual highlights.
 * Only returns squares in files a-h on rank 1.
 */
export function getPromotionRankSquares(): string[] {
  return Array.from({ length: 8 }, (_, f) => coordsToSquare(f, 0));
}
