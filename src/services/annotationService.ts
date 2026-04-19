import { ANNOTATION_MODULES } from '../data/annotations';
import { Chess } from 'chess.js';
import { getBestNarration, shouldUseClaudeFallback, pickNarration } from './openingNarrationService';
import type { OpeningMoveAnnotation, OpeningAnnotations } from '../types';

// Map pro repertoires to a specific sub-line instead of the main line.
// Keyed by full opening ID first, then by suffix as fallback.
const PRO_ID_TO_SUBLINE: Record<string, string> = {
  'pro-naroditsky-scotch': 'variation-0',
  'pro-hikaru-scotch': 'variation-5',
  'pro-dubov-scotch': 'variation-3',
  'pro-naroditsky-vienna': 'variation-5',
  'pro-firouzja-vienna': 'variation-6',
  'pro-gothamchess-london': 'variation-5',
  'pro-hikaru-london': 'variation-9',
  'pro-annacramling-london': 'variation-7',
  'pro-carlsen-qgd': 'variation-7',
  'pro-caruana-qgd': 'variation-8',
  'pro-carlsen-london-d4': 'variation-8',
  'pro-hikaru-najdorf': 'variation-6',
  'pro-firouzja-najdorf': 'variation-7',
  'pro-hikaru-nimzo': 'variation-5',
  'pro-caruana-nimzo': 'variation-6',
  'pro-caruana-italian': 'variation-6',
  'pro-firouzja-italian': 'variation-7',
  'pro-naroditsky-fantasy-caro': 'variation-4',
  'pro-gothamchess-fantasy-caro': 'variation-5',
  'pro-hikaru-kid': 'variation-5',
  'pro-dubov-sveshnikov': 'variation-6',
  'pro-carlsen-catalan': 'variation-5',
  'pro-caruana-catalan': 'variation-6',
  'pro-firouzja-grunfeld': 'variation-5',
  'pro-carlsen-berlin': 'variation-6',
  'pro-caruana-berlin': 'variation-6',
  'pro-caruana-ruy-lopez': 'variation-7',
  'pro-dubov-anti-marshall': 'variation-8',
  'pro-firouzja-ruy-lopez': 'variation-9',
  'pro-praggnanandhaa-ruy-lopez': 'variation-10',
  'pro-niemann-anti-marshall': 'variation-11',
};

const PRO_SUFFIX_TO_SUBLINE: Record<string, string> = {
  'anti-berlin': 'variation-5',
  'anti-sicilian': 'variation-5',
  'benoni': 'variation-5',
  'berlin': 'variation-2',
  'dutch': 'variation-5',
  'english': 'variation-0',
  'french': 'variation-5',
  'kia': 'variation-0',
  'milner-barry': 'variation-6',
  'najdorf': 'variation-5',
  'ponziani': 'variation-5',
  'qgd': 'variation-5',
  'rossolimo': 'variation-5',
  'scandinavian': 'variation-5',
  'semi-slav': 'variation-5',
  'stafford-refute': 'variation-5',
  'tarrasch-defense': 'variation-6',
  'tarrasch-french': 'variation-3',
};

