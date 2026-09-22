/**
 * walkthroughLlmNarrator
 * ----------------------
 * Per-move narration for the legacy opening walkthrough (WalkthroughMode /
 * walkthroughResolver — the ~3,000 DB-only openings with no curated lesson).
 * Fills in a real teaching line wherever the curated annotation JSON either
 * has no entry for a move or has one of the auto-generated filler templates
 * (suppressed via isGenericAnnotationText).
 *
 * G0 — INVERTED (WO-STANDARD-01 F3, 2026-09-22). The file keeps its name so
 * its four call sites read as they always did, but the "Llm" in it is now
 * history: this used to batch the whole move list into ONE chat call
 * ("For EVERY move tagged [NARRATE], produce ONE narration sentence… Cite
 * concrete squares…"), parse a JSON array back, board-grade each model
 * sentence against its ply and cache the survivors in Dexie. Every one of
 * those steps existed because the model was AUTHORING the chess. It now
 * COMPUTES each fill from the board with `buildReviewMoveBriefing` in the
 * present-tense `teach` register — the same computer the generator's own
 * DB-only fallback speaks (openingGenerator.buildFallbackTreeFromDb) — so
 * there is no model output to parse, grade or cache, and the fill is
 * identical with the provider dead.
 *
 * The curator's real annotations always win: a move with a non-filler
 * curated entry is kept verbatim and never recomputed.
 */
import { Chess } from 'chess.js';
import { isGenericAnnotationText } from './walkthroughNarration';
import { buildReviewMoveBriefing } from './reviewMoveBriefing';

export interface WalkthroughNarrationInput {
  openingName: string;
  /** Variation name, if this walkthrough is for a specific sub-line. */
  variationName?: string;
  /** Space-separated SAN moves, e.g. "d4 Nf6 c4 e6 g3 d5". */
  pgn: string;
  /** Starting FEN. Defaults to the standard starting position. */
  startFen?: string;
  /**
   * Existing per-move narrations (curated). The narrator skips moves
   * whose existing entry is real content and only computes for moves
   * whose entry is empty or generic filler.
   */
  existingNarrations?: (string | undefined)[];
  /**
   * THE SEAT the line is taught from (the opening's `color`). With it the
   * computed fill is seat-stamped — "You play Nf3, …" / "They play …e5, …"
   * (CLAUDE.md ONE PERSPECTIVE); without it the fill is seat-free ("Nf3: …"),
   * which is the honest register for a caller that does not know whose line
   * this is (walkthroughResolver's fill).
   */
  studentSide?: 'white' | 'black';
}

export interface WalkthroughNarrationResult {
  /** One narration per move, indexed by ply (0-based). Empty string when
   *  the move genuinely did nothing nameable (kept silent). */
  narrations: string[];
  /** Always false now — the fill is a synchronous board computation, so
   *  there is nothing to cache. Kept so the four call sites' result shape
   *  is unchanged. */
  fromCache: boolean;
}

const STANDARD_START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Compute teaching-quality per-move narration for an opening walkthrough.
 * Synchronous now (F3: no model call) — wrapped in a resolved promise so the
 * four call sites keep their `await`/`.catch` shape.
 */
export function generateWalkthroughNarrations(
  input: WalkthroughNarrationInput,
): Promise<WalkthroughNarrationResult> {
  return Promise.resolve(computeWalkthroughNarrations(input));
}

function computeWalkthroughNarrations(input: WalkthroughNarrationInput): WalkthroughNarrationResult {
  const startFen = input.startFen ?? STANDARD_START_FEN;
  const moves = input.pgn.trim().split(/\s+/).filter(Boolean);
  if (moves.length === 0) {
    return { narrations: [], fromCache: false };
  }

  // Build per-move context (SAN + FEN before/after the move). Invalid moves
  // truncate the walkthrough.
  const perMove = buildPerMoveContext(startFen, moves);
  if (perMove.length === 0) {
    return { narrations: [], fromCache: false };
  }

  const existing = input.existingNarrations ?? [];
  const narrations = perMove.map((ctx, i) => {
    const curated = (existing[i] ?? '').trim();
    if (curated && !isGenericAnnotationText(curated)) return curated;
    return computeFill(ctx, input.studentSide);
  });
  return { narrations, fromCache: false };
}

interface PerMoveContext {
  index: number;
  fenBefore: string;
  san: string;
  mover: 'white' | 'black';
}

function buildPerMoveContext(startFen: string, sanMoves: string[]): PerMoveContext[] {
  let chess: Chess;
  try {
    chess = new Chess(startFen);
  } catch {
    return [];
  }
  const out: PerMoveContext[] = [];
  for (let i = 0; i < sanMoves.length; i++) {
    const fenBefore = chess.fen();
    const mover: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';
    let moved;
    try {
      moved = chess.move(sanMoves[i]);
    } catch {
      break;
    }
    out.push({ index: i, fenBefore, san: moved.san, mover });
  }
  return out;
}

/** The computed fill for one ply — board-true by construction (chess.js
 *  replay), seat-stamped when the seat is known. '' when the move did
 *  nothing nameable: silence is allowed, filler is not. */
export function computeFill(ctx: PerMoveContext, studentSide?: 'white' | 'black'): string {
  try {
    return buildReviewMoveBriefing({
      fenBefore: ctx.fenBefore,
      san: ctx.san,
      moverIsStudent: studentSide ? ctx.mover === studentSide : undefined,
      register: 'teach',
    }) ?? '';
  } catch {
    return '';
  }
}
