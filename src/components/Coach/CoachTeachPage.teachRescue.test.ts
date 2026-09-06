import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../../db/schema';
import { loadEcoData } from '../../services/dataLoader';
import { searchOpenings } from '../../services/openingService';
import { generateOpening } from '../../services/openingGenerator';
import { getOpeningMoves } from '../../services/openingDetectionService';
import { expandOpeningAbbrev } from '../../utils/openingAbbrev';

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

  it('resolves the REAL Scandinavian Panov by EXACT name — never the fuzzy "panov" Sicilian (David 2026-09-06)', () => {
    // The exact DB name is a real 6-ply entry (1.e4 d5 2.exd5 Nf6 3.c4 c6) that
    // the terminal-short filter hides from the FUZZY tiers. Before the fix it
    // fell through to the rare-token tier and matched "Sicilian Defense: Dragon
    // Variation, Yugoslav Attack, Panov Variation" on the shared token "panov" —
    // teaching a Sicilian (e4 c5) for a Scandinavian. An exact name must win.
    const moves = getOpeningMoves('Scandinavian Defense: Panov Transfer');
    expect(moves).not.toBeNull();
    expect(moves!.slice(0, 4)).toEqual(['e4', 'd5', 'exd5', 'Nf6']); // Scandinavian, NOT the Sicilian e4 c5
    // The bare abbreviation has no exact match; "panov" alone can't corroborate a
    // Sicilian (no "scandi" token), so it stays null and routes via the
    // searchOpenings rescue below.
    expect(getOpeningMoves('Scandi panov')).toBeNull();
  });

  it('searchOpenings self-expands the "Scandi" abbreviation (dashboard + openings + rescue)', async () => {
    // Raw "Scandi panov" scores nothing (abbreviation); searchOpenings retries
    // with the expansion and resolves it — so the dashboard/openings search AND
    // the coach teach-rescue all surface the line.
    const rescued = await searchOpenings('Scandi panov');
    expect(rescued[0]?.name).toBe('Scandinavian Defense: Panov Transfer');
  });

  it('teaches the rescued line from its PGN via entryOverride (option B)', async () => {
    const hit = (await searchOpenings('Scandi panov'))[0];
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