// Map pro-repertoire suffixes to base annotation IDs
const PRO_SUFFIX_TO_BASE: Record<string, string> = {
  'alapin': 'sicilian-alapin',
  'anti-berlin': 'ruy-lopez',
  'anti-marshall': 'ruy-lopez',
  'anti-sicilian': 'sicilian-alapin',
  'benko': 'benko-gambit',
  'benoni': 'benoni-defence',
  'berlin': 'ruy-lopez',
  'caro-kann': 'caro-kann',
  'catalan': 'catalan-opening',
  'dutch': 'dutch-defence',
  'english': 'english-opening',
  'englund': 'englund-gambit',
  'fantasy-caro': 'caro-kann',
  'french': 'french-defence',
  'jobava-london': 'london-system',
  'grunfeld': 'grunfeld-defence',
  'italian': 'italian-game',
  'kia': 'kings-indian-attack',
  'kid': 'kings-indian-defence',
  'kings-gambit': 'kings-gambit',
  'london': 'london-system',
  'london-d4': 'london-system',
  'milner-barry': 'french-defence',
  'najdorf': 'sicilian-najdorf',
  'nimzo': 'nimzo-indian',
  'petroff': 'petrov-defence',
  'ponziani': 'italian-game',
  'qgd': 'qgd',
  'rossolimo': 'sicilian-sveshnikov',
  'ruy-lopez': 'ruy-lopez',
  'scandinavian': 'scandinavian-defence',
  'scotch': 'scotch-game',
  'semi-slav': 'semi-slav',
  'sicilian': 'sicilian-najdorf',
  'sicilian-najdorf': 'sicilian-najdorf',
  'stafford': 'stafford-gambit',
  'stafford-refute': 'stafford-gambit',
  'sveshnikov': 'sicilian-sveshnikov',
  'tarrasch-defense': 'qgd',
  'tarrasch-french': 'french-defence',
  'vienna': 'vienna-game',
};

function resolveAnnotationId(openingId: string): string {
  if (Object.hasOwn(ANNOTATION_MODULES, openingId)) return openingId;

  // Strip pro-<player>- prefix and try mapping
  const match = /^pro-[a-z]+-(.+)$/.exec(openingId);
  if (match) {
    const suffix = match[1];
    const baseId = PRO_SUFFIX_TO_BASE[suffix];
    if (baseId && Object.hasOwn(ANNOTATION_MODULES, baseId)) return baseId;
  }

  // dataLoader builds opening IDs as slugify(`${eco}-${name}`) — e.g.
  // "c50-italian-game". Annotation files are keyed by the name-only
  // slug — "italian-game". Strip a leading ECO prefix (letter + 2
  // digits + dash) and retry. Without this, the 3641 Lichess-ECO
  // openings couldn't reach the 1916 annotation files (the audit's
  // #1 unreachable-content finding — generated but never rendered).
  const ecoStripped = /^[a-e]\d{2}-(.+)$/.exec(openingId);
  if (ecoStripped) {
    const bare = ecoStripped[1];
    if (Object.hasOwn(ANNOTATION_MODULES, bare)) return bare;
    // Try American → British spelling as a second fallback (the
    // annotation files use British "-defence" but Lichess uses
    // American "-defense").
    const britishised = bare.replace(/-defense$/, '-defence');
    if (britishised !== bare && Object.hasOwn(ANNOTATION_MODULES, britishised)) {
      return britishised;
    }
  }

  return openingId;
}

const cache = new Map<string, OpeningAnnotations>();

async function loadModule(openingId: string): Promise<OpeningAnnotations | null> {
  const resolvedId = resolveAnnotationId(openingId);
  const cached = cache.get(resolvedId);
  if (cached) return cached;

  const loader = ANNOTATION_MODULES[resolvedId] as (() => Promise<{ default: OpeningAnnotations }>) | undefined;
  if (!loader) return null;

  const mod = await loader();
  const data = mod.default;
  cache.set(resolvedId, data);
  return data;
}

export async function loadAnnotations(openingId: string): Promise<OpeningMoveAnnotation[] | null> {
  // Check if this pro repertoire should use a sub-line instead of the main line
  const fullIdSubLine = PRO_ID_TO_SUBLINE[openingId];
  if (fullIdSubLine) {
    return loadSubLineAnnotations(openingId, fullIdSubLine);
  }
  const proMatch = /^pro-[a-z]+-(.+)$/.exec(openingId);
  if (proMatch) {
    const subLineKey = PRO_SUFFIX_TO_SUBLINE[proMatch[1]];
    if (subLineKey) {
      return loadSubLineAnnotations(openingId, subLineKey);
    }
  }

  const data = await loadModule(openingId);
  return data?.moveAnnotations ?? null;
}

/**
 * Parse a PGN string into an array of SAN moves using chess.js for validation.
 * Returns only valid moves (stops at the first invalid token).
 */
