import { describe, it, expect } from 'vitest';
import {
  adaptivePuzzleToLessonPosition,
  pickAdaptivePuzzle,
  createAdaptiveEndgameState,
  type RawPuzzle,
} from './adaptiveEndgameService';

function gamePuzzle(overrides: Partial<RawPuzzle> = {}): RawPuzzle {
  return {
    id: 'gcalc-1',
    fen: '8/P5k1/8/8/8/8/6K1/8 w - - 0 1',
    moves: 'a7a8q',
    rating: 1200,
    themes: ['promotion', 'advancedPawn'],
    openingTags: null,
    popularity: 100,
    nbPlays: 9999,
    noSetupMove: true,
    conceptHint: 'Promote the pawn',
    sourceLabel: 'From your game vs Magnus (2026-01-01)',
    sourceGameId: 'g1',
    ...overrides,
  };
}

describe('adaptivePuzzleToLessonPosition — game-derived (noSetupMove)', () => {
  it('keeps the FEN student-to-move and treats every ply as the solution', () => {
    const pos = adaptivePuzzleToLessonPosition(gamePuzzle());
    expect(pos).not.toBeNull();
    // No setup ply played — the FEN is unchanged from the source.
    expect(pos!.fen).toBe('8/P5k1/8/8/8/8/6K1/8 w - - 0 1');
    expect(pos!.solution).toEqual(['a8=Q']);
    expect(pos!.bestMove).toBe('a8=Q');
    expect(pos!.title).toBe('From your game');
    expect(pos!.source).toBe('From your game vs Magnus (2026-01-01)');
    expect(pos!.conceptHint).toBe('Promote the pawn');
  });

  it('accepts a single-ply solution (Lichess puzzles need ≥2; game puzzles need ≥1)', () => {
    const pos = adaptivePuzzleToLessonPosition(gamePuzzle({ moves: 'a7a8q' }));
    expect(pos).not.toBeNull();
    expect(pos!.solution).toHaveLength(1);
  });
});

describe('pickAdaptivePuzzle — game-derived blend', () => {
  const extras = [gamePuzzle({ id: 'gcalc-mate', themes: ['mateIn2'] })];

  it('serves a game puzzle on a prefer-turn when one matches the themes', () => {
    // pickIndex = solved + failed = 1 → 1 % 2 === 1 → prefer-turn.
    const state = { ...createAdaptiveEndgameState(1500), failed: 1 };
    const picked = pickAdaptivePuzzle(state, {
      themes: ['mateIn2'],
      extraPuzzles: extras,
      preferExtraEvery: 2,
    });
    expect(picked?.id).toBe('gcalc-mate');
  });

  it('does NOT serve a game puzzle on a non-prefer turn (static instead)', () => {
    // pickIndex = 0 → 0 % 2 !== 1 → static pick.
    const state = createAdaptiveEndgameState(1500);
    const picked = pickAdaptivePuzzle(state, {
      themes: ['mateIn2'],
      extraPuzzles: extras,
      preferExtraEvery: 2,
    });
    expect(picked).not.toBeNull();
    expect(picked!.id).not.toBe('gcalc-mate');
    expect(picked!.id.startsWith('gcalc-')).toBe(false);
  });

  it('falls back to static when no game puzzle matches the themes (fresh user path)', () => {
    const state = { ...createAdaptiveEndgameState(1500), failed: 1 };
    const picked = pickAdaptivePuzzle(state, {
      themes: ['mateIn2'],
      extraPuzzles: [], // no game puzzles
      preferExtraEvery: 2,
    });
    expect(picked).not.toBeNull();
    expect(picked!.id.startsWith('gcalc-')).toBe(false);
  });

  it('skips an already-played game puzzle even on a prefer-turn', () => {
    const state = {
      ...createAdaptiveEndgameState(1500),
      failed: 1,
      playedIds: new Set(['gcalc-mate']),
    };
    const picked = pickAdaptivePuzzle(state, {
      themes: ['mateIn2'],
      extraPuzzles: extras,
      preferExtraEvery: 2,
    });
    expect(picked?.id).not.toBe('gcalc-mate');
  });
});
