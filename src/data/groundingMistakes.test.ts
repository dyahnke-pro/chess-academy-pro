// GATE: every common-mistake (pitfall) must actually BE a mistake per the engine
// — the `wrongMove` has to leave the student meaningfully worse than the
// `correctMove`, and the `correctMove` must not itself be losing. Common-mistakes
// are fully hand/LLM-authored with no DB/engine backstop, so this is the gate
// that catches "we labeled a fine move a blunder" (the Vienna-class error for
// pitfalls). New violations fail; the backlog is grandfathered and shrinks only.
import { describe, it, expect } from 'vitest';
import { loadItems, toCp, sideToMove, loadBaseline, maybeWriteBaseline } from './grounding/groundingLib';

// A common-mistake is INVALID when the "wrong" move isn't actually worse — i.e.
// it evals as good as or better than the "correct" move (an INVERSION: we're
// calling a fine move a blunder). That's the unambiguous, depth-robust bar. We
// deliberately do NOT hard-gate the "wrong is only slightly worse" band — those
// are positional/instructional mistakes the engine underrates at shallow depth,
// and hard-failing them would cry wolf. (A separate review list tracks the soft
// band.) Also flag when the "correct" move itself loses.
// The "wrong" move must be CLEARLY at-least-as-good as the "correct" move to
// count as an inversion — a bare cpWrong ≥ cpCorrect over-flags the ±0.2 jitter
// a depth-14 engine has around equality (34 of 62 raw inversions were gap <0.20,
// the 2026-06-29 re-eval finding). Require a real 0.50 margin so only unambiguous
// mislabels gate; the soft 0.20–0.50 band is depth noise, not a content bug.
const INVERSION_MARGIN = 50; // wrong must be ≥ correct + 0.50 to be a real inversion
const CORRECT_LOSING = -150; // the "correct" move must not itself lose

describe('grounding gate: common-mistakes are real mistakes', () => {
  const { items } = loadItems('mistake');

  it('has the grounding data built', () => {
    expect(items.length).toBeGreaterThan(0);
  });

  it('wrongMove is engine-worse than correctMove, and correctMove is sound', () => {
    const viol: string[] = [];
    const detail: Record<string, string> = {};
    for (const it of items) {
      const key = `${it.openingId} :: ${it.wrongMove}→${it.correctMove}`;
      if (!it.fen) { viol.push(`${key} :: NO-FEN`); continue; }
      const student = sideToMove(it.fen);
      if (!it.fenWrong || !it.fenCorrect) { viol.push(`${key} :: ILLEGAL`); continue; }
      if (!it.evalWrong || !it.evalCorrect) { viol.push(`${key} :: UNEVALUATED`); continue; }
      const cpWrong = toCp(it.evalWrong, student);
      const cpCorrect = toCp(it.evalCorrect, student);
      if (cpWrong == null || cpCorrect == null) { viol.push(`${key} :: UNEVALUATED`); continue; }
      if (cpWrong - cpCorrect >= INVERSION_MARGIN) {
        const k = `${key} :: INVERTED`; viol.push(k);
        detail[k] = `wrong ${(cpWrong / 100).toFixed(2)} ≥ correct ${(cpCorrect / 100).toFixed(2)} (+${((cpWrong - cpCorrect) / 100).toFixed(2)})`;
      }
      if (cpCorrect <= CORRECT_LOSING) {
        const k = `${key} :: CORRECT-LOSING`; viol.push(k);
        detail[k] = `correct ${(cpCorrect / 100).toFixed(2)}`;
      }
    }
    if (maybeWriteBaseline('groundingMistakes', viol)) return;
    const baseline = loadBaseline('groundingMistakes');
    const fresh = viol.filter((v) => !baseline.has(v));
    expect(
      fresh,
      `NEW common-mistake grounding violations:\n` +
        fresh.map((v) => `  ${v}${detail[v] ? ` (${detail[v]})` : ''}`).join('\n'),
    ).toEqual([]);
  });
});
