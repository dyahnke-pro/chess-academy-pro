import { describe, it, expect } from 'vitest';
import { extractQuestionFocus, classifyBoardQuestion } from './boardQuestionRouter';

// David 2026-08-28: sort a board question by WHAT IT POINTS AT. These are the
// exact questions the live audit found deflecting to best-move; each must now
// sort to its real aspect.
describe('extractQuestionFocus — the audit questions sort correctly', () => {
  const cases: Array<[string, string]> = [
    ['What is my bishop on c4 aiming at?', 'piece-purpose'],
    ['who controls the e5 square?', 'square-control'],
    ['what is my opponent threatening?', 'opponent-threats'],
    ['what does pushing d5 accomplish?', 'move-purpose'],
    ['is my knight on d5 safe?', 'piece-safety'],
    ['is d5 safe for my knight?', 'square-safety'],
    ['is anything hanging?', 'hanging'],
    ['is my king safe?', 'king-safety-mine'],
    ['is Nf3 a good move?', 'move-eval'],
    ["who's winning here?", 'eval'],
    ['am I up material?', 'material'],
    ['what should I play here?', 'best-move'],
    ["what's my plan?", 'my-plan'],
    ['what do the masters play here?', 'master-play'],
  ];
  for (const [ask, aspect] of cases) {
    it(`"${ask}" → ${aspect}`, () => {
      expect(classifyBoardQuestion(ask)).toBe(aspect);
    });
  }

  it('extracts entities: piece + square, no false move', () => {
    const f = extractQuestionFocus('What is my bishop on c4 aiming at?')!;
    expect(f.pieces).toEqual(['b']);
    expect(f.squares).toEqual(['c4']);
    expect(f.moves).toEqual([]);
    expect(f.side).toBe('me');
  });

  it('a bare pawn token is a SQUARE without move-context, a MOVE with it', () => {
    expect(extractQuestionFocus('who controls e5?')!.squares).toEqual(['e5']);
    expect(extractQuestionFocus('who controls e5?')!.moves).toEqual([]);
    expect(extractQuestionFocus('what happens after e5?')!.moves).toEqual(['e5']);
  });

  it('names the opponent side for an opponent-threat ask', () => {
    expect(extractQuestionFocus('what is my opponent threatening?')!.side).toBe('opponent');
  });

  it('board-ish but unmatched → scoped (never null, never a wrong bucket)', () => {
    const f = extractQuestionFocus('what should I be thinking about in this position?');
    expect(f).not.toBeNull();
    expect(f!.scoped).toBe(true);
  });

  it('a non-board question returns null (leaves other lanes / chat alone)', () => {
    expect(extractQuestionFocus('how do I import my chess.com games?')).toBeNull();
    expect(extractQuestionFocus('what is your name?')).toBeNull();
  });
});
