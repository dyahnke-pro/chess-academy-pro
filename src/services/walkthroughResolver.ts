/**
 * walkthroughResolver
 * -------------------
 * Turns a free-text subject (e.g. "Sicilian Najdorf", "London System")
 * into a ready-to-run WalkthroughSession. Powers the /coach/session/
 * walkthrough route so the coach can say "walk me through the Sicilian
 * Najdorf" and land the user on an annotated lesson.
 *
 * Resolution order:
 *   1. Full-text search openings — pick the best fuzzy match.
 *   2. If the subject contains a variation-name fragment, prefer that
 *      variation over the opening's main line.
 *   3. Load per-move annotations via annotationService so narration
 *      stays in sync with what the board is showing.
 *
 * Returns null when nothing matches so callers can surface a helpful
 * "try the Openings tab" message instead of a broken session.
 */
import { searchOpenings } from './openingService';
import { loadAnnotations, loadSubLineAnnotations } from './annotationService';
import { buildSession } from './walkthroughAdapter';
import { fuzzyScore } from '../utils/fuzzySearch';
import type { WalkthroughSession } from '../types/walkthrough';
import type { OpeningRecord, OpeningVariation } from '../types';

export interface ResolveWalkthroughOptions {
  subject: string;
  orientation?: 'white' | 'black';
}

export interface ResolvedWalkthroughMatch {
  opening: OpeningRecord;
  variation?: OpeningVariation;
  variationIndex?: number;
}

/**
 * Fuzzy-match an opening (and optionally a variation) from a free-text
 * subject. Split out from `resolveWalkthroughSession` so the chat-side
 * pre-validation layer can check "does this intent resolve?" without
 * paying for annotation loading.
 */
export async function matchOpeningForSubject(
  subject: string,
): Promise<ResolvedWalkthroughMatch | null> {
  const trimmed = subject.trim();
  if (!trimmed) return null;

  const matches = await searchOpenings(trimmed);
  if (matches.length === 0) return null;

  const opening = matches[0];

  // Try to find a variation whose name overlaps the subject. We only
  // accept it if the variation name contributes meaningful signal
  // beyond the opening name (e.g. "Najdorf" in "Sicilian Najdorf")
  // so we don't over-trigger on generic tokens like "main line".
  const variationMatch = matchVariationInSubject(trimmed, opening);

  return {
    opening,
    variation: variationMatch?.variation,
    variationIndex: variationMatch?.index,
  };
}

interface VariationMatch {
  variation: OpeningVariation;
  index: number;
}

/** Trailing generic words that rarely contribute matching signal. */
const GENERIC_SUFFIXES = /\b(variation|defense|defence|opening|system|gambit|attack|line)\b/gi;

function matchVariationInSubject(
  subject: string,
  opening: OpeningRecord,
): VariationMatch | null {
  const variations = opening.variations;
  if (!variations || variations.length === 0) return null;

  const subjectLower = subject.toLowerCase();

  // Compare each variation name against the subject. Accept either a
  // direct substring match (e.g. "najdorf variation" ⊂ subject) OR a
  // match on the name minus generic suffixes (e.g. "najdorf" ⊂ subject
  // even when the variation name is "Najdorf Variation").
  let best: { match: VariationMatch; score: number } | null = null;
  for (let i = 0; i < variations.length; i += 1) {
    const v = variations[i];
    const vNameLower = v.name.toLowerCase();
    if (!vNameLower) continue;

    // Direct substring → strong signal.
    if (subjectLower.includes(vNameLower) && vNameLower.length >= 4) {
      const score = -1000 - vNameLower.length;
      if (!best || score < best.score) {
        best = { match: { variation: v, index: i }, score };
      }
      continue;
    }

    // Strip generic suffixes and retry. "najdorf variation" → "najdorf".
    const core = vNameLower.replace(GENERIC_SUFFIXES, '').trim();
    if (core.length >= 4 && subjectLower.includes(core)) {
      const score = -500 - core.length;
      if (!best || score < best.score) {
        best = { match: { variation: v, index: i }, score };
      }
      continue;
    }

    // Fuzzy fallback against the full variation name.
    const s = fuzzyScore(subjectLower, v.name);
    if (s !== null && s < 10 && (!best || s < best.score)) {
      best = { match: { variation: v, index: i }, score: s };
    }
  }
  return best?.match ?? null;
}

/**
 * Build a WalkthroughSession from a subject string. Returns null when
 * no opening matches so the UI can show a graceful fallback.
 */
export async function resolveWalkthroughSession(
  options: ResolveWalkthroughOptions,
): Promise<WalkthroughSession | null> {
  const match = await matchOpeningForSubject(options.subject);
  if (!match) return null;

  const { opening, variation, variationIndex } = match;
  const orientation = options.orientation ?? opening.color;

  // Variation-level: use the variation's PGN and its sub-line annotations.
  if (variation && typeof variationIndex === 'number') {
    const subLineId = `variation-${variationIndex}`;
    const annotations = await loadSubLineAnnotations(opening.id, subLineId);

    return buildSession({
      title: `${opening.name}: ${variation.name}`,
      subtitle: 'Walkthrough',
      pgn: variation.pgn,
      startFen: undefined,
      annotations: annotations ?? [],
      orientation,
      kind: 'opening',
      source: `walkthroughResolver:${opening.id}:${subLineId}`,
    });
  }

  // Main-line: use the opening's PGN + main-line annotations.
  const annotations = await loadAnnotations(opening.id);

  return buildSession({
    title: opening.name,
    subtitle: 'Walkthrough',
    pgn: opening.pgn,
    startFen: undefined,
    annotations: annotations ?? [],
    orientation,
    kind: 'opening',
    source: `walkthroughResolver:${opening.id}:mainline`,
  });
}
