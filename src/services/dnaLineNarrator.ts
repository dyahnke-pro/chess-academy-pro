/**
 * dnaLineNarrator — what is left of the per-ply line renderer: the TYPE a
 * line ply is handed around as, and `landedTacticTeaching` (one move that lands
 * a tactic, named with its computed invariant — the opening walkthrough and the
 * teaching selector read it).
 *
 * 🔴 The line renderer itself (`narrateDnaLine` / `dnaLineClauses` /
 * `dnaMoveClause`, and `firstTacticInvariant`) is DELETED (2026-10-04). It ran
 * every ply of a projected line — the opponent's replies and the moves after
 * the line had already won — through one move describer, so it credited
 * replies with motifs ("then Rxd8, they take the queen, landing a removal of
 * the defender") and kept saying "the knight trains on the pawn on a2 —
 * pressure they have to answer" after the queen was won. Its last live caller
 * was gone; a line played out for the student is now read as a line by
 * `projectedLineVoice` (review) and `puzzleConceptExplanation` (puzzles).
 *
 * G0: computed from chess.js + `computePlyFacts` + `tacticInvariant`.
 */
import { Chess } from 'chess.js';
import { computePlyFacts, tacticWord, type PrevCaptureContext } from './pvPlayback';
import { tacticInvariant } from './conceptEngine';

/** A move + the position it is played FROM. */
export interface DnaLinePly {
  fenBefore: string;
  san: string;
}

const NO_PREV: PrevCaptureContext = { square: null, capturedValue: 0 };

/**
 * The computed CONCEPT behind a single move that lands a tactic — the tactic
 * named plus its invariant, as one sentence for a surface that narrates ply
 * by ply from raw FEN + SAN (the opening walkthrough's PASS 1). Null when the
 * move lands nothing. Computed: computePlyFacts →
 * tacticInvariant; nothing here is decided by the model.
 */
export function landedTacticTeaching(fenBefore: string, san: string): { type: string; text: string } | null {
  let mv: ReturnType<Chess['move']> | null = null;
  let fenAfter = '';
  try {
    const c = new Chess(fenBefore);
    mv = c.move(san);
    fenAfter = c.fen();
  } catch {
    return null;
  }
  if (!mv) return null;
  const facts = computePlyFacts(
    fenBefore,
    fenAfter,
    { captured: mv.captured, san: mv.san, color: mv.color, promotion: mv.promotion },
    NO_PREV,
  );
  if (facts.isMate || !facts.tacticLanded) return null;
  const inv = tacticInvariant(facts.tacticLanded);
  if (!inv) return null;
  return { type: facts.tacticLanded, text: `This lands a ${tacticWord(facts.tacticLanded)}: ${inv.full}` };
}
