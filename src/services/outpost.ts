/**
 * THE one outpost test (2026-09-26). Four computers kept their own and they
 * disagreed on WHERE an outpost can be: one had no rank bound at all, so a
 * bishop checking from the enemy's corner — …Bh2+ — was "the h2 outpost"
 * (review walk 900). An outpost is a square in the enemy half, short of their
 * last two ranks (relative ranks 4–6), that no enemy pawn can ever attack.
 * Whether a pawn must also SUPPORT it is the caller's decision, and required:
 * the teaching of "a supported knight they can't kick" and "a square no pawn
 * covers" differ, and a default would decide it silently.
 *
 * A leaf: chess.js types only.
 */
import type { Chess, Color, Square } from 'chess.js';

/** Rank counted from `color`'s own side (1 = its back rank). */
export function relativeRank(square: string, color: Color): number {
  const r = Number(square[1]);
  return color === 'w' ? r : 9 - r;
}

/** No enemy pawn on an adjacent file can ever advance to attack `square`. */
export function noPawnCanChallenge(board: Chess, square: string, color: Color): boolean {
  const file = square.charCodeAt(0);
  const rank = Number(square[1]);
  const enemy: Color = color === 'w' ? 'b' : 'w';
  for (const df of [-1, 1]) {
    const f = file + df;
    if (f < 97 || f > 104) continue;
    const adj = String.fromCharCode(f);
    for (let r = 1; r <= 8; r += 1) {
      const p = board.get(`${adj}${r}` as Square);
      if (!p || p.type !== 'p' || p.color !== enemy) continue;
      if (color === 'w' ? r > rank : r < rank) return false;
    }
  }
  return true;
}

export function isOutpost(board: Chess, square: string, color: Color, requirePawnSupport: boolean): boolean {
  const rel = relativeRank(square, color);
  if (rel < 4 || rel > 6) return false;
  if (!noPawnCanChallenge(board, square, color)) return false;
  if (!requirePawnSupport) return true;
  return board.attackers(square as Square, color).some((s) => {
    const p = board.get(s);
    return !!p && p.type === 'p' && p.color === color;
  });
}
