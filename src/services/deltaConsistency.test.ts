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

// 🔒 BOTH CLASSIFIERS GET THE SAME CONTEXT, OR THIS COMPARES TWO CURRENCIES
// (fixed 2026-09-21 — it had been RED on `main` and nothing could see it).
//
// §8b moved move grading to chess.com's currency: EXPECTED POINTS, banded off
// the win-percentage a move gave away. `classifyCpLoss` takes the evals and so
// reads in that currency. `classifyMove` reads in it too — WHEN GIVEN the same
// three inputs; without them it keeps the centipawn bands on purpose, because
// one caller (`callInaccuracy`) genuinely has only a cpLoss and must not
// pretend to a precision it does not have.
//
// This helper passed the evals to one and not the other, so it compared a
// win-percentage verdict against a centipawn one and reported the difference
// as a drift between SURFACES. It is not: given the same context the two agree
// on every row from 40cp to 400cp. The drift this file exists to catch is real
// and this now tests for it instead of for its own asymmetry.
//
// Non-mate, non-still-winning context so both classifiers reach their bands.
const EVALS = (cp: number) => ({ evalBefore: 0, evalAfter: -cp, isWhiteMove: true });
const reviewWord = (cp: number): string => classifyCpLoss(cp, 0, -cp, true, false);
const coachWord = (cp: number): string => classifyMove({
  wasBest: false, cpLoss: cp, missedMate: null, allowedMate: null, ...EVALS(cp),
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
  // 🔒 THE BOUNDARY IS A WIN-PERCENTAGE, NOT A CENTIPAWN COUNT (2026-09-21).
  //
  // This used to assert that `INACCURACY_CP` / `MISTAKE_CP` / `BLUNDER_CP`
  // (50/100/300) were where the review turns. Since §8b they are not, and that
  // is the entire point of §8b: the SAME 300cp is an inaccuracy at +9.00 and a
  // blunder at +0.50, so a raw centipawn count cannot name a move. The review
  // turns on `INACCURACY_WIN_PCT` / `MISTAKE_WIN_PCT` / `BLUNDER_WIN_PCT`.
  //
  // The cp constants are NOT dead and must not be deleted: they answer a
  // different question — whether something is worth SAYING (`callInaccuracy`'s
  // speaking floor) — which §8b deliberately left alone. Two constants, two
  // questions; conflating them is what caused this in the first place.
  //
  // So the boundary is asserted where it now lives, in win% terms, and by
  // BEHAVIOUR: find the turn empirically and check both sides of it.
  const turnAt = (word: string): number => {
    for (let cp = 1; cp <= 1200; cp += 1) if (reviewWord(cp) === word) return cp;
    throw new Error(`the review never says "${word}" at any cpLoss — the bands are broken`);
  };
  it('is where both classifiers turn, in expected points', () => {
    for (const word of ['inaccuracy', 'mistake', 'blunder'] as const) {
      const at = turnAt(word);
      expect(reviewWord(at), `review turns ${word} at ${at}cp`).toBe(word);
      expect(coachWord(at), `the coach must turn ${word} at the SAME ${at}cp`).toBe(word);
      expect(reviewWord(at - 1), `${at - 1}cp must NOT yet be ${word}`).not.toBe(word);
      expect(coachWord(at - 1), `the coach must not be ${word} at ${at - 1}cp either`).not.toBe(word);
    }
  });

  it('the cp constants are a SPEAKING floor, not the naming boundary', () => {
    // Pinned so a future session does not "restore" them as the bands. If this
    // ever passes trivially because the two coincide, the comment above still
    // says which one owns which question.
    expect(INACCURACY_CP).toBe(50);
    expect(MISTAKE_CP).toBe(100);
    expect(BLUNDER_CP).toBe(300);
    expect(turnAt('inaccuracy'), 'the naming boundary is NOT INACCURACY_CP').not.toBe(INACCURACY_CP);
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
