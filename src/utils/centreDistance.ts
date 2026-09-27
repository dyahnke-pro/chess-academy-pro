// ONE "distance to the centre" (2026-09-26). Three computers kept their own —
// and the one in moveFundamentals had drifted into "a rank up OR a file nearer",
// so Kf2-g3 was "toward the center" while it went no nearer at all. Chebyshev
// steps to the nearest of d4/e4/d5/e5: 0 on those squares, 3 in a corner.
// Leaf: zero imports.
export function centreDistance(square: string): number {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  const df = Math.min(Math.abs(f - 3), Math.abs(f - 4));
  const dr = Math.min(Math.abs(r - 3), Math.abs(r - 4));
  return Math.max(df, dr);
}
