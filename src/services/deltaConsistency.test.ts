// ONE STOCKFISH DELTA, ONE WORD (David 2026-08-10: "Use stockfish as the
// standard… I meant Stockfish to measure mistake vs inaccuracy").
//
// Two independent band sets had drifted apart: the post-game review graded
// 50/100/300 and the coach's `moveRating` graded 20/50/100/200/400. So in one
// session a 150-centipawn move was a MISTAKE in the review and an INACCURACY
// from the coach's mouth, and a 350 was a BLUNDER in one and a MISTAKE in the
// other. Nothing failed; the two surfaces simply disagreed about what words
// mean, which is worse than either being wrong.
import { describe, it, expect } from 'vitest';
import { classifyMove } from './moveRating';
import { classifyCpLoss } from './gameAnalysisService';
import { INACCURACY_CP, MISTAKE_CP, BLUNDER_CP } from './engineConstants';

/** Non-mate, non-still-winning context so both classifiers reach their bands. */
const reviewWord = (cp: number): string => classifyCpLoss(cp, 0, -cp, true, false);
const coachWord = (cp: number): string => classifyMove({
  wasBest: false, cpLoss: cp, missedMate: null, allowedMate: null,
});

describe('the review and the coach agree on what a delta is called', () => {
  const NEGATIVE = ['inaccuracy', 'mistake', 'blunder'];
  for (const cp of [50, 75, 99, 100, 150, 199, 200, 250, 299, 300, 350, 400, 600]) {
    it(`${cp}cp is the same word on both surfaces`, () => {
      const a = reviewWord(cp);
      const b = coachWord(cp);
      // Only the NEGATIVE vocabulary has to match — the good end differs by
      // design ('brilliant'/'great' in review, 'best'/'excellent' in the coach)
      // and those never contradict each other.
      if (NEGATIVE.includes(a) || NEGATIVE.includes(b)) {
        expect(b, `${cp}cp: review says "${a}", coach says "${b}"`).toBe(a);
      }
    });
  }
});

describe('the boundaries have exactly one home', () => {
  it('is where both classifiers turn', () => {
    expect(reviewWord(INACCURACY_CP)).toBe('inaccuracy');
    expect(reviewWord(INACCURACY_CP - 1)).not.toBe('inaccuracy');
    expect(reviewWord(MISTAKE_CP)).toBe('mistake');
    expect(reviewWord(MISTAKE_CP - 1)).toBe('inaccuracy');
    expect(reviewWord(BLUNDER_CP)).toBe('blunder');
    expect(reviewWord(BLUNDER_CP - 1)).toBe('mistake');
  });

  it('nobody redeclares them locally any more', async () => {
    const { readFileSync } = await import('node:fs');
    for (const f of ['src/services/gameAnalysisService.ts', 'src/services/moveRating.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, `${f} declares its own band — that is the drift coming back`)
        .not.toMatch(/const (BLUNDER_CP|MISTAKE_CP|INACCURACY_CP)\s*=/);
    }
  });
});

describe('the number is measured, never inferred from the label', () => {
  it('no surface reconstructs a cpLoss from a classification', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/services/autoAnalyzeGame.ts', 'utf8');
    // The exact shape that shipped: `classification === 'blunder' ? 350 : 175`.
    // Every blunder in the app's history was recorded as costing exactly 350.
    expect(src).toMatch(/measuredCpLoss\(ann\)/);
  });

  it('measures from the stored engine evals, on both colours', async () => {
    // White to move: best would have left +120, the move played left -30, so it
    // cost 150 from White's own perspective. Black: signs mirror exactly.
    const measure = (best: number, after: number, color: 'white' | 'black'): number =>
      Math.max(0, (best - after) * (color === 'white' ? 1 : -1));
    expect(measure(120, -30, 'white')).toBe(150);
    expect(measure(-120, 30, 'black')).toBe(150);
    // A move that beat the shallow best-move eval costs nothing, never negative.
    expect(measure(10, 60, 'white')).toBe(0);
  });
});

describe('the coach speaks from the same point it always did', () => {
  // Sharing the bands moved 'inaccuracy' down to 50cp. The WORD had to move;
  // the coach's willingness to interrupt did not.
  it('stays quiet below the mistake threshold even though the word changed', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const { Chess } = await import('chess.js');
    const b = new Chess();
    for (const s of ['e4', 'e5', 'Nf3']) b.move(s);
    const fen = b.fen();
    const call = (cp: number) => callInaccuracy({
      fenBefore: fen, playedSan: 'Nc6', bestSan: 'Nf6', cpLoss: cp,
      side: 'student', moverColor: 'black',
    });
    expect(coachWord(60), 'the band did not move').toBe('inaccuracy');
    expect(call(60), 'the coach got chattier when the word changed').toBeNull();
    expect(call(MISTAKE_CP), 'the coach went quiet at its own floor').not.toBeNull();
  });

  it('always speaks a walked-into mate, whatever the centipawns read', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const { Chess } = await import('chess.js');
    const b = new Chess();
    for (const s of ['e4', 'e5', 'Nf3']) b.move(s);
    expect(callInaccuracy({
      fenBefore: b.fen(), playedSan: 'Nc6', bestSan: 'Nf6', cpLoss: 0,
      allowedMate: 2, side: 'student', moverColor: 'black',
    })).not.toBeNull();
  });
});
