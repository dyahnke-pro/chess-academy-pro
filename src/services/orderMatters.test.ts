import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { AnalysisLine } from '../types';

// "Why not X first? It would allow Y" is said only when the engine rates X
// first at least half a pawn worse than the move played (Danya speedrun
// tapes: the order point said where X was just as good).
const at = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const FEN = at(['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'Bb4', 'd5', 'Ne7', 'Bd3', 'd6', 'O-O']);
const line = (uci: string, cp: number): AnalysisLine => ({ rank: 1, evaluation: cp, moves: [uci], mate: null } as unknown as AnalysisLine);
const said = (fan: AnalysisLine[]): string => moveThoughtFacts({ namesPlayedMove: true,
  plainThreatsSeen: false, story: false, theory: false, tense: 'now', fenBefore: FEN, san: 'Bxc3', moverIsStudent: true,
  prev: NO_PREV_CAPTURE, line: ['bxc3', 'Ng6'], history: [], theirLast: null, phrases: null, costCp: null,
  reads: { before: fan, after: [], passBefore: [], passAfter: [] },
}).map((f) => f.text).join(' ');

describe('the order point speaks only when the order matters', () => {
  it('silent when …Ng6 first is as good as …Bxc3 by the engine', () => {
    expect(said([line('b4c3', -20), line('e7g6', -30)])).not.toMatch(/Ng6 first|straight away/);
  });
  it('speaks when …Ng6 first is clearly worse', () => {
    expect(said([line('b4c3', -20), line('e7g6', 90)])).toMatch(/Ng6/);
  });
});
