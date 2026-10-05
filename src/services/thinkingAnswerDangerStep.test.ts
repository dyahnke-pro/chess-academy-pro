import { describe, it, expect } from 'vitest';
import { answerDangerKey, answerDangerKit, answerDangerPrompt, answerDangerReason, answerDangerWrongTapLine, pieceInDanger } from './thinkingAnswerDangerStep';

// White bishop on c4 attacked by the black rook on c8, unguarded. Its legal
// squares: b5 a6 d5 e6 f7 g8? b3 a2 d3 e2 f1. On the c-file it stays attacked
// nowhere (it leaves the file). Black rook c8 also covers the 8th rank.
const DANGER = '2r1k3/8/8/8/2B5/8/8/4K3 w - - 0 1';

describe('step 4 — answer the danger', () => {
  it('finds the one piece in danger', () => {
    expect(pieceInDanger(DANGER)).toBe('c4');
  });
  it('the key is every square where it is safe', () => {
    const key = answerDangerKey(DANGER)?.key ?? [];
    expect(key).toContain('d3');
    expect(key).not.toContain('f7'); // their king on e8 covers f7
  });
  it('a board with no piece in danger is not used', () => {
    expect(answerDangerKey('4k3/8/8/8/8/8/8/R3K3 w - - 0 1')).toBeNull();
  });
  it('words', () => {
    expect(answerDangerReason(DANGER, 'd3')).toMatch(/On d3 nothing of theirs attacks your bishop/);
    expect(answerDangerWrongTapLine(DANGER, 'h1')).toMatch(/cannot reach/);
    for (let i = 0; i < 2; i++) expect(answerDangerPrompt(i)).not.toMatch(/\d|two|three/i);
    expect(answerDangerKit().step).toBe('answer-danger');
  });
});
