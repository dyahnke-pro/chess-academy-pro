// Lichess Syzygy Tablebase — perfect play info for positions with ≤7 pieces.
// API: https://tablebase.lichess.ovh/standard?fen=...

export type TablebaseCategory = 'win' | 'draw' | 'loss' | 'cursed-win' | 'blessed-loss' | 'unknown';

export interface TablebaseMove {
  uci: string;
  san: string;
  /** Distance to zeroing (capture/pawn push) — null if unknown */
  dtz: number | null;
  /** Distance to mate — null if unknown */
  dtm: number | null;
  zeroing: boolean;
  checkmate: boolean;
  stalemate: boolean;
  variant_win: boolean;
  variant_loss: boolean;
  insufficient_material: boolean;
  category: TablebaseCategory;
}

export interface TablebaseResult {
  /** Distance to zeroing — null if not in tablebase */
  dtz: number | null;
  /** Distance to mate — null if not in tablebase */
  dtm: number | null;
  checkmate: boolean;
  stalemate: boolean;
  variant_win: boolean;
  variant_loss: boolean;
  insufficient_material: boolean;
  category: TablebaseCategory;
  moves: TablebaseMove[];
}

/**
 * Returns a human-readable verdict string from a tablebase result.
 * e.g. "White wins in 14 moves", "Draw", "Black wins in 8 moves"
 */
export function formatTablebaseVerdict(result: TablebaseResult, sideToMove: 'w' | 'b'): string {
  if (result.checkmate) return 'Checkmate';
  if (result.stalemate) return 'Stalemate';
  if (result.insufficient_material) return 'Draw (insufficient material)';

  switch (result.category) {
    case 'win': {
      const winner = sideToMove === 'w' ? 'White' : 'Black';
      const moves = result.dtm !== null ? ` in ${Math.abs(result.dtm)} moves` : '';
      return `${winner} wins${moves}`;
    }
    case 'loss': {
      const winner = sideToMove === 'w' ? 'Black' : 'White';
      const moves = result.dtm !== null ? ` in ${Math.abs(result.dtm)} moves` : '';
      return `${winner} wins${moves}`;
    }
    case 'cursed-win':
      return 'Cursed win (50-move rule draw with best play)';
    case 'blessed-loss':
      return 'Blessed loss (50-move rule draw with best play)';
    case 'draw':
    default:
      return 'Theoretical draw';
  }
}

/**
 * Count the number of pieces in a FEN string (excludes kings for 7-piece limit check).
 * Returns total piece count including kings.
 */
export function countPieces(fen: string): number {
  const board = fen.split(' ')[0] ?? '';
  let count = 0;
  for (const ch of board) {
    if (/[pPnNbBrRqQkK]/.test(ch)) count++;
  }
  return count;
}

/**
 * Fetch tablebase data for a FEN position.
 * Only call this when piece count ≤ 7 — throws if > 7 pieces.
 */
export async function fetchTablebase(fen: string): Promise<TablebaseResult> {
  if (countPieces(fen) > 7) {
    throw new Error('Tablebase only supports positions with 7 or fewer pieces');
  }

  const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Tablebase API error: ${response.status}`);
  }

  return (await response.json()) as TablebaseResult;
}
