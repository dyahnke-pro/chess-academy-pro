import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyMisconception } from './misconceptionClassifier';
import { getCoachChatResponse } from './coachApi';
import { getMisconceptionTag } from '../data/misconceptionTags';

// CODE-FIRST contract (thinking-error buckets, 2026-06-10): the DETECTOR picks
// the tag, not the LLM. The LLM is only called to MATCH a student's free-text
// reason to the code-computed candidate set (bounded — it can't invent a tag).
vi.mock('./coachApi', () => ({ getCoachChatResponse: vi.fn() }));
const mockedLlm = vi.mocked(getCoachChatResponse);

// White e4 played, Black pawn on g6: White blunders Qh5 → the g6 pawn wins it.
const HUNG_FEN = 'rnbqkbnr/pppppp1p/6p1/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
// 1.e4 e5 2.Nf3 Nc6 — White grabs Nxe5?? (defended) → hangs + bad trade (tie).
const TIE_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

beforeEach(() => mockedLlm.mockReset());

describe('classifyMisconception — code-first', () => {
  it('AUTO-TAGS a clear board blunder with NO LLM call', async () => {
    const r = await classifyMisconception({ fen: HUNG_FEN, playedSan: 'Qh5', cpLossStudent: 820 });
    expect(r!.tag).toBe('hung-material');
    expect(r!.needsPicker).toBe(false);
    expect(r!.source).toBe('code');
    expect(mockedLlm).not.toHaveBeenCalled(); // code decided — no model call
  });

  it("coachNote is the bucket's grounded blurb (generic, no board-claim)", async () => {
    const r = await classifyMisconception({ fen: HUNG_FEN, playedSan: 'Qh5', cpLossStudent: 820 });
    expect(r!.coachNote).toBe(getMisconceptionTag('hung-material')!.blurb);
  });

  it('pops the PICKER (no LLM) when causes tie and there is no student reason', async () => {
    const r = await classifyMisconception({ fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260 });
    expect(r!.needsPicker).toBe(true);
    expect(r!.candidates.length).toBeGreaterThanOrEqual(2);
    expect(mockedLlm).not.toHaveBeenCalled();
  });

  it('a BOUNDED LLM maps the student reason to a candidate (in-set only)', async () => {
    mockedLlm.mockResolvedValueOnce('bad-trade'); // an id that IS in the candidate set
    const r = await classifyMisconception({
      fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260,
      userReason: 'I thought I was just winning a free pawn',
    });
    expect(r!.tag).toBe('bad-trade');
    expect(r!.source).toBe('reason');
    expect(r!.needsPicker).toBe(false);
    expect(mockedLlm).toHaveBeenCalledTimes(1);
  });

  it('REJECTS an LLM reply that is not in the candidate set → falls to the picker', async () => {
    mockedLlm.mockResolvedValueOnce('left-book-early'); // NOT a candidate for this slip
    const r = await classifyMisconception({
      fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260, userReason: 'whatever',
    });
    expect(r!.needsPicker).toBe(true); // gate rejected the off-set tag
    expect(r!.tag).not.toBe('left-book-early');
  });

  it('the bounded match skips personality + uses the cheap task', async () => {
    mockedLlm.mockResolvedValueOnce('bad-trade');
    await classifyMisconception({ fen: TIE_FEN, playedSan: 'Nxe5', cpLossStudent: 260, userReason: 'free pawn' });
    const [, , , task, , , , skipPersonality] = mockedLlm.mock.calls[0];
    expect(task).toBe('bad_habit_report');
    expect(skipPersonality).toBe(true);
  });

  it('a sound move (no real drop) needs no picker and no LLM', async () => {
    const r = await classifyMisconception({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playedSan: 'e4', cpLossStudent: 5,
    });
    expect(r!.needsPicker).toBe(false);
    expect(r!.tag).toBe('none');
    expect(mockedLlm).not.toHaveBeenCalled();
  });
});
