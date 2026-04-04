import { Chess } from 'chess.js';

/**
 * Convert a single UCI move (e.g. "e2e4") to SAN (e.g. "e4") given a FEN.
 * Returns the UCI string unchanged if conversion fails.
 */
export function uciMoveToSan(uci: string, fen: string): string {
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

/**
 * Convert a list of UCI moves into SAN notation with move numbers.
 * Shows up to `maxMoves` from the PV line.
 */
export function uciLinesToSan(uciMoves: string[], fen: string, maxMoves: number = 6): string {
  try {
    const chess = new Chess(fen);
    const result: string[] = [];
    for (let i = 0; i < Math.min(uciMoves.length, maxMoves); i++) {
      const from = uciMoves[i].slice(0, 2);
      const to = uciMoves[i].slice(2, 4);
      const promotion = uciMoves[i].length > 4 ? uciMoves[i][4] : undefined;
      const move = chess.move({ from, to, promotion });
      // After white plays, moveNumber() stays the same. After black plays, it increments.
      // So for white's move: use moveNumber() directly. For black: use moveNumber() - 1.
      if (move.color === 'w') {
        result.push(`${chess.moveNumber()}.${move.san}`);
      } else if (i === 0) {
        result.push(`${chess.moveNumber() - 1}...${move.san}`);
      } else {
        result.push(move.san);
      }
    }
    return result.join(' ');
  } catch {
    // Fallback to UCI if parsing fails
    return uciMoves.slice(0, maxMoves).join(' ');
  }
}
