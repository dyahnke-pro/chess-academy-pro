// Pure helpers for picking the right narration text for a walkthrough step.
//
// The data model now supports embedded narration fields on OpeningMoveAnnotation:
//   - `narration`        — the canonical voice script for this move
//   - `shortNarration`   — a trimmed version for higher speed tiers
//
// Old annotations (no narration field) keep working: we derive a spoken script
// from `annotation` using the same sentence-trim rule that WalkthroughMode used
// before this refactor.

import type { OpeningMoveAnnotation } from '../types';

export type NarrationLength = 'full' | 'short' | 'silent';

/** Trim text to a max number of sentences. Mirrors the previous WalkthroughMode helper. */
export function trimToSentences(text: string, maxSentences: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= maxSentences) return text;
  return sentences.slice(0, maxSentences).join('').trim();
}

/**
 * Returns the text the voice service should speak for this step.
 *
 * - `silent` → empty string (caller should skip narration entirely)
 * - `short`  → uses `shortNarration` if present, else trims `narration`/`annotation` to 1 sentence
 * - `full`   → uses `narration` if present, else `annotation` (full text)
 */
export function pickNarrationText(
  step: OpeningMoveAnnotation | null,
  length: NarrationLength,
): string {
  if (!step || length === 'silent') return '';

  const fullText = step.narration ?? step.annotation;
  if (length === 'full') return fullText;

  // length === 'short'
  if (step.shortNarration) return step.shortNarration;
  return trimToSentences(fullText, 1);
}
