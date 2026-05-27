import { describe, expect, it } from 'vitest';
import { detectConversionFailure, detectConversionFailures, resolvePlayerColor } from './conversionDetector';
import type { GameRecord, MoveAnnotation, MoveClassification } from '../types';

function ann(san: string, color: 'white' | 'black', evaluation: number | null, moveNumber: number): MoveAnnotation {
  return {
    moveNumber,
    color,
    san,
    evaluation,
    bestMove: null,
    bestMoveEval: null,
    classification: 'good' as MoveClassification,
    comment: null,
  };
}

// 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 — a real, legal opening so
// the chess.js replay produces a valid peak FEN.
const SANS: [string, 'white' | 'black'][] = [
  ['e4', 'white'], ['e5', 'black'], ['Nf3', 'white'], ['Nc6', 'black'],
  ['Bb5', 'white'], ['a6', 'black'], ['Ba4', 'white'], ['Nf6', 'black'],
  ['O-O', 'white'], ['Be7', 'black'],
];

function game(overrides: Partial<GameRecord>, evals: (number | null)[]): GameRecord {
  const annotations = SANS.map(([san, color], i) =>
    ann(san, color, evals[i] ?? null, Math.floor(i / 2) + 1),
  );
  return {
    id: 'g1',
    pgn: SANS.map(([s]) => s).join(' '),
    white: 'David',
    black: 'Stockfish Bot',
    result: '1/2-1/2',
    date: '2026-05-20',
    event: 'Coach Game',
    eco: null,
    whiteElo: 1500,
    blackElo: 1500,
    source: 'coach',
    annotations,
    coachAnalysis: null,
    isMasterGame: false,
    openingId: 'Ruy Lopez',
    fullyAnalyzed: true,
    ...overrides,
  };
}

describe('resolvePlayerColor', () => {
  it('infers the human side in a coach game from the bot seat', () => {
    expect(resolvePlayerColor(game({ white: 'David', black: 'Stockfish Bot' }, []), {})).toBe('white');
    expect(resolvePlayerColor(game({ white: 'Stockfish Bot', black: 'David' }, []), {})).toBe('black');
  });

  it('matches an imported game against the saved usernames', () => {
    const g = game({ source: 'lichess', white: 'DavidLichess', black: 'opp' }, []);
    expect(resolvePlayerColor(g, { lichessUsername: 'davidlichess' })).toBe('white');
  });

  it('returns null when the side cannot be determined (never guesses)', () => {
    const g = game({ source: 'lichess', white: 'a', black: 'b' }, []);
    expect(resolvePlayerColor(g, { lichessUsername: 'someoneelse' })).toBeNull();
  });
});

describe('detectConversionFailure', () => {
  it('flags a winning advantage (White) blown to a draw', () => {
    // White (player) peaks at +450 then collapses to +20.
    const evals = [80, 70, 120, 110, 450, 200, 60, 20, 30, 10];
    const f = detectConversionFailure(game({}, evals), {});
    expect(f).not.toBeNull();
    expect(f?.playerColor).toBe('white');
    expect(f?.peakCp).toBe(450);
    expect(f?.result).toBe('draw');
    expect(f?.fen).toContain(' '); // a real FEN
  });

  it('does NOT flag when the player converted the win', () => {
    const evals = [80, 70, 120, 110, 450, 400, 500, 600, 700, 900];
    const f = detectConversionFailure(game({ result: '1-0' }, evals), {});
    expect(f).toBeNull();
  });

  it('does NOT flag a game that was never winning', () => {
    const evals = [20, 10, 30, -10, 40, 0, 50, 20, 10, -20];
    const f = detectConversionFailure(game({}, evals), {});
    expect(f).toBeNull();
  });

  it('orients evals to the Black player (negated White-POV)', () => {
    // White-POV evals go deeply negative = Black (player) is winning, then it
    // evaporates. Black seat is the human here.
    const evals = [-80, -90, -120, -460, -200, -60, -20, -30, -10, -5];
    const f = detectConversionFailure(
      game({ white: 'Stockfish Bot', black: 'David', result: '1/2-1/2' }, evals),
      {},
    );
    expect(f).not.toBeNull();
    expect(f?.playerColor).toBe('black');
    expect(f?.peakCp).toBe(460);
  });

  it('skips games that are not fully analyzed', () => {
    const evals = [80, 70, 120, 110, 450, 200, 60, 20, 30, 10];
    expect(detectConversionFailure(game({ fullyAnalyzed: false }, evals), {})).toBeNull();
  });

  it('skips a win-on-the-last-move with no actual slip', () => {
    // Peaks at +450 on the final analyzed ply — no later collapse to flag.
    const evals = [10, 20, 30, 40, 50, 60, 70, 80, 90, 450];
    expect(detectConversionFailure(game({}, evals), {})).toBeNull();
  });
});

describe('detectConversionFailures', () => {
  it('returns failures newest-first and omits clean games', () => {
    const blown = game({ id: 'old', date: '2026-05-01' }, [80, 70, 120, 110, 450, 200, 60, 20, 30, 10]);
    const clean = game({ id: 'fine', date: '2026-05-25', result: '1-0' }, [80, 70, 120, 110, 450, 500, 600, 700, 800, 900]);
    const blown2 = game({ id: 'new', date: '2026-05-26' }, [80, 70, 120, 110, 500, 200, 60, 20, 30, 10]);
    const res = detectConversionFailures([blown, clean, blown2], {});
    expect(res.map((r) => r.gameId)).toEqual(['new', 'old']);
  });
});
