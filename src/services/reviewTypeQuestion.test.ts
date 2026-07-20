import { describe, it, expect } from 'vitest';
import { buildMoveTypeQuestion, judgeMoveTypeAnswer } from './reviewTypeQuestion';

// White up a queen; Qxd7+ is a capture-with-check.
const CAPTURE_CHECK_FEN = '4k3/3q4/8/8/8/8/3Q4/4K2R w K - 0 1';
// Back-rank mate: Ra8# (a check).
const MATE_FEN = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1';
// A quiet improving move: Nf3 develops, no capture/check.
const QUIET_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
// A plain capture, no check: exd5.
const CAPTURE_FEN = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

describe('buildMoveTypeQuestion — the TYPE, computed, honesty-gated', () => {
  it('classifies a checking move as a check (precedence over capture)', () => {
    const q = buildMoveTypeQuestion({ fen: CAPTURE_CHECK_FEN, bestUci: 'd2d7' })!;
    expect(q.answerId).toBe('check');
    expect(q.answerSan).toBe('Qxd7+');
    // the reveal names it a check AND acknowledges the capture (teaching).
    expect(q.reveal).toMatch(/check/i);
    expect(q.reveal).toMatch(/capture/i);
    // the probe never leaks the answer: no square, no SAN in the prompt.
    expect(q.prompt).not.toMatch(/d7|Qxd7/);
    expect(q.prompt).not.toMatch(/check|capture|quiet/i);
  });

  it('classifies a mate as a check', () => {
    const q = buildMoveTypeQuestion({ fen: MATE_FEN, bestUci: 'a1a8' })!;
    expect(q.answerId).toBe('check');
    expect(q.answerSan).toBe('Ra8#');
  });

  it('classifies a plain capture as a capture', () => {
    const q = buildMoveTypeQuestion({ fen: CAPTURE_FEN, bestUci: 'e4d5' })!;
    expect(q.answerId).toBe('capture');
    expect(q.answerSan).toBe('exd5');
    expect(q.reveal).toMatch(/capture/i);
  });

  it('classifies a developing move as quiet', () => {
    const q = buildMoveTypeQuestion({ fen: QUIET_FEN, bestUci: 'g1f3' })!;
    expect(q.answerId).toBe('quiet');
    expect(q.answerSan).toBe('Nf3');
    expect(q.reveal).toMatch(/quiet/i);
  });

  it('the choices are ALWAYS the same three in the same order', () => {
    const q = buildMoveTypeQuestion({ fen: QUIET_FEN, bestUci: 'g1f3' })!;
    expect(q.choices.map((c) => c.id)).toEqual(['check', 'capture', 'quiet']);
  });

  it('returns null on an unplayable best move (empty > invented)', () => {
    expect(buildMoveTypeQuestion({ fen: QUIET_FEN, bestUci: 'zz99' })).toBeNull();
    expect(buildMoveTypeQuestion({ fen: QUIET_FEN, bestUci: '' })).toBeNull();
  });

  it('judges an answer by exact type', () => {
    const q = buildMoveTypeQuestion({ fen: MATE_FEN, bestUci: 'a1a8' })!;
    expect(judgeMoveTypeAnswer(q, 'check')).toBe(true);
    expect(judgeMoveTypeAnswer(q, 'capture')).toBe(false);
    expect(judgeMoveTypeAnswer(q, 'quiet')).toBe(false);
  });
});
