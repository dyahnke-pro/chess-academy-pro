import { Chess } from 'chess.js';
import type {
  JourneyChapter,
  JourneyChapterId,
  JourneyPuzzle,
  UserProfile,
  PuzzleRecord,
  ChessPiece,
} from '../types';
import { getKidPiecePuzzles, seedPuzzles } from './puzzleService';
import { getKidRating } from './kidRatingService';

// Per CLAUDE.md non-negotiable #17 ("The DB is the source of truth in
// kid mode. The LLM only writes prose."), this service now PICKS
// puzzles from the curated DB (puzzles.json + training-puzzles.json)
// instead of asking the LLM to invent FENs and solutions. The earlier
// LLM-invents path is gone — no callers can get an AI-fabricated
// position back, even when the safety wrapper is in place.
//
// Chapter id → ChessPiece:
//   pawn / rook / bishop / knight / queen / king map 1:1
//   tactics / first-game fall back to the chapter's hand-authored
//   puzzles (these aren't piece-specific so the DB picker doesn't
//   apply).
//
// Hint + success message are static templates per piece — kid-safe by
// construction (no LLM round-trip means no slang / personality leak).
// A future PR can optionally LLM-annotate (hint TEXT ONLY, never
// FEN/solution) through getKidLlmResponse if richer prose is wanted.

const CHESS_PIECE_CHAPTERS: ReadonlySet<JourneyChapterId> = new Set<JourneyChapterId>([
  'pawn', 'rook', 'bishop', 'knight', 'queen', 'king',
]);

const PIECE_HINT: Record<ChessPiece, string> = {
  king:   'Find the safest move for the king.',
  queen:  'Look for a queen move that wins material.',
  rook:   'Slide your rook to attack or capture.',
  bishop: 'Find the bishop move that takes a piece.',
  knight: 'Hop the knight to attack or capture.',
  pawn:   'Find the pawn move that wins.',
};

const PIECE_SUCCESS: Record<ChessPiece, string> = {
  king:   'The king is safe!',
  queen:  'Queen captures clean!',
  rook:   'Rook takes the prize!',
  bishop: 'Bishop slides through!',
  knight: 'Knight hops to the win!',
  pawn:   'Pawn pushes through!',
};

const PUZZLE_COUNT_PER_CHAPTER = 4;

/**
 * Validates that a FEN represents a legal position and the solution
 * move is legal. Kept exported for test parity with the prior service.
 */
export function validatePuzzleFen(fen: string, solution: string): boolean {
  try {
    const chess = new Chess(fen);
    const m = chess.move(solution);
    return m !== null;
  } catch {
    return false;
  }
}

function applyUci(
  chess: Chess,
  uci: string,
): ReturnType<Chess['move']> | null {
  if (!uci || uci.length < 4) return null;
  try {
    return chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci[4] : undefined,
    });
  } catch {
    return null;
  }
}

/**
 * Resolve the KID-facing position + the one move the kid must find.
 *
 * Lichess convention (this repo's puzzles.json): `record.fen` is the
 * position BEFORE the opponent's blunder, `moves[0]` is the opponent's
 * setup move (auto-played to reach the tactic), and `moves[1]` is the
 * SOLVER's move — the tactic. So the kid must be SHOWN the position
 * after the opponent's setup move (kid-to-move) and solve with the SAN
 * of `moves[1]`. Single-move puzzles (training pool) are solver-to-move
 * already — the kid solves `moves[0]` from the given FEN.
 *
 * (Before 2026-06-10 this kept `record.fen` and used `moves[0]`, which
 * showed the OPPONENT-to-move position and treated the opponent's setup
 * move as the kid's "solution" — the kid was playing the wrong side.)
 */
function resolveKidPosition(
  record: PuzzleRecord,
): { fen: string; san: string } | null {
  const moves = record.moves.trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) return null;
  const hasOpponentSetup = moves.length >= 2;
  const chess = new Chess(record.fen);
  if (hasOpponentSetup && !applyUci(chess, moves[0])) return null;
  const startFen = chess.fen();
  const solverMove = applyUci(chess, hasOpponentSetup ? moves[1] : moves[0]);
  if (!solverMove) return null;
  return { fen: startFen, san: solverMove.san };
}

function puzzleRecordToJourneyPuzzle(
  record: PuzzleRecord,
  piece: ChessPiece,
): JourneyPuzzle | null {
  const resolved = resolveKidPosition(record);
  if (!resolved) return null;
  return {
    id: `db-${record.id}`,
    fen: resolved.fen,
    solution: [resolved.san],
    hint: PIECE_HINT[piece],
    successMessage: PIECE_SUCCESS[piece],
  };
}

/**
 * Pick puzzles for a chapter. Returns DB-sourced puzzles for the 6
 * piece chapters; falls back to the chapter's hand-authored puzzles
 * for `tactics` and `first-game` (non-piece chapters) and as a safety
 * net when the DB filter returns too few entries.
 *
 * The kid rating drives the puzzle band — fresh profile starts at 100
 * (sub-Lichess floor → training-pool puzzles). As the kid solves
 * puzzles the rating climbs and the band shifts upward into the
 * Lichess pool.
 */
export async function generateKidPuzzles(
  chapter: JourneyChapter,
  _profile: UserProfile, // kept for signature compat; future PR will use it for stricter band overrides
): Promise<JourneyPuzzle[]> {
  if (!CHESS_PIECE_CHAPTERS.has(chapter.id)) {
    // Non-piece chapters (tactics, first-game) use their hand-authored
    // puzzle bank unchanged. Those puzzles are statically validated by
    // scripts/audit-kid-puzzles-static.mjs at build time.
    return chapter.puzzles;
  }

  const piece = chapter.id as ChessPiece;
  try {
    await seedPuzzles();
    const kidRating = await getKidRating(piece);
    const dbPuzzles = await getKidPiecePuzzles(piece, kidRating, PUZZLE_COUNT_PER_CHAPTER * 3);
    const converted: JourneyPuzzle[] = [];
    for (const p of dbPuzzles) {
      if (converted.length >= PUZZLE_COUNT_PER_CHAPTER) break;
      const jp = puzzleRecordToJourneyPuzzle(p, piece);
      if (jp) converted.push(jp);
    }
    // Need at least 2 DB-sourced puzzles to consider the pull successful.
    // Otherwise fall back to the hand-authored chapter puzzles (also
    // DB-anchored — they live in journeyChapters.ts / fairyTaleChapters.ts).
    if (converted.length < 2) return chapter.puzzles;
    return converted;
  } catch {
    return chapter.puzzles;
  }
}
