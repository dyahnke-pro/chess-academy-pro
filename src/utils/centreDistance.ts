// ONE "distance to the centre" (2026-09-26). Three computers kept their own —
// and the one in moveFundamentals had drifted into "a rank up OR a file nearer",
// so Kf2-g3 was "toward the center" while it went no nearer at all. Chebyshev
// steps to the nearest of d4/e4/d5/e5: 0 on those squares, 3 in a corner.
// Leaf: zero imports.
export function centreDistance(square: string): number {
  const [df, dr] = centreOffsets(square);
  return Math.max(df, dr);
}

/** The file and rank steps from the centre — `centreDistance` is the larger.
 *  Their sum tells two squares the king-step count calls equal apart: h1 is
 *  further out than g1 (a king tucked into the corner, 2026-11-07). */
export function centreOffsets(square: string): [number, number] {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  return [Math.min(Math.abs(f - 3), Math.abs(f - 4)), Math.min(Math.abs(r - 3), Math.abs(r - 4))];
}
