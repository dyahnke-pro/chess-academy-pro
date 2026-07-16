import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db/schema';
import { loadEcoData } from '../../services/dataLoader';
import { searchOpenings } from '../../services/openingService';
import { generateOpening } from '../../services/openingGenerator';
import { getOpeningMoves } from '../../services/openingDetectionService';
import { expandOpeningAbbrev } from './CoachTeachPage';

// Regression for the "Scandi panov" → "I can't verify from grounded data"
// bug (David 2026-07-16). Typing a terminal-short opening name into the coach
// used to fall to the brain because getOpeningMoves filters those lines out.
// The Tier 2.5 teach-rescue expands abbreviations, resolves via the UNFILTERED
// search, and teaches straight from the DB PGN (option B). This test drives the
// rescue's resolution chain end-to-end.
describe('coach teach-rescue for terminal-short openings', () => {
  beforeAll(async () => {
    await db.delete();
    await db.open();
    await loadEcoData();
  }, 60000);

  it('expands common opening abbreviations (whole-word only)', () => {
    // Expansion normalizes to the lowercase canonical token; search lowercases
    // anyway, so casing doesn't matter downstream.
    expect(expandOpeningAbbrev('Scandi panov')).toBe('scandinavian panov');
    expect(expandOpeningAbbrev('the caro')).toBe('the caro-kann');
    // Not a whole word — left alone.
    expect(expandOpeningAbbrev('scandinavian')).toBe('scandinavian');
  });

  it('the filtered resolver returns null for the Scandi Panov (the bug)', () => {
    expect(getOpeningMoves('Scandinavian Defense: Panov Transfer')).toBeNull();
    expect(getOpeningMoves('Scandi panov')).toBeNull();
  });

  it('rescue resolves "Scandi panov" via abbrev-expansion + unfiltered search', async () => {
    const rescued = await searchOpenings(expandOpeningAbbrev('Scandi panov'));
    expect(rescued[0]?.name).toBe('Scandinavian Defense: Panov Transfer');
  });

  it('teaches the rescued line from its PGN via entryOverride (option B)', async () => {
    const hit = (await searchOpenings(expandOpeningAbbrev('Scandi panov')))[0];
    expect(hit?.pgn).toBeTruthy();
    const result = await generateOpening(hit.name, {
      mode: 'learn',
      entryOverride: {
        canonicalName: hit.name,
        eco: hit.eco,
        moves: hit.pgn.trim().split(/\s+/).filter(Boolean),
      },
    });
    expect(result.ok).toBe(true);
    expect(result.tree?.openingName).toBe('Scandinavian Defense: Panov Transfer');
  }, 60000);
});
