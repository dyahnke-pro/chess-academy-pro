// Pure helpers for picking the right narration text (and auxiliary fields)
// for a walkthrough step.
//
// The data model supports embedded narration fields on OpeningMoveAnnotation:
//   - `narration`        — the canonical voice script for this move
//   - `shortNarration`   — a trimmed version for higher speed tiers
//   - `coachHint`        — a short coaching tip for drill mode / hint button
//
// Old annotations (no narration field) keep working: we derive a spoken
// script from `annotation` using the same sentence-trim rule that
// WalkthroughMode used before this refactor.
//
// Callers should ALWAYS go through these helpers rather than reading
// annotation fields directly, so the fallback chain stays centralized.

import type { OpeningMoveAnnotation } from '../types';

/**
 * Patterns used by the offline annotation generator when it couldn't
 * produce real commentary. These are baked into thousands of move
 * entries across the opening annotation JSON files (albin, alekhine,
 * catalan, etc.) and produce noise like:
 *   "Bg2 by White. The position is heading toward the critical moment."
 *   "d6 by Black. The position is becoming uncomfortable — careful defense is needed."
 * Treat matches as "no annotation" so both the AnnotationCard and the
 * voice service stay silent rather than reading filler.
 */
const GENERIC_ANNOTATION_PATTERNS: RegExp[] = [
  /\bposition is heading toward the critical moment\b/i,
  /\bposition is becoming uncomfortable\b/i,
  /\bcareful defense is needed\b/i,
  /\bposition is roughly (equal|balanced)\b/i,
  /\bboth sides have chances\b/i,
  /^\s*[A-Za-z][\w+#=!?\-]*\s+by\s+(?:White|Black)\.\s*$/i,
];

/**
 * Returns true when the supplied annotation text is a generic template
 * filler from the offline annotation generator rather than real
 * curated commentary. Used to suppress meaningless narration instead
 * of speaking "this is the critical moment" on every single move.
 */
export function isGenericAnnotationText(text: string | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Short fragments like "by White." are inherently generic.
  if (trimmed.length < 24) return true;
  return GENERIC_ANNOTATION_PATTERNS.some((re) => re.test(trimmed));
}

/** Same check against an annotation object — convenience wrapper. */
export function hasMeaningfulAnnotation(
  step: OpeningMoveAnnotation | null,
): boolean {
  if (!step) return false;
  const text = step.narration ?? step.annotation ?? '';
  return text.length > 0 && !isGenericAnnotationText(text);
}

export type NarrationLength = 'full' | 'short' | 'silent';

/**
 * Trim text to a max number of sentences. Mirrors the previous
 * WalkthroughMode helper. Exported for reuse in derived-short-form
 * generators and tests.
 */
export function trimToSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join('').trim();
}

/**
 * Approximate word count — used to decide whether a first sentence is
 * already short enough for drill mode or whether we need to trim
 * further.
 */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Returns the text the voice service should speak for this step.
 *
 * - `silent` → empty string (caller should skip narration entirely)
 * - `short`  → `shortNarration` if present, else a derived short form from
 *              `narration`/`annotation` (first sentence; further trimmed if
 *              that single sentence is very long).
 * - `full`   → `narration` if present, else `annotation` (full text).
 *
 * Guarantees a non-empty return for any annotation that has either
 * `narration` or `annotation` text.
 */
export function pickNarrationText(
  step: OpeningMoveAnnotation | null,
  length: NarrationLength,
): string {
  if (!step || length === 'silent') return '';

  const fullText = step.narration ?? step.annotation ?? '';
  if (!fullText) return '';

  // Drop generic template filler rather than reading it aloud. The
  // annotation JSON files contain thousands of auto-generated stub
  // lines that the voice service would otherwise monotonously
  // repeat across every opening.
  if (isGenericAnnotationText(fullText)) return '';

  if (length === 'full') return fullText;

  // length === 'short'
  if (step.shortNarration) return step.shortNarration;
  const oneSentence = trimToSentences(fullText, 1);
  // If the first sentence is still a mouthful (> 28 words), cut at the
  // first comma or em-dash so drill mode feels quick.
  if (wordCount(oneSentence) > 28) {
    const earlyBreak = oneSentence.match(/^[^,—–;:]*[,—–;:]/);
    if (earlyBreak) {
      return earlyBreak[0].replace(/[,—–;:]\s*$/, '.').trim();
    }
  }
  return oneSentence;
}

/**
 * Returns a short coach hint for drill mode / the hint button.
 *
 * Priority:
 *   1. Explicit `coachHint` field on the annotation.
 *   2. First item from `plans[]`.
 *   3. `null` when neither is available (caller should hide the hint UI
 *      rather than paint generic text).
 */
export function pickCoachHint(step: OpeningMoveAnnotation | null): string | null {
  if (!step) return null;
  if (step.coachHint && step.coachHint.trim().length > 0) {
    return step.coachHint.trim();
  }
  const firstPlan = step.plans?.[0];
  if (firstPlan && firstPlan.trim().length > 0) return firstPlan.trim();
  return null;
}

/**
 * Picks the evaluation (centipawns) for a step when present. Returns
 * null when the annotation doesn't carry one — callers that want an
 * eval for UI (e.g. eval chip) should query Stockfish as a fallback.
 */
export function pickEvaluation(step: OpeningMoveAnnotation | null): number | null {
  if (!step) return null;
  return typeof step.evaluation === 'number' ? step.evaluation : null;
}
