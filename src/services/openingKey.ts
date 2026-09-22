// THE ONE OPENING KEY — WO-STANDARD-01 A1 (David 2026-09-22).
//
// Four writers stored four different things in `GameRecord.openingId`: imports
// the Dexie id, Play the detected NAME, Learn the walkthrough tree's name,
// review a book-corpus id — so `studentNeedLoader`'s departure and result terms
// never joined on the surface that computes them, and "your mistakes in the
// Pirc" could not be asked. This module is the only minter. Everything else
// either calls it or carries the branded value it returned.
//
// The key IS the Dexie `openings` id: `slug(`${eco}-${name}`)`, exactly what
// `dataLoader.loadEcoData` seeds (it imports `slugifyOpening` from here so the
// two can never drift). It is minted from the BOARD — the trie in
// `openingDetectionService` walks the SANs to the deepest named entry — never
// from a name someone typed, so two surfaces looking at one PGN agree.
//
// Leaf w.r.t. Dexie and the store. Its one service import is the detector,
// which imports `openingKeyFor` back; both uses are inside functions, so the
// cycle is inert at module load.
import { Chess } from 'chess.js';
import type { OpeningKey } from '../types';
import { detectOpening, openingEntriesForKeys } from './openingDetectionService';

/** URL-safe slug — the same function `dataLoader` used to seed the ids. */
export function slugifyOpening(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Mint the key for a named entry. The ONLY place a string becomes an
 *  `OpeningKey`. */
export function openingKeyFor(eco: string, name: string): OpeningKey {
  return slugifyOpening(`${eco}-${name}`) as OpeningKey;
}

/** The key for a move sequence — the deepest named entry the trie reaches. */
export function openingKeyFromSans(sans: readonly string[]): OpeningKey | null {
  const d = detectOpening([...sans]);
  return d ? d.key : null;
}

/** The key for a PGN (headers tolerated; a malformed PGN yields null, never a
 *  throw — an import must not die on one bad game). */
export function openingKeyFromPgn(pgn: string): OpeningKey | null {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return null;
  }
  return openingKeyFromSans(chess.history());
}

/** The FAMILY of a named opening: the text before the first colon
 *  ("Sicilian Defense: Bowdler Attack" → "Sicilian Defense"). The unit the
 *  home-opening computer ranks; a key alone is variation-deep. */
export function openingFamily(name: string): string {
  return name.split(':')[0].trim();
}

const KEY_SHAPE = /^[a-e]\d{2}(-[a-z0-9]+)+$/;

/** Accept a persisted or synced value as a key ONLY when it has the minted
 *  shape. A name ("Sicilian Defense: Bowdler Attack"), an empty string or a
 *  book-corpus id ("caro-kann") returns null — the backfill then re-mints it
 *  from the PGN. This is the Dexie/cloud boundary; typed code never needs it. */
export function asOpeningKey(raw: string | null | undefined): OpeningKey | null {
  if (!raw) return null;
  return KEY_SHAPE.test(raw) ? (raw as OpeningKey) : null;
}

/** ECO prefix of a key ("b01-…" → "B01"), for callers that scope by ECO. */
export function ecoOfKey(key: OpeningKey): string {
  return key.slice(0, 3).toUpperCase();
}

/** Two keys name lines of the same family when their ECO letter+family slug
 *  agree up to the first variation separator. Families are compared on the
 *  minted name, so this reads the detector's entry list rather than parsing
 *  the slug back into prose. */
export function sameOpeningFamily(a: OpeningKey | null, b: OpeningKey | null): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const fa = familyOfKey(a);
  const fb = familyOfKey(b);
  return fa !== null && fa === fb;
}

let entryIndex: Map<string, { eco: string; name: string }> | null = null;
/** key → named entry, built once from the detector's entries. Null for a key
 *  no entry mints (a stale or foreign value that passed `asOpeningKey`). */
export function openingEntryForKey(key: OpeningKey): { eco: string; name: string } | null {
  if (!entryIndex) {
    entryIndex = new Map();
    for (const e of openingEntriesForKeys()) entryIndex.set(openingKeyFor(e.eco, e.name), { eco: e.eco, name: e.name });
  }
  return entryIndex.get(key) ?? null;
}

function familyOfKey(key: OpeningKey): string | null {
  const e = openingEntryForKey(key);
  return e ? openingFamily(e.name) : null;
}

