import { describe, it, expect } from 'vitest';
import {
  detectTrapInPosition,
  formatTrapForPrompt,
} from './openingTrapDetector';
import type { LichessExplorerResult } from '../types';

const emptyExplorer: LichessExplorerResult = {
  white: 0,
  draws: 0,
  black: 0,
  moves: [],
  topGames: [],
  opening: null,
};

function move(
  san: string,
  opts: Partial<{ white: number; draws: number; black: number }> = {},
): LichessExplorerResult['moves'][number] {
  return {
    uci: '',
    san,
    averageRating: 1600,
    white: opts.white ?? 0,
    draws: opts.draws ?? 0,
    black: opts.black ?? 0,
    game: null,
  };
}

describe('detectTrapInPosition', () => {
  it('returns null when no moves meet popularity threshold', () => {
    const trap = detectTrapInPosition({
      explorer: { ...emptyExplorer, moves: [move('Nxe5', { white: 5, draws: 2, black: 3 })] },
      evaluations: [{ san: 'Nxe5', evalCp: -500 }],
    });
    expect(trap).toBeNull();
  });

  it('returns null when popular move has a fine evaluation', () => {
    const trap = detectTrapInPosition({
      explorer: { ...emptyExplorer, moves: [move('e4', { white: 100, draws: 50, black: 50 })] },
      evaluations: [{ san: 'e4', evalCp: 20 }],
    });
    expect(trap).toBeNull();
  });

  it('flags a popular move that loses by more than the threshold', () => {
    const trap = detectTrapInPosition({
      explorer: {
        ...emptyExplorer,
        moves: [
          move('Bxf2+', { white: 200, draws: 10, black: 50 }),
          move('Nf6', { white: 1000, draws: 500, black: 500 }),
        ],
      },
      evaluations: [
        { san: 'Bxf2+', evalCp: -350 },
        { san: 'Nf6', evalCp: 5 },
      ],
      engineBestSan: 'Nf6',
    });
    expect(trap).not.toBeNull();
    expect(trap!.trapMove).toBe('Bxf2+');
    expect(trap!.gamesPlayed).toBe(260);
    expect(trap!.severity).toBe('trap');
    expect(trap!.refutationSan).toBe('Nf6');
  });

  it('marks catastrophic losses as severe', () => {
    const trap = detectTrapInPosition({
      explorer: {
        ...emptyExplorer,
        moves: [move('Nxe5', { white: 300, draws: 20, black: 100 })],
      },
      evaluations: [{ san: 'Nxe5', evalCp: -900 }],
    });
    expect(trap!.severity).toBe('severe');
  });

  it('picks the WORST qualifying trap when multiple exist', () => {
    const trap = detectTrapInPosition({
      explorer: {
        ...emptyExplorer,
        moves: [
          move('h6', { white: 100, draws: 20, black: 40 }),
          move('Nxe4', { white: 150, draws: 10, black: 30 }),
        ],
      },
      evaluations: [
        { san: 'h6', evalCp: -220 },
        { san: 'Nxe4', evalCp: -450 },
      ],
    });
    expect(trap!.trapMove).toBe('Nxe4');
  });

  it('formatTrapForPrompt cites the numbers and the refutation', () => {
    const text = formatTrapForPrompt({
      trapMove: 'Bxf2+',
      gamesPlayed: 12345,
      evalCpForMover: -350,
      severity: 'trap',
      refutationSan: 'Kxf2',
    });
    expect(text).toContain('TRAP AVAILABLE');
    expect(text).toContain('Bxf2+');
    expect(text).toContain('12,345');
    expect(text).toContain('-3.5 pawns');
    expect(text).toContain('Kxf2');
  });
});
