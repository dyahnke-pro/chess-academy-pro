/**
 * WalkthroughStep — canonical shape for a single step in any lesson-style
 * session (opening walkthrough, middlegame plan, coach-run training line).
 *
 * Narration is EMBEDDED with the move so mismatches between "what the
 * board shows" and "what the coach says" become impossible. Anything
 * rendering a lesson should only need this one type — no separate
 * annotation index to maintain.
 *
 * See `walkthroughAdapter.ts` for conversion from legacy
 * OpeningMoveAnnotation-indexed data.
 */
import type { AnnotationArrow, AnnotationHighlight } from './index';

export interface WalkthroughStep {
  /** Full move number (1-indexed, same side-of-move for both halves). */
  moveNumber: number;
  /** Standard Algebraic Notation, e.g. "e4", "Nf6", "O-O". */
  san: string;
  /** FEN after this move has been played. */
  fenAfter: string;
  /** Primary narration — the short, "learn by voice" form. */
  narration: string;
  /** Optional long-form narration for users who want more detail. */
  narrationLong?: string;
  /** One-line pawn-structure summary (e.g. "Open e-file, c3-d4 center"). */
  pawnStructure?: string;
  /** Short coaching hint aimed at the student's own turn. */
  coachHint?: string;
  /** Stockfish eval in centipawns at this position (positive = white). */
  evaluation?: number;
  /** Arrows to draw after the move. */
  arrows?: AnnotationArrow[];
  /** Square highlights to show after the move. */
  highlights?: AnnotationHighlight[];
  /** Optional source tag for debugging (e.g. "gambits.json:kings-gambit:mainline"). */
  source?: string;
}

/**
 * WalkthroughSession — a full lesson: an ordered list of steps plus
 * some context so the runner knows how to set up the board.
 */
export interface WalkthroughSession {
  /** Human-readable title shown in the lesson header. */
  title: string;
  /** Short subtitle, e.g. "Middlegame plans" or "Main line". */
  subtitle?: string;
  /** Starting FEN. If omitted, defaults to the standard start position. */
  startFen?: string;
  /** Orientation from the student's side. */
  orientation: 'white' | 'black';
  /** The ordered steps to walk through. */
  steps: WalkthroughStep[];
  /** Optional tag to identify the session kind for analytics + routing. */
  kind?: 'opening' | 'middlegame' | 'puzzle' | 'play-against' | 'custom';
}
