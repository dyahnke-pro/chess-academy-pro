/**
 * PATTERN · CONNECTED ROOKS — the side's two rooks see each other along its
 * back rank (Level 4's opening card: develop everything, castle, connect).
 *
 * PRESENT for `side` (whoever is to move) when two of `side`'s rooks stand
 * on its HOME rank (rank 1 for White, rank 8 for Black) with every square
 * between them EMPTY. The king between them, an undeveloped bishop or the
 * queen still at home all keep them apart.
 * NOT counted: rooks connected on another rank or a file (doubled rooks are
 * their own idea); a single rook.
 *
 * NEAR MISS (one condition short):
 *   `one-piece-between` — two of `side`'s rooks on the home rank with exactly
 *                         ONE piece (of either colour) between them.
 */
import type { Color, Square } from 'chess.js';
import { codes, fileOf, homeRank, load, pieces, rankOf, type PatternProbe } from './board';

/** For each pair of neighbouring rooks on the home rank, how many pieces
 *  stand between them. */
function gaps(fen: string, side: Color): number[] {
  const board = load(fen);
  if (!board) return [];
  const rank = homeRank(side);
  const files = pieces(board)
    .filter((p) => p.color === side && p.type === 'r' && rankOf(p.square) === rank)
    .map((p) => fileOf(p.square))
    .sort((a, b) => a - b);
  const out: number[] = [];
  for (let i = 1; i < files.length; i++) {
    let between = 0;
    for (let f = files[i - 1] + 1; f < files[i]; f++) {
      if (board.get(`${String.fromCharCode(97 + f)}${rank}` as Square)) between += 1;
    }
    out.push(between);
  }
  return out;
}

function present(fen: string, side: Color): boolean {
  return gaps(fen, side).some((n) => n === 0);
}

function nearMisses(fen: string, side: Color): readonly string[] {
  const g = gaps(fen, side);
  if (g.some((n) => n === 0)) return [];
  return g.some((n) => n === 1) ? codes(['one-piece-between']) : [];
}

export const CONNECT_ROOKS: PatternProbe = {
  id: 'connect-rooks',
  present,
  nearMisses,
  nearMissCodes: ['one-piece-between'],
  failTwins: [
    'rn3rk1/p1p1qpp1/1p2b2p/3p4/3P4/4PN2/PP3PPP/2RQKB1R w K - 2 12',
    'r1bqk2r/4bppp/p4n2/3p4/Q7/2NB4/PP3PPP/R1B2RK1 b kq - 3 12',
  ],
};
