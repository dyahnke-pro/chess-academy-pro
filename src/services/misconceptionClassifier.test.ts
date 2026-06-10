import { describe, it, expect } from 'vitest';
import { classifyMisconception } from './misconceptionClassifier';
import { getMisconceptionTag } from '../data/misconceptionTags';

// 100% CODE contract (thinking-error buckets, 2026-06-10; LLM removed same day
// on David's order "remove the llm"). The DETECTOR picks the tag — there is no
// model call anywhere in this path, with or without a student reason. An unsure
// slip is corrected by a one-tap re-tag in the tab, never by an LLM.
// classifyMisconception is SYNCHRONOUS (no await).

// White e4 played, Black pawn on g6: White blunders Qh5 → the g6 pawn wins it.
const HUNG_FEN = 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
// 1.e4 e5 2.Nf3 Nc6 — White grabs Nxe5?? (defended) → hangs + bad trade (tie).
const TIE_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

describe('classifyMisconception — 100% code, no LLM', () => {
  it('AUTO-TAGS a clear board blunder', () => {
    const r = classifyMisconception({ fen: HUNG_FEN, playedSan: 'Qh5', cpLossStudent: 820 });
    expect(r!.tag).toBe('hung-material');
    expect(r!.needsPicker).toBe(false);
    expect(r!.source).toBe('code');
  });

  it("coachNote is the bucket's grounded blurb (generic, no board-claim)", () => {
    const r = classifyMisconception({ fen: HUNG_FEN, playedSan: 'Qh5', cpLossStudent: 820 });
    expect(r!.coachNote).toBe(getMisconceptionTag('hung-material')!.blurb);
  });

  it('pops the PICKER when causes tie and code is unsure', () => {
    const r = classifyMisconception({ fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260 });
    expect(r!.needsPicker).toBe(true);
    expect(r!.candidates.length).toBeGreaterThanOrEqual(2);
  });

  it('a student reason does NOT trigger any LLM — code still decides (picker on a tie)', () => {
    // Pre-removal this routed the reason through a bounded LLM match. Now the
    // reason is ignored for tag selection; code's verdict stands.
    const r = classifyMisconception({
      fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260,
      userReason: 'I thought I was just winning a free pawn',
    });
    expect(r!.source).toBe('code');
    expect(r!.needsPicker).toBe(true);
    // The top candidate is code's best guess (never an LLM-invented tag).
    expect(getMisconceptionTag(r!.tag)).not.toBeNull();
  });

  it('a sound move (no real drop) needs no picker', () => {
    const r = classifyMisconception({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'e4', cpLossStudent: 5,
    });
    expect(r!.needsPicker).toBe(false);
    expect(r!.tag).toBe('none');
  });
});
