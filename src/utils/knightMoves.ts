const KNIGHT_OFFSETS: readonly [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

export function getKnightMoves(square: string): string[] {
  const file = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1]) - 1;
  const moves: string[] = [];
  for (const [df, dr] of KNIGHT_OFFSETS) {
    const nf = file + df;
    const nr = rank + dr;
    if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      moves.push(`${String.fromCharCode(97 + nf)}${nr + 1}`);
    }
  }
  return moves;
}
