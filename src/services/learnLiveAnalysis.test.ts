// B7(c): a Learn game's live grades become the saved analysis — annotations
// with real evaluations, and `fullyAnalyzed` only when EVERY student ply was
// graded. Negative control: make `learnGameAnalysis` return
// `fullyAnalyzed: grades.size > 0` → the incomplete-coverage test fails.
import { describe, it, expect } from 'vitest';
import { learnGameAnalysis, evalAfterFromGrade, type LiveStudentGrade } from './learnLiveAnalysis';

const HISTORY = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5'];
const grade = (ply: number, san: string, preEval: number, cpLoss: number): [number, LiveStudentGrade] =>
  [ply, { ply, san, preEvalCpWhitePov: preEval, cpLossCp: cpLoss, fenAfter: `fen-after-${ply}` }];

describe('learnGameAnalysis', () => {
  it('every student ply graded → annotations carry the live evals and the game is fullyAnalyzed', () => {
    const grades = new Map<number, LiveStudentGrade>([grade(1, 'e4', 30, 0), grade(3, 'Nf3', 25, 0), grade(5, 'Bc4', 20, 0), grade(7, 'Ng5', 15, 60)]);
    const r = learnGameAnalysis(grades, HISTORY, 'white');
    expect(r.fullyAnalyzed).toBe(true);
    expect(r.annotations).toHaveLength(4);
    const ng5 = r.annotations!.find((a) => a.san === 'Ng5')!;
    expect(ng5.color).toBe('white');
    expect(ng5.bestMoveEval).toBe(15);
    expect(ng5.evaluation).toBe(15 - 60); // White lost 60: the white-POV number FALLS
    expect(ng5.classification).toBe('inaccuracy');
  });

  it('one ungraded student ply → the annotations are kept but the game is NOT fullyAnalyzed', () => {
    const grades = new Map<number, LiveStudentGrade>([grade(1, 'e4', 30, 0), grade(3, 'Nf3', 25, 0), grade(5, 'Bc4', 20, 0)]); // ply 7 missing
    const r = learnGameAnalysis(grades, HISTORY, 'white');
    expect(r.fullyAnalyzed).toBe(false);
    expect(r.annotations).toHaveLength(3);
  });

  it('a black student loses when the white-POV number RISES', () => {
    expect(evalAfterFromGrade({ preEvalCpWhitePov: -20, cpLossCp: 150 }, 'black')).toBe(130);
    expect(evalAfterFromGrade({ preEvalCpWhitePov: -20, cpLossCp: 150 }, 'white')).toBe(-170);
    const r = learnGameAnalysis(new Map([grade(2, 'e5', 30, 0), grade(4, 'Nc6', 25, 0), grade(6, 'Nf6', 20, 0), grade(8, 'd5', 10, 300)]), HISTORY, 'black');
    expect(r.fullyAnalyzed).toBe(true);
    expect(r.annotations!.find((a) => a.san === 'd5')!.evaluation).toBe(310);
  });

  it('no student plies → nothing to claim', () => {
    expect(learnGameAnalysis(new Map(), [], 'white')).toEqual({ annotations: null, fullyAnalyzed: false });
  });
});
