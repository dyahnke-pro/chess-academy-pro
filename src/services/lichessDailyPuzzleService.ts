// Lichess Daily Puzzle — fetches the puzzle of the day from the Lichess API.
// Cached for 1 hour in memory to avoid hammering the API.

export interface LichessDailyPuzzle {
  id: string;
  rating: number;
  themes: string[];
  /** UCI move list — first move is played automatically, rest are the solution */
  solution: string[];
  /** PGN of the game up to the puzzle position */
  pgn: string;
  /** Number of half-moves into the PGN where the puzzle starts */
  initialPly: number;
  /** FEN at the puzzle start position (derived from PGN + initialPly if needed) */
  fen: string | null;
  white: string;
  black: string;
}

interface LichessDailyPuzzleResponse {
  game: {
    id: string;
    pgn: string;
    players: Array<{
      userId: string;
      name: string;
      color: 'white' | 'black';
      rating: number;
    }>;
  };
  puzzle: {
    id: string;
    rating: number;
    plays: number;
    solution: string[];
    themes: string[];
    initialPly: number;
  };
}

interface CacheEntry {
  puzzle: LichessDailyPuzzle;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: CacheEntry | null = null;

/**
 * Fetch today's Lichess daily puzzle.
 * Cached in memory for 1 hour.
 */
export async function fetchLichessDailyPuzzle(): Promise<LichessDailyPuzzle> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.puzzle;
  }

  const response = await fetch('https://lichess.org/api/puzzle/daily', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Lichess daily puzzle API error: ${response.status}`);
  }

  const data = (await response.json()) as LichessDailyPuzzleResponse;

  const white = data.game.players.find((p) => p.color === 'white')?.name ?? 'White';
  const black = data.game.players.find((p) => p.color === 'black')?.name ?? 'Black';

  const puzzle: LichessDailyPuzzle = {
    id: data.puzzle.id,
    rating: data.puzzle.rating,
    themes: data.puzzle.themes,
    solution: data.puzzle.solution,
    pgn: data.game.pgn,
    initialPly: data.puzzle.initialPly,
    fen: null, // computed lazily if needed
    white,
    black,
  };

  cache = { puzzle, fetchedAt: now };
  return puzzle;
}

/** Reset the cache (for testing). */
export function _resetDailyPuzzleCache(): void {
  cache = null;
}
