import { describe, it, expect } from 'vitest';
import { getCounterFamilies, matchOpponentOpening } from './counterRepertoireService';
import proRepertoires from '../data/pro-repertoires.json';
import antiOpenings from '../data/anti-openings.json';

/** Every id the recommendation map may point at: pro-rep + anti-openings. */
function realOpeningIds(): Set<string> {
  const ids = new Set<string>();
  const pro = proRepertoires as unknown as { openings?: Array<{ id: string }> } | Array<{ id: string }>;
  const proList = Array.isArray(pro) ? pro : (pro.openings ?? []);
  for (const o of proList) ids.add(o.id);
  const anti = antiOpenings as unknown as { openings?: Array<{ id: string }> } | Array<{ id: string }>;
  const antiList = Array.isArray(anti) ? anti : (anti.openings ?? []);
  for (const o of antiList) ids.add(o.id);
  return ids;
}

const STYLE_VOCAB = new Set(['tactical', 'positional', 'aggressive', 'solid', 'sharp']);

describe('counter-repertoire map integrity', () => {
  it('every recommendation resolves to a REAL app opening (no dangling ids)', () => {
    const ids = realOpeningIds();
    expect(ids.size).toBeGreaterThan(20);
    for (const family of getCounterFamilies()) {
      for (const rec of family.recommendations) {
        expect(ids.has(rec.openingId), `${family.key} → ${rec.openingId} not found in pro-repertoires/anti-openings`).toBe(true);
      }
    }
  });

  it('every family carries 1-2 recommendations with valid styleTags and a display name', () => {
    for (const family of getCounterFamilies()) {
      expect(family.displayName.length).toBeGreaterThan(2);
      expect(['white', 'black']).toContain(family.studentSide);
      expect(family.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(family.recommendations.length).toBeLessThanOrEqual(2);
      for (const rec of family.recommendations) {
        expect(rec.styleTags.length).toBeGreaterThan(0);
        for (const tag of rec.styleTags) {
          expect(STYLE_VOCAB.has(tag), `${family.key}: unknown styleTag "${tag}"`).toBe(true);
        }
        if (rec.stat) {
          expect(rec.stat.games).toBeGreaterThan(0);
          expect(rec.stat.scorePct).toBeGreaterThan(0);
          expect(rec.stat.scorePct).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('aliases are lowercase (the matcher lowercases the question, not the alias)', () => {
    for (const family of getCounterFamilies()) {
      for (const alias of family.aliases) {
        expect(alias).toBe(alias.toLowerCase());
      }
    }
  });
});

describe('matchOpponentOpening', () => {
  it("matches David's live asks (2026-07-15 screenshots)", () => {
    expect(matchOpponentOpening('What should I play against the Pirc?')?.key).toBe('pirc');
    expect(matchOpponentOpening('I struggle against the KID. Which opening do you suggest I play against it and why?')?.key).toBe('kings-indian');
  });

  it('matches typos, abbreviations and British spellings (G7)', () => {
    expect(matchOpponentOpening('how do I meet the caro cann')?.key).toBe('caro-kann');
    expect(matchOpponentOpening('best line against the scandi')?.key).toBe('scandinavian');
    expect(matchOpponentOpening('what do you recommend against the modern defence')?.key).toBe('modern');
  });

  it('longest-alias precedence: an Alapin-specific ask beats the Sicilian family', () => {
    expect(matchOpponentOpening('what should I play against the alapin as black')?.key).toBe('alapin-vs');
    expect(matchOpponentOpening('what should I play against the sicilian')?.key).toBe('sicilian');
  });

  it('returns null when no family matches (the honest no-prep path)', () => {
    expect(matchOpponentOpening('what should I play against the grob')).toBeNull();
    expect(matchOpponentOpening('')).toBeNull();
    expect(matchOpponentOpening(undefined)).toBeNull();
  });
});
