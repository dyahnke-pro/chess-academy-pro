import { describe, it, expect } from 'vitest';
import { candidatesKey, candidatesKit } from './thinkingCandidatesStep';
import type { LessonPositionCandidate } from './thinkingPositions';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const board = (topMoves: Array<{ san: string; cpLoss: number }>): LessonPositionCandidate => ({ fen: START, origin: 'puzzle', topMoves });

describe('candidates — the key is the engine\'s good moves', () => {
  it('keys every move within the window, by where it lands', () => {
    const k = candidatesKey(START, board([{ san: 'e4', cpLoss: 0 }, { san: 'd4', cpLoss: 10 }, { san: 'Nf3', cpLoss: 30 }]));
    expect(k?.key.sort()).toEqual(['d4', 'e4', 'f3']);
  });

  it('is unfair when only one move is good (that is a find-the-move, not a comparison)', () => {
    expect(candidatesKey(START, board([{ san: 'e4', cpLoss: 0 }, { san: 'a3', cpLoss: 150 }]))).toBeNull();
  });

  it('is unfair when a move sits in the grey band (too close to call wrong)', () => {
    expect(candidatesKey(START, board([{ san: 'e4', cpLoss: 0 }, { san: 'd4', cpLoss: 10 }, { san: 'c4', cpLoss: 80 }]))).toBeNull();
  });

  it('is unfair when two good moves land on one square', () => {
    expect(candidatesKey(START, board([{ san: 'Nf3', cpLoss: 0 }, { san: 'f3', cpLoss: 20 }]))).toBeNull();
  });

  it('is never fair without engine moves', () => {
    expect(candidatesKey(START, { fen: START, origin: 'puzzle' })).toBeNull();
    expect(candidatesKey(START)).toBeNull();
  });

  it('names the moves only after the key was computed for that board, and never on a wrong tap', () => {
    const kit = candidatesKit();
    const c = board([{ san: 'e4', cpLoss: 0 }, { san: 'd4', cpLoss: 10 }, { san: 'a3', cpLoss: 200 }]);
    const k = kit.keyFor(START, c);
    expect(k?.key.sort()).toEqual(['d4', 'e4']);
    expect(kit.reasonFor(START, 'e4')).toMatch(/first choice/);
    expect(kit.reasonFor(START, 'd4')).toMatch(/just as good/);
    const wrong = kit.wrongTapLine(START, 'a3');
    expect(wrong).toMatch(/weaker/);
    expect(wrong).not.toMatch(/e4|d4/);
    expect(kit.wrongTapLine(START, 'h5')).not.toMatch(/e4|d4/);
  });

  it('declares that it needs the engine, so it never enters the lesson game', () => {
    expect(candidatesKit().enrich).toBeTypeOf('function');
    expect(candidatesKit().adapt).toBeUndefined();
  });
});
