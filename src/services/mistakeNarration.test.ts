import { describe, it, expect } from 'vitest';
import { generateMistakeNarration, type NarrationParams } from './mistakeNarration';
import type { MistakeClassification, MistakeGamePhase } from '../types';

function buildParams(overrides?: Partial<NarrationParams>): NarrationParams {
  return {
    classification: 'mistake',
    gamePhase: 'middlegame',
    playerMoveSan: 'Bxh7',
    bestMoveSan: 'Nf3',
    cpLoss: 150,
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    moves: 'd2d4 d7d5 c4b5 c6a5 b5d3',
    opponentName: null,
    gameDate: null,
    openingName: null,
    evalBefore: null,
    ...overrides,
  };
}

describe('generateMistakeNarration', () => {
  const classifications: MistakeClassification[] = ['blunder', 'mistake', 'inaccuracy', 'miss'];
  const phases: MistakeGamePhase[] = ['opening', 'middlegame', 'endgame'];

  it('returns a MistakeNarration with intro, moveNarrations, and outro', () => {
    const result = generateMistakeNarration(buildParams());
    expect(result.intro).toBeTruthy();
    expect(result.outro).toBeTruthy();
    expect(Array.isArray(result.moveNarrations)).toBe(true);
  });

  it('intro contains the player move and best move', () => {
    const result = generateMistakeNarration(buildParams({ playerMoveSan: 'h4', bestMoveSan: 'Nf3' }));
    expect(result.intro).toContain('h4');
    expect(result.intro).toContain('Nf3');
  });

  it('intro contains centipawn loss as pawns', () => {
    const result = generateMistakeNarration(buildParams({ cpLoss: 250 }));
    expect(result.intro).toContain('2.5');
  });

  it.each(classifications)('generates narration for classification: %s', (classification) => {
    const result = generateMistakeNarration(buildParams({ classification }));
    expect(result.intro.length).toBeGreaterThan(20);
    expect(result.outro.length).toBeGreaterThan(20);
  });

  it.each(phases)('generates narration for phase: %s', (gamePhase) => {
    const result = generateMistakeNarration(buildParams({ gamePhase }));
    expect(result.intro.length).toBeGreaterThan(20);
  });

  it('generates all combinations of classification x phase', () => {
    for (const classification of classifications) {
      for (const phase of phases) {
        const result = generateMistakeNarration(buildParams({ classification, gamePhase: phase }));
        expect(result.intro).toBeTruthy();
        expect(result.outro).toBeTruthy();
      }
    }
  });

  it('generates per-move narrations matching player move count', () => {
    // Use valid moves from starting FEN: 1. d4 d5 2. Bb5 (3 UCI = 2 player + 1 opponent)
    // Then add more: 3 UCI = 2 player moves, 5 UCI = 3 player moves
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = generateMistakeNarration(buildParams({
      fen,
      moves: 'e2e4 e7e5 d2d4 d7d5 g1f3',
    }));
    // 5 UCI moves: player=e4, d4, Nf3 (3), opponent=e5, d5 (2)
    expect(result.moveNarrations.length).toBe(3);
  });

  it('generates per-move narrations for single-move puzzles', () => {
    const result = generateMistakeNarration(buildParams({ moves: 'd2d4' }));
    expect(result.moveNarrations.length).toBe(1);
  });

  it('returns empty moveNarrations for empty moves', () => {
    const result = generateMistakeNarration(buildParams({ moves: '' }));
    expect(result.moveNarrations).toEqual([]);
  });

  it('first move narration contains the SAN of the first move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = generateMistakeNarration(buildParams({ fen, moves: 'e2e4 e7e5 d2d4' }));
    expect(result.moveNarrations[0]).toContain('e4');
  });

  it('blunder intro contains severity language', () => {
    const result = generateMistakeNarration(buildParams({ classification: 'blunder', cpLoss: 400 }));
    // Should contain cp reference with "serious" since >=300
    expect(result.intro).toMatch(/serious|blunder|loses|dropped/i);
  });

  it('miss intro references opponent mistake', () => {
    const result = generateMistakeNarration(buildParams({ classification: 'miss' }));
    expect(result.intro).toMatch(/opponent|punish|capitalize|off the hook/i);
  });

  it('includes opponent name in intro when provided', () => {
    const result = generateMistakeNarration(buildParams({ opponentName: 'Magnus' }));
    expect(result.intro).toContain('vs Magnus');
  });

  it('includes time ago in intro when gameDate provided', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = generateMistakeNarration(buildParams({ opponentName: 'Bot', gameDate: today }));
    expect(result.intro).toContain('today');
  });

  it('includes opening name in intro when provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      openingName: 'Sicilian Defense',
    }));
    expect(result.intro).toContain('Sicilian Defense');
  });

  it('includes advantage context when evalBefore provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      evalBefore: 2.0,
    }));
    expect(result.intro).toMatch(/strong advantage/i);
  });

  it('indicates equal position when evalBefore is near zero', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: 'Bot',
      evalBefore: 0.1,
    }));
    expect(result.intro).toMatch(/roughly equal/i);
  });

  it('omits context sentence when no context fields are provided', () => {
    const result = generateMistakeNarration(buildParams({
      opponentName: null,
      gameDate: null,
      openingName: null,
      evalBefore: null,
    }));
    // Should NOT contain "vs" or "playing the" — just the mistake explanation
    expect(result.intro).not.toContain('vs ');
    expect(result.intro).not.toContain('playing the');
  });
});
