/**
 * No cap on a game's key moments (G4.5, 2026-10-20). Play kept the top 5
 * swings, so a sixth and seventh turning point were dropped and a quiet game
 * was filled with five; the recap named three of its flagged moments.
 */
import { describe, it, expect, vi } from 'vitest';
import type { CoachGameMove, MoveClassification } from '../types';
import { findKeyMoments, generateNarrativeSummary } from './coachFeatureService';

vi.mock('./coachApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./coachApi')>()),
  voiceFacts: async (): Promise<string | null> => null,
}));

const move = (i: number, evaluation: number, classification: MoveClassification): CoachGameMove => ({
  moveNumber: i + 1, san: `m${i}`, fen: `fen${i}`, isCoachMove: false, commentary: '', evaluation, classification,
  expanded: false, bestMove: null, bestMoveEval: null, preMoveEval: null,
} as unknown as CoachGameMove);

describe('findKeyMoments keeps every moment that clears the bar', () => {
  it('a game with 7 real turning points keeps all 7, in game order', () => {
    // 14 student moves; every odd one a mistake that costs 2.5 pawns for good.
    const moves = Array.from({ length: 14 }, (_, i) => move(i, -250 * Math.ceil(i / 2), i % 2 === 1 ? 'mistake' : 'good'));
    const km = findKeyMoments(moves);
    expect(km).toHaveLength(7);
    expect(km.map((k) => k.moveNumber)).toEqual([2, 4, 6, 8, 10, 12, 14]);
  });

  it('a quiet game keeps none', () => {
    const moves = Array.from({ length: 20 }, (_, i) => move(i, 20 + (i % 3) * 10, 'good'));
    expect(findKeyMoments(moves)).toEqual([]);
  });
});

describe('the full recap names every flagged moment', () => {
  it('five mistakes are five moments; brief still names one', { timeout: 30_000 }, async () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
    const moveData = sans.map((san, i) => ({
      moveNumber: i + 1, san, commentary: '', bestMove: null, isCoachMove: false,
      classification: i % 2 === 0 ? 'mistake' : 'good', evaluation: 0,
    }));
    const full = await generateNarrativeSummary(sans.join(' '), 'white', null, '0-1', 1500, undefined, moveData, 'full');
    expect(full.match(/was a mistake/g)).toHaveLength(5);
    const brief = await generateNarrativeSummary(sans.join(' '), 'white', null, '0-1', 1500, undefined, moveData, 'brief');
    expect(brief.match(/was a mistake/g)).toHaveLength(1);
  });
});
