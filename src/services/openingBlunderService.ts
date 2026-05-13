// openingBlunderService
// ----------------------
// Mines `src/data/puzzles.json` (Lichess CC0 subset, 15K curated) for
// opening blunders — positions tagged `opening` AND carrying a
// tactical-outcome theme (mate / crushing / fork / pin / skewer /
// hangingPiece / attackingF2F7 / attraction / deflection).
//
// The Lichess puzzle taxonomy doesn't have an explicit "openingBlunder"
// theme — these tags are separate axes. Filtering for the
// intersection gives us the same effective surface: positions where
// someone walked into a tactical refutation during the opening.
//
// Used by the debug/preview "Opening Blunders" surface and (TODO)
// potentially by a per-opening drill view on OpeningDetailPage.

import puzzlesRaw from '../data/puzzles.json';

const TACTICAL_OUTCOME_THEMES = new Set<string>([
  'mate',
  'mateIn1',
  'mateIn2',
  'mateIn3',
  'crushing',
  'fork',
  'pin',
  'skewer',
  'hangingPiece',
  'attackingF2F7',
  'attraction',
  'deflection',
  'kingsideAttack',
  'queensideAttack',
  'xRayAttack',
  'doubleCheck',
  'discoveredAttack',
]);

export interface OpeningBlunderPuzzle {
  id: string;
  fen: string;
  /** Space-separated UCI moves. Index 0 is the OPPONENT's setup move
   *  that creates the puzzle position; index 1 onward is the
   *  alternating student/opponent solution. */
  moves: string;
  rating: number;
  themes: string[];
  /** Lichess opening tags. Can be a string or an array depending on
   *  how this row was authored. Normalised by `openingFamily()`. */
  openingTags: string | string[];
  popularity: number;
  nbPlays: number;
}

interface RawPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags?: string | string[];
  popularity?: number;
  nbPlays?: number;
}

const puzzles = puzzlesRaw as RawPuzzle[];

/** Family slug for grouping: first opening tag, lowercased, spaces ⇒ underscores.
 *  Returns 'other' when no tag is present. */
export function openingFamily(p: { openingTags?: string | string[] }): string {
  const t = p.openingTags;
  if (!t) return 'other';
  const first = Array.isArray(t) ? t[0] : t.split(/\s+/)[0];
  if (!first) return 'other';
  return first.toLowerCase().replace(/\s+/g, '_');
}

/** Human-readable label for a family slug (turn underscores into spaces). */
export function familyLabel(family: string): string {
  return family.replace(/_/g, ' ');
}

/** All opening blunders in the local corpus, sorted by popularity desc. */
export function getOpeningBlunderPuzzles(): OpeningBlunderPuzzle[] {
  const out: OpeningBlunderPuzzle[] = [];
  for (const p of puzzles) {
    const themes = p.themes ?? [];
    if (!themes.includes('opening')) continue;
    const hasTactic = themes.some((t) => TACTICAL_OUTCOME_THEMES.has(t));
    if (!hasTactic) continue;
    out.push({
      id: p.id,
      fen: p.fen,
      moves: p.moves,
      rating: p.rating,
      themes,
      openingTags: p.openingTags ?? '',
      popularity: p.popularity ?? 0,
      nbPlays: p.nbPlays ?? 0,
    });
  }
  out.sort((a, b) => b.popularity - a.popularity);
  return out;
}

export interface OpeningBlunderFamily {
  family: string;
  label: string;
  puzzles: OpeningBlunderPuzzle[];
}

/** Same data grouped by opening family slug, families sorted by puzzle count desc. */
export function groupByOpeningFamily(): OpeningBlunderFamily[] {
  const map = new Map<string, OpeningBlunderPuzzle[]>();
  for (const p of getOpeningBlunderPuzzles()) {
    const fam = openingFamily(p);
    const bucket = map.get(fam) ?? [];
    bucket.push(p);
    map.set(fam, bucket);
  }
  return Array.from(map.entries())
    .map(([family, list]) => ({
      family,
      label: familyLabel(family),
      puzzles: list,
    }))
    .sort((a, b) => b.puzzles.length - a.puzzles.length);
}
