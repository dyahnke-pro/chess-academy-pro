/**
 * material_count — read-only deterministic accessor for the material
 * balance and full piece inventory of a FEN.
 *
 * Why this tool exists: the LLM frequently miscounts material from
 * the bare FEN string ("you're up a pawn" when material is even, or
 * vice versa). Calling this tool gives a ground-truth count plus the
 * standard centipawn-equivalent point balance so the brain's
 * pedagogy ("trade pieces, you're winning material") stays grounded.
 */
import { Chess, type PieceSymbol } from 'chess.js';
import type { Tool } from '../../types';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0, // King has no captured value — both sides always have one (or the game's over).
};

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawns',
  n: 'knights',
  b: 'bishops',
  r: 'rooks',
  q: 'queens',
  k: 'kings',
};

export const materialCountTool: Tool = {
  name: 'material_count',
  category: 'cerebellum',
  kind: 'read',
  description:
    'Count material on the board for a given FEN. Returns per-piece-type counts for both colors plus the centipawn-equivalent point balance (positive = white ahead, negative = black ahead). Call this before claims like "you are up material" — chess.js owns the count, so the answer is exact.',
  parameters: {
    type: 'object',
    properties: {
      fen: { type: 'string', description: 'Position FEN.' },
    },
    required: ['fen'],
  },
  async execute(args) {
    const fen = typeof args.fen === 'string' ? args.fen : '';
    if (!fen.trim()) return { ok: false, error: 'fen is required' };

    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch (err) {
      return { ok: false, error: `invalid fen: ${err instanceof Error ? err.message : String(err)}` };
    }

    const counts: Record<'white' | 'black', Record<string, number>> = {
      white: { pawns: 0, knights: 0, bishops: 0, rooks: 0, queens: 0, kings: 0 },
      black: { pawns: 0, knights: 0, bishops: 0, rooks: 0, queens: 0, kings: 0 },
    };
    let whitePoints = 0;
    let blackPoints = 0;

    for (const file of 'abcdefgh') {
      for (const rank of '12345678') {
        const sq = `${file}${rank}` as Parameters<Chess['get']>[0];
        const piece = chess.get(sq);
        if (!piece) continue;
        const colorKey = piece.color === 'w' ? 'white' : 'black';
        const name = PIECE_NAMES[piece.type];
        counts[colorKey][name] += 1;
        if (piece.color === 'w') whitePoints += PIECE_VALUES[piece.type];
        else blackPoints += PIECE_VALUES[piece.type];
      }
    }

    // Bishop-pair micro-bonus is intentionally NOT added here. The
    // raw count + standard point values give a clean ground truth;
    // any positional adjustment is the LLM's job, not this tool's.
    const balance = whitePoints - blackPoints;
    const verdict =
      balance > 0
        ? `White is up ${balance} point${balance === 1 ? '' : 's'}`
        : balance < 0
          ? `Black is up ${Math.abs(balance)} point${Math.abs(balance) === 1 ? '' : 's'}`
          : 'Material is equal';

    return {
      ok: true,
      result: {
        white: counts.white,
        black: counts.black,
        whitePoints,
        blackPoints,
        balance,
        verdict,
      },
    };
  },
};