function parsePgnToSans(pgn: string): string[] {
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  const sans: string[] = [];
  for (const token of tokens) {
    try {
      const move = chess.move(token);
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return sans;
}

/**
 * Count how many leading moves match between a PGN and an annotation set.
 */
function countMatchingMoves(pgn: string, annotations: OpeningMoveAnnotation[]): number {
  const sans = parsePgnToSans(pgn);
  let matches = 0;
  for (let i = 0; i < Math.min(sans.length, annotations.length); i++) {
    if (sans[i] === annotations[i].san) {
      matches++;
    } else {
      break;
    }
  }
  return matches;
}

/**
 * Load annotations for an opening, using the PGN to find the best-matching
 * annotation set. When the main line annotations diverge from the opening's
 * PGN, this searches subLines for a better match.
 */
export async function loadAnnotationsForPgn(
  openingId: string,
  pgn: string,
): Promise<OpeningMoveAnnotation[] | null> {
  const data = await loadModule(openingId);
  if (!data) return null;

  const mainLineMatch = countMatchingMoves(pgn, data.moveAnnotations);
  const pgnMoveCount = parsePgnToSans(pgn).length;

  // If main line matches all (or nearly all) PGN moves, use it
  if (mainLineMatch >= pgnMoveCount || mainLineMatch >= data.moveAnnotations.length) {
    return data.moveAnnotations;
  }

  // Search subLines for a better match
  if (data.subLines && data.subLines.length > 0) {
    let bestAnnotations = data.moveAnnotations;
    let bestMatch = mainLineMatch;

    for (const subLine of data.subLines) {
      const subMatch = countMatchingMoves(pgn, subLine.moveAnnotations);
      if (subMatch > bestMatch) {
        bestMatch = subMatch;
        bestAnnotations = subLine.moveAnnotations;
      }
    }

    return bestAnnotations;
  }

  return data.moveAnnotations;
}

export async function loadSubLineAnnotations(
  openingId: string,
  subLineKey: string,
): Promise<OpeningMoveAnnotation[] | null> {
  const data = await loadModule(openingId);
  if (!data?.subLines || data.subLines.length === 0) return null;

  // subLineKey format: 'variation-N', 'trap-N', 'warning-N'
  const match = /^(variation|trap|warning)-(\d+)$/.exec(subLineKey);
  if (!match) return null;

  const type = match[1] as 'variation' | 'trap' | 'warning';
  const localIdx = parseInt(match[2], 10);

  // If subLines have type fields, do type-aware lookup
  const hasTypes = data.subLines.some((sl) => sl.type != null);
  if (hasTypes) {
    const matching = data.subLines.filter((sl) => sl.type === type);
    return matching[localIdx]?.moveAnnotations ?? null;
  }

  // Legacy fallback: subLines are ordered [variations...] only, no type field.
  // variation-N → direct index. trap/warning → not available.
  if (type !== 'variation') return null;
  return data.subLines[localIdx]?.moveAnnotations ?? null;
}

/**
 * Enhance a static annotation with a DB-driven narration if a good match
 * exists. Returns the original annotation with the `annotation` text
 * replaced by the curated narration when appropriate; all other fields
 * (arrows, highlights, plans, etc.) are preserved from the static JSON.
 *
 * This is the "hybrid" integration point: DB narrations for text quality,
 * static JSON for visual elements.
 */
export async function enhanceWithNarration(
  annotation: OpeningMoveAnnotation,
  fen: string,
  moveHistory: string[],
  openingName?: string,
): Promise<OpeningMoveAnnotation> {
  const match = await getBestNarration(fen, moveHistory, openingName);

  if (!match || shouldUseClaudeFallback(match)) {
    return annotation;
  }

  const narrationText = pickNarration(match.narration);
  if (!narrationText) return annotation;

  return { ...annotation, annotation: narrationText };
}

export function clearAnnotationCache(): void {
  cache.clear();
}
