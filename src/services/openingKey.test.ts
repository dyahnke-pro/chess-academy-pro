// openingKey — THE ONE OPENING KEY (WO-STANDARD-01 A1). The key is the Dexie
// `openings` id, minted from the BOARD; a name can never be one.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  asOpeningKey, ecoOfKey, openingEntryForKey, openingFamily, openingKeyFor, openingKeyFromPgn,
  openingKeyFromSans, sameOpeningFamily, slugifyOpening,
} from './openingKey';
import { detectOpening } from './openingDetectionService';

const SICILIAN = ['e4', 'c5'];
const NAJDORF = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
const ITALIAN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];

describe('openingKey — one minter, one shape', () => {
  it('mints exactly the slug dataLoader seeds as the Dexie id', () => {
    expect(openingKeyFor('B20', 'Sicilian Defense')).toBe('b20-sicilian-defense');
    expect(slugifyOpening("King's Indian Defense: Sämisch Variation")).toBe('king-s-indian-defense-s-misch-variation');
  });

  it('the key of a line is the detector\'s deepest named entry — one computation, every writer', () => {
    const fromSans = openingKeyFromSans(NAJDORF);
    const chess = new Chess();
    for (const s of NAJDORF) chess.move(s);
    const fromPgn = openingKeyFromPgn(chess.pgn()); // headers + result, as an export carries them
    const detected = detectOpening([...NAJDORF]);
    expect(fromSans).not.toBeNull();
    expect(fromPgn).toBe(fromSans);
    expect(detected?.key).toBe(fromSans);
    expect(openingEntryForKey(fromSans!)?.name).toBe(detected?.name);
    expect(ecoOfKey(fromSans!)).toBe(detected?.eco);
  });

  it('a malformed PGN yields null, never a throw (an import must not die on one bad game)', () => {
    expect(openingKeyFromPgn('1. e4 e5 2. Qxq9 ???')).toBeNull();
    expect(openingKeyFromPgn('')).toBeNull();
  });

  it('asOpeningKey is the Dexie/cloud boundary: only the minted shape passes', () => {
    expect(asOpeningKey('b20-sicilian-defense')).toBe('b20-sicilian-defense');
    // The four wrong things the old writers stored — every one is refused.
    expect(asOpeningKey('Sicilian Defense: Bowdler Attack')).toBeNull(); // Play stored the NAME
    expect(asOpeningKey('caro-kann')).toBeNull();                        // a book-corpus id
    expect(asOpeningKey('')).toBeNull();
    expect(asOpeningKey(null)).toBeNull();
    expect(asOpeningKey(undefined)).toBeNull();
  });

  it('family is the text before the colon; two sub-lines of one family agree, two families do not', () => {
    expect(openingFamily('Sicilian Defense: Najdorf Variation')).toBe('Sicilian Defense');
    const sic = openingKeyFromSans(SICILIAN)!;
    const naj = openingKeyFromSans(NAJDORF)!;
    const ita = openingKeyFromSans(ITALIAN)!;
    expect(sic).not.toBe(naj);
    expect(sameOpeningFamily(sic, naj)).toBe(true);
    expect(sameOpeningFamily(naj, sic)).toBe(true);
    expect(sameOpeningFamily(sic, ita)).toBe(false);
    // A null on either side is NOT a wildcard.
    expect(sameOpeningFamily(null, sic)).toBe(false);
    expect(sameOpeningFamily(sic, null)).toBe(false);
    expect(sameOpeningFamily(null, null)).toBe(false);
  });

  it('a key no entry mints resolves to nothing rather than a guess', () => {
    const foreign = asOpeningKey('a00-not-a-real-entry');
    if (!foreign) throw new Error('shape should pass');
    expect(openingEntryForKey(foreign)).toBeNull();
    expect(sameOpeningFamily(foreign, foreign)).toBe(true); // identical keys are one line
    expect(sameOpeningFamily(foreign, openingKeyFromSans(SICILIAN))).toBe(false);
  });
});
