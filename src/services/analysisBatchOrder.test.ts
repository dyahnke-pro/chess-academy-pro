// pickAnalysisBatch — the home openings' games run first, ALL of them, past the
// package cap; the rest fill by recency (WO-HOME-OPENING-01 A2).
import { describe, it, expect, vi } from 'vitest';
import { buildGameRecord } from '../test/factories';
import { openingKeyFor } from './openingKey';

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { id: 'main', name: 'S', preferences: { chessComUsername: 'student' } }, setBackgroundAnalysis: () => undefined }) },
}));
vi.mock('./homeOpeningService', () => ({
  getHomeOpenings: async () => ({ white: null, black: { family: 'Pirc Defense', key: 'b07-pirc-defense', games: 63, score: 0.49, source: 'computed', chosenAt: 0 } }),
}));

import { pickAnalysisBatch } from './gameAnalysisService';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ITALIAN = openingKeyFor('C50', 'Italian Game');

describe('pickAnalysisBatch', () => {
  it('every home-opening game leads, even past the package size; newest of the rest fill', async () => {
    const pirc = Array.from({ length: 12 }, (_, i) => buildGameRecord({ id: `p${i}`, openingId: PIRC, white: 'opp', black: 'student', result: '0-1', date: `2025-01-${String(i + 1).padStart(2, '0')}` }));
    const other = Array.from({ length: 12 }, (_, i) => buildGameRecord({ id: `o${i}`, openingId: ITALIAN, white: 'student', black: 'opp', result: '1-0', date: `2026-01-${String(i + 1).padStart(2, '0')}` }));
    const r = await pickAnalysisBatch([...other, ...pirc], 10);
    expect(r.homeCount).toBe(12);
    expect(r.batch).toHaveLength(12); // the cap does not bind the home games
    expect(r.batch.every((g) => g.openingId === PIRC)).toBe(true);
    expect(r.homeFamilies).toEqual(['Pirc Defense']);
    const wider = await pickAnalysisBatch([...other, ...pirc], 15);
    expect(wider.batch.slice(0, 12).every((g) => g.openingId === PIRC)).toBe(true);
    expect(wider.batch.slice(12).map((g) => g.id)).toEqual(['o11', 'o10', 'o9']); // newest of the rest
  });
});
