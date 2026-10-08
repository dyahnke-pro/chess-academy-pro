import type { OpeningRecord } from '../types';

// How an opening list is shelved (David 2026-10-08: "organized alphabetically"
// + "a cleaner way to separate black and white openings"). One side at a time,
// A–Z, and Black courses split by the first move they answer — a Black player
// needs one defence against 1.e4 and one against everything else.

export type ShelfSide = 'white' | 'black';
export type BlackShelfGroup = 'vs-e4' | 'vs-other';

export const BLACK_GROUP_LABEL: Record<BlackShelfGroup, string> = {
  'vs-e4': 'vs 1.e4',
  'vs-other': 'vs 1.d4 & others',
};

/** List labels for courses whose record name reads as the OTHER side's
 *  opening. "Sicilian: Alapin" is a Black course, but 2.c3 is White's move.
 *  The record name stays (opening lookup matches on it); only the shelf
 *  label changes. */
const SHELF_LABELS: Record<string, string> = {
  'sicilian-alapin': 'Sicilian vs the Alapin',
};

export function shelfLabel(opening: OpeningRecord): string {
  return SHELF_LABELS[opening.id] ?? opening.name;
}

/** Alphabetical key: ignores case, accents and punctuation, so "Grünfeld"
 *  sorts under G and "King's Gambit" next to "Kings…". */
function sortKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .toLowerCase()
    .trim();
}

export function sortOpeningsAZ(openings: OpeningRecord[]): OpeningRecord[] {
  return [...openings].sort((a, b) => {
    const ka = sortKey(shelfLabel(a));
    const kb = sortKey(shelfLabel(b));
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

/** The first SAN of the course's own line — the move a Black course answers. */
export function firstMove(opening: OpeningRecord): string {
  const tokens = opening.pgn.replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/);
  return tokens[0] ?? '';
}

export function blackShelfGroup(opening: OpeningRecord): BlackShelfGroup {
  return firstMove(opening) === 'e4' ? 'vs-e4' : 'vs-other';
}

export function openingsForSide(openings: OpeningRecord[], side: ShelfSide): OpeningRecord[] {
  return sortOpeningsAZ(openings.filter((o) => o.color === side));
}
