/**
 * theoryDeparture — Phase 4 of the Danya review build: find the ply where
 * the game left known master practice, and the book facts to teach at it.
 *
 * Tape-calibrated: Danya QUIZZES theory ("what's the main move here?")
 * before telling, and speaks to what's common at the student's LEVEL, not
 * only master practice. So the service returns BOTH: the masters' main
 * move with its share, and the same position's top move in the student's
 * amateur rating band.
 *
 * G0/G3: every fact here is a database aggregate (masters DB / explorer
 * proxy) or a chess.js replay — nothing is invented, and when the data is
 * thin the answer is null (the card self-hides; empty > tenuous).
 */
import { Chess } from 'chess.js';
import { lookupMasterPlay } from './masterPlayLookup';
import { fetchLichessExplorer } from './lichessExplorerService';
import type { MasterPlayResult } from './masterPlayTypes';

export interface TheoryLookup {
  (fen: string): Promise<MasterPlayResult>;
}

export interface DepartureMainMove {
  san: string;
  uci: string | null;
  games: number;
  /** Share of games at the book position, 0..1. */
  pct: number;
}

export interface TheoryDeparture {
  /** 1-based ply of the move that LEFT book (index+1 into sans). */
  departurePly: number;
  /** The last position still in book (before the departing move). */
  bookFen: string;
  /** The move the game played there (which left known practice). */
  departedSan: string;
  /** Masters' most-played move at the book position. */
  mainMove: DepartureMainMove;
  /** Total master games at the book position. */
  totalGames: number;
  /** Top master moves (san + games), for the stats line. */
  topMoves: Array<{ san: string; games: number }>;
  /** The same position's top move at the student's level (amateur
   *  explorer, rating-banded). Null when unavailable — fail-open. */
  yourLevel: { san: string; games: number; pct: number } | null;
}

/** Book claims need real mass behind them. */
const MIN_BOOK_GAMES = 20;
/** Theory scanning stops here — nobody's "in book" at move 40. */
const MAX_SCAN_PLIES = 30;

const defaultLookup: TheoryLookup = (fen) =>
  lookupMasterPlay(fen, { triggeredBy: 'manual', surface: 'game-review' });

/** The amateur band around a student rating, as the explorer expects. */
export function ratingBandFor(rating: number | null | undefined): string {
  if (!rating || rating < 1200) return '1000,1200';
  if (rating < 1600) return '1400,1600';
  if (rating < 2000) return '1600,1800';
  return '2000,2200';
}

/**
 * Scan the game's positions for the first one absent from master
 * practice. Null when the game never left book inside the scan window,
 * when the book position lacks real mass, or when the data contradicts
 * itself (the "departing" move IS the main move — a transposition
 * artifact, not a teaching moment).
 */
export async function findTheoryDeparture(
  fens: string[],
  sans: string[],
  opts: {
    lookup?: TheoryLookup;
    studentRating?: number | null;
    /** Injectable amateur fetch for tests. */
    amateurFetch?: (fen: string, ratings: string) => Promise<{ moves: Array<{ san: string; white: number; draws: number; black: number }> } | null>;
  } = {},
): Promise<TheoryDeparture | null> {
  const lookup = opts.lookup ?? defaultLookup;
  if (fens.length < 2 || sans.length !== fens.length - 1) return null;

  const limit = Math.min(fens.length, MAX_SCAN_PLIES + 1);
  let prev: MasterPlayResult | null = null;
  for (let i = 0; i < limit; i++) {
    let result: MasterPlayResult;
    try {
      result = await lookup(fens[i]);
    } catch {
      return null; // lookup layer down — no honest claim possible
    }
    if (i > 0 && result.totalGames === 0) {
      // fens[i] is the first unknown position → sans[i-1] left book.
      if (!prev || prev.totalGames < MIN_BOOK_GAMES || prev.moves.length === 0) return null;
      const departedSan = sans[i - 1];
      const main = prev.moves[0];
      if (main.san === departedSan) return null; // data artifact — nothing to teach
      const mainMove: DepartureMainMove = {
        san: main.san,
        uci: main.uci ?? uciFor(fens[i - 1], main.san),
        games: main.games,
        pct: main.games / prev.totalGames,
      };
      let yourLevel: TheoryDeparture['yourLevel'] = null;
      try {
        const band = ratingBandFor(opts.studentRating);
        const amateur = opts.amateurFetch
          ? await opts.amateurFetch(fens[i - 1], band)
          : await fetchLichessExplorer(fens[i - 1], 'lichess', { ratings: band });
        const amMoves = (amateur?.moves ?? []).map((m) => ({
          san: m.san,
          games: m.white + m.draws + m.black,
        }));
        const amTotal = amMoves.reduce((acc, m) => acc + m.games, 0);
        if (amMoves.length > 0 && amTotal >= MIN_BOOK_GAMES) {
          const top = amMoves.reduce((a, b) => (b.games > a.games ? b : a));
          yourLevel = { san: top.san, games: top.games, pct: top.games / amTotal };
        }
      } catch {
        yourLevel = null; // your-level stats are a bonus, never a blocker
      }
      return {
        departurePly: i,
        bookFen: fens[i - 1],
        departedSan,
        mainMove,
        totalGames: prev.totalGames,
        topMoves: prev.moves.slice(0, 3).map((m) => ({ san: m.san, games: m.games })),
        yourLevel,
      };
    }
    prev = result;
  }
  return null; // never left book in the window — nothing to show
}

function uciFor(fen: string, san: string): string | null {
  try {
    const c = new Chess(fen);
    const mv = c.move(san);
    return `${mv.from}${mv.to}${mv.promotion ?? ''}`;
  } catch {
    return null;
  }
}

export interface BookLinePly {
  san: string;
  fenAfter: string;
  games: number;
}

/**
 * Greedy most-played walk from the book position — the book-line
 * playback stretch. Every step is the masters' top move at its node,
 * chess.js-replayed; stops when the data thins out or maxPlies is hit.
 */
export async function walkBookLine(
  bookFen: string,
  opts: { lookup?: TheoryLookup; maxPlies?: number; minGames?: number } = {},
): Promise<BookLinePly[]> {
  const lookup = opts.lookup ?? defaultLookup;
  const maxPlies = opts.maxPlies ?? 6;
  const minGames = opts.minGames ?? 10;
  const out: BookLinePly[] = [];
  let chess: Chess;
  try {
    chess = new Chess(bookFen);
  } catch {
    return out;
  }
  for (let i = 0; i < maxPlies; i++) {
    let result: MasterPlayResult;
    try {
      result = await lookup(chess.fen());
    } catch {
      break;
    }
    const top = result.moves[0];
    if (!top || top.games < minGames) break;
    try {
      chess.move(top.san);
    } catch {
      break; // DB/board disagreement — stop rather than guess (G3)
    }
    out.push({ san: top.san, fenAfter: chess.fen(), games: top.games });
  }
  return out;
}
