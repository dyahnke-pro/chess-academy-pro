/**
 * gameNarrationBuilder
 * --------------------
 * Convert a stored `GameRecord` into a `WalkthroughSession` that
 * replays the game move-by-move with narration.
 *
 * Narration per step comes from (in priority order):
 *   1. The `comment` string on a MoveAnnotation (coach-authored text).
 *   2. A short auto-generated line derived from the move's
 *      classification (blunder / mistake / inaccuracy / great / etc.).
 *   3. Empty string — the runner still advances; silence is better
 *      than reading "move 5 … move 6 …" monotonously.
 *
 * This is intentionally simple: we do not call the LLM during build.
 * That keeps the narrate page instant-start and works offline.
 */
import { buildSession } from './walkthroughAdapter';
import type { GameRecord, MoveAnnotation, MoveClassification, OpeningMoveAnnotation } from '../types';
import type { WalkthroughSession } from '../types/walkthrough';

/** Short template strings keyed off move classification. Kept brief so
 *  TTS doesn't run on forever on every step.
 *
 *  🔒 `Record<MoveClassification, string>`, NOT `Record<string, string>`
 *  (2026-09-21). The loose index type let three keys sit here that no
 *  annotation can ever carry — `best`, `excellent` and `forced` are not
 *  MoveClassifications — so they were narration the coach could never speak,
 *  and a test was asserting one of them ("The top engine choice."), passing on
 *  a value the product cannot produce. Keyed on the union, a new
 *  classification fails to compile until someone writes its line, and a dead
 *  one cannot be added back. Playing the engine's best move classifies as
 *  `good` (G4.5.2), which is what `best` was reaching for. */
const CLASSIFICATION_LINES: Record<MoveClassification, string> = {
  brilliant: 'Brilliant — the best move in a sharp position.',
  great: 'Great move.',
  good: 'A solid move.',
  book: 'Still in theory.',
  inaccuracy: 'Slightly inaccurate — there was a stronger continuation.',
  mistake: 'A mistake — this loses tempo or material.',
  blunder: 'A blunder — this drops significant advantage.',
  miss: 'A missed opportunity.',
};

const isClassification = (v: string): v is MoveClassification =>
  Object.prototype.hasOwnProperty.call(CLASSIFICATION_LINES, v);

function narrationFromAnnotation(annotation: MoveAnnotation | undefined): string {
  if (!annotation) return '';
  const comment = annotation.comment?.trim();
  if (comment) return comment;
  // The lowercase is defensive — an annotation persisted by an older build
  // could carry a capitalised label — so narrow back onto the union with a real
  // type guard rather than a cast. An unrecognised label then falls through to
  // silence instead of being typed as a string that is undefined at runtime.
  const cls = annotation.classification?.toLowerCase();
  if (cls && isClassification(cls)) return CLASSIFICATION_LINES[cls];
  return '';
}

/**
 * Build a WalkthroughSession that narrates the given game. When the
 * game has per-move annotations (from `analyzeSingleGame`), each step
 * gets the annotation's comment or a classification-templated line.
 * Otherwise the session runs silently between moves.
 */
export function buildNarrationSession(
  game: GameRecord,
  viewerSide?: 'white' | 'black',
): WalkthroughSession {
  const annotations = game.annotations ?? [];
  // walkthroughAdapter consumes `OpeningMoveAnnotation[]`, not our
  // richer `MoveAnnotation[]`. Project our annotations into the
  // narrower shape so the adapter's narration picker (with its
  // generic-filler guard) does the right thing.
  const adapterAnnotations: OpeningMoveAnnotation[] = annotations.map((a) => ({
    san: a.san,
    annotation: narrationFromAnnotation(a),
  }));

  const resultWord =
    game.result === '1-0'
      ? 'White won'
      : game.result === '0-1'
        ? 'Black won'
        : game.result === '1/2-1/2'
          ? 'drawn'
          : 'ongoing';
  const subtitle = `${game.white} vs ${game.black}${game.date ? ` · ${game.date}` : ''} · ${resultWord}`;

  return buildSession({
    pgn: game.pgn,
    annotations: adapterAnnotations,
    title: `Narration: ${game.white} vs ${game.black}`,
    subtitle,
    orientation: viewerSide ?? 'white',
    kind: 'opening',
    source: `narrate:${game.id}`,
  });
}
