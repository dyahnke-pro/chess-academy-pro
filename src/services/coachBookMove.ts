/**
 * coachBookMove
 * -------------
 * Pulls a weighted "book" move for a given position from the Lichess
 * Opening Explorer. Used in the play-against flow so the coach plays
 * natural, popular opening moves in the early game instead of whatever
 * Stockfish happens to prefer at a low skill level.
 *
 * Deliberately conservative:
 *   - Only consults the explorer when the position is still in known
 *     theory (we default to first 12 plies).
 *   - Only returns a move when there are enough games to be meaningful
 *     (≥ 500 total by default), to avoid playing random sidelines.
 *   - Weights the moves by play frequency so the top line is likely but
 *     not forced — gives some variety across sessions.
 *   - Silently returns null on network error; the caller falls back to
 *     Stockfish.
 */
import { Chess } from 'chess.js';
import { fetchLichessExplorer } from './lichessExplorerService';
import type { LichessExplorerMove, LichessExplorerResult } from '../types';

export interface BookMoveOptions {
  /** Maximum ply count at which we'll consult the book. Defaults to 12. */
  maxPly?: number;
  /** Minimum total games across all replies required to trust the data. */
  minTotalGames?: number;
  /** Number of top replies to keep before weighted random selection. */
  topN?: number;
  /** Random source for tests (defaults to Math.random). */
  rng?: () => number;
  /** Pre-fetched explorer payload — tests inject this to avoid network calls. */
  __explorerResultForTests?: LichessExplorerResult | null;
}

export interface BookMoveResult {
  /** SAN of the chosen move (e.g. "Nf3"). */
  san: string;
  /** UCI of the chosen move (e.g. "g1f3"). */
  uci: string;
  /** Opening name from the explorer, if known. */
  openingName?: string;
}

const DEFAULTS = {
  maxPly: 12,
  minTotalGames: 500,
  topN: 3,
} as const;

/**
 * Try to select a book move for the given FEN. Returns null when:
 *  - the position is past the opening horizon;
 *  - the explorer has too few games to be reliable;
 *  - the network call fails;
 *  - no legal moves are returned.
 */
export async function pickBookMove(
  fen: string,
  options: BookMoveOptions = {},
): Promise<BookMoveResult | null> {
  const opts = { ...DEFAULTS, ...options };
  const ply = plyCountFromFen(fen);
  if (ply > opts.maxPly) return null;

  let result: LichessExplorerResult | null;
  try {
    result = options.__explorerResultForTests !== undefined
      ? options.__explorerResultForTests
      : await fetchLichessExplorer(fen, 'lichess');
  } catch {
    return null;
  }
  if (!result) return null;

  const total = result.white + result.draws + result.black;
  if (total < opts.minTotalGames) return null;
  if (!result.moves.length) return null;

  const candidates = result.moves
    .filter((m) => (m.white + m.draws + m.black) > 0)
    .slice(0, opts.topN);
  if (candidates.length === 0) return null;

  const chosen = weightedPick(candidates, options.rng ?? Math.random);
  if (!chosen) return null;

  return {
    san: chosen.san,
    uci: chosen.uci,
    openingName: result.opening?.name,
  };
}

/**
 * Derive the half-move (ply) count from a FEN's fullmove + side-to-move.
 */
export function plyCountFromFen(fen: string): number {
  const parts = fen.split(' ');
  const sideToMove = parts[1];
  const fullMoveNumber = parseInt(parts[5] ?? '1', 10) || 1;
  // Plies played before the current position. At start (move 1, White to
  // move), fullMoveNumber=1 and no plies played → returns 0.
  return (fullMoveNumber - 1) * 2 + (sideToMove === 'b' ? 1 : 0);
}

/**
 * Weighted random selection over the explorer move list by total games
 * played. Pure — injectable rng makes it deterministic in tests.
 */
function weightedPick(
  moves: LichessExplorerMove[],
  rng: () => number,
): LichessExplorerMove | null {
  const weights = moves.map((m) => m.white + m.draws + m.black);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const r = rng() * total;
  let acc = 0;
  for (let i = 0; i < moves.length; i++) {
    acc += weights[i];
    if (r < acc) return moves[i];
  }
  return moves[moves.length - 1] ?? null;
}

/**
 * Convert the chosen book move's SAN to a UCI-compatible `{from, to,
 * promotion}` triple. The explorer already gives us UCI, but we parse
 * defensively to catch malformed payloads.
 */
export function bookMoveToSquares(book: BookMoveResult): {
  from: string;
  to: string;
  promotion?: string;
} | null {
  const uci = book.uci;
  if (uci.length < 4) return null;
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

/**
 * Validate a book move against the actual position. The explorer
 * occasionally returns moves that are illegal in the exact FEN (e.g.
 * castling rights mismatch). Returns true when chess.js accepts it.
 */
export function isBookMoveLegal(fen: string, book: BookMoveResult): boolean {
  const squares = bookMoveToSquares(book);
  if (!squares) return false;
  const chess = new Chess(fen);
  try {
    chess.move(squares);
    return true;
  } catch {
    return false;
  }
}
