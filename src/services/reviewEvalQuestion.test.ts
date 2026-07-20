import { describe, it, expect } from 'vitest';
import { buildEvalQuestion, bucketForStudentCp, judgeEvalAnswer } from './reviewEvalQuestion';

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('bucketForStudentCp', () => {
  it('maps magnitudes to the five buckets (student-POV cp)', () => {
    expect(bucketForStudentCp(500)).toBe('winning-you');
    expect(bucketForStudentCp(150)).toBe('better-you');
    expect(bucketForStudentCp(0)).toBe('equal');
    expect(bucketForStudentCp(-150)).toBe('better-them');
    expect(bucketForStudentCp(-500)).toBe('winning-them');
  });

  it('near-zero is equal (both directions of the equal band)', () => {
    expect(bucketForStudentCp(59)).toBe('equal');
    expect(bucketForStudentCp(-59)).toBe('equal');
    expect(bucketForStudentCp(60)).toBe('better-you');
    expect(bucketForStudentCp(-60)).toBe('better-them');
  });
});

describe('buildEvalQuestion (guess-the-eval, G0)', () => {
  it('flips the white-POV eval to the student POV for a Black student', () => {
    // White is +200 (white-POV). For a BLACK student that's -200 → their opponent better.
    const q = buildEvalQuestion({ fen: FEN, evalCp: 200, studentColor: 'black' });
    expect(q).not.toBeNull();
    expect(q!.answerId).toBe('better-them');
  });

  it('keeps white-POV as student-POV for a White student', () => {
    const q = buildEvalQuestion({ fen: FEN, evalCp: 200, studentColor: 'white' });
    expect(q!.answerId).toBe('better-you');
  });

  it('returns null when there is no eval to ground the question on', () => {
    expect(buildEvalQuestion({ fen: FEN, evalCp: null, studentColor: 'white' })).toBeNull();
    expect(buildEvalQuestion({ fen: FEN, evalCp: Infinity, studentColor: 'white' })).toBeNull();
  });

  it('always offers the SAME five choices in the same order (no answer leak)', () => {
    const a = buildEvalQuestion({ fen: FEN, evalCp: 500, studentColor: 'white' })!;
    const b = buildEvalQuestion({ fen: FEN, evalCp: -500, studentColor: 'white' })!;
    expect(a.choices.map((c) => c.id)).toEqual(b.choices.map((c) => c.id));
    expect(a.choices).toHaveLength(5);
  });

  it('the prompt reveals nothing about who is better or the magnitude', () => {
    const q = buildEvalQuestion({ fen: FEN, evalCp: 500, studentColor: 'white' })!;
    expect(q.prompt).not.toMatch(/winning|better|equal|pawn|\d/i);
  });

  it('the reveal states the true magnitude (grounded) for a real edge', () => {
    const q = buildEvalQuestion({ fen: FEN, evalCp: 140, studentColor: 'white' })!;
    expect(q.answerId).toBe('better-you');
    expect(q.reveal).toMatch(/1\.4 pawns/);
  });

  it('a decisive/mate-ish score reads as decisive, not a pawn count', () => {
    const q = buildEvalQuestion({ fen: FEN, evalCp: 5000, studentColor: 'white' })!;
    expect(q.answerId).toBe('winning-you');
    expect(q.reveal).toMatch(/decisive|winning/i);
  });

  it('judges an answer by exact bucket match', () => {
    const q = buildEvalQuestion({ fen: FEN, evalCp: 0, studentColor: 'white' })!;
    expect(judgeEvalAnswer(q, 'equal')).toBe(true);
    expect(judgeEvalAnswer(q, 'better-you')).toBe(false);
  });
});
