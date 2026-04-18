import { describe, it, expect } from 'vitest';
import { buildNarrationSession } from './gameNarrationBuilder';
import type { GameRecord, MoveAnnotation } from '../types';

function buildGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 'test-game',
    pgn: 'e4 e5 Nf3 Nc6',
    white: 'White',
    black: 'Black',
    result: '1-0',
    date: '2026-01-01',
    event: 'Test',
    eco: 'C44',
    whiteElo: null,
    blackElo: null,
    source: 'import',
    annotations: null,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
    ...overrides,
  };
}

describe('buildNarrationSession', () => {
  it('builds a WalkthroughSession with one step per move', () => {
    const session = buildNarrationSession(buildGame());
    expect(session.steps.length).toBe(4);
    expect(session.steps[0].san).toBe('e4');
    expect(session.steps[1].san).toBe('e5');
  });

  it('uses the game metadata in the title and subtitle', () => {
    const session = buildNarrationSession(
      buildGame({ white: 'Alice', black: 'Bob', result: '0-1', date: '2026-02-02' }),
    );
    expect(session.title).toBe('Narration: Alice vs Bob');
    expect(session.subtitle).toContain('Alice vs Bob');
    expect(session.subtitle).toContain('Black won');
  });

  it('uses annotation comments as narration when available', () => {
    const annotations: MoveAnnotation[] = [
      {
        moveNumber: 1,
        color: 'white',
        san: 'e4',
        evaluation: 25,
        bestMove: 'e4',
        classification: 'best',
        comment: 'Classical center grab.',
      },
      {
        moveNumber: 1,
        color: 'black',
        san: 'e5',
        evaluation: 0,
        bestMove: 'e5',
        classification: 'best',
        comment: null,
      },
    ];
    const session = buildNarrationSession(buildGame({ pgn: 'e4 e5', annotations }));
    expect(session.steps[0].narration).toBe('Classical center grab.');
    // Falls back to the classification template when no comment.
    expect(session.steps[1].narration).toMatch(/top engine choice/i);
  });

  it('falls back to empty narration for unannotated moves', () => {
    const session = buildNarrationSession(buildGame({ pgn: 'e4' }));
    expect(session.steps[0].narration).toBe('');
  });

  it('honors the viewer side for orientation', () => {
    const session = buildNarrationSession(buildGame(), 'black');
    expect(session.orientation).toBe('black');
  });
});
