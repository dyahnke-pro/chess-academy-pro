import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Heavy deps mocked so the hook's DECISION logic (rating gate, good-vs-slip
// routing, response logging) is tested in isolation — no engine, no audio, no
// Dexie. The real logic under test is in useDiscussionPractice itself.
vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: vi.fn() },
}));
vi.mock('../services/voiceService', () => ({
  voiceService: { speakForced: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../services/analytics', () => ({ captureEvent: vi.fn() }));
vi.mock('../services/tacticsDetector', () => ({
  detectTactics: vi.fn(() => ({ tactics: [{ type: 'fork' }], hangingPieces: [] })),
}));
vi.mock('../services/discussionPractice', async (importActual) => {
  const actual = await importActual<typeof import('../services/discussionPractice')>();
  return {
    ...actual,
    captureMisconception: vi.fn(async () => ({
      classification: { tag: 'missed-tactic', coachNote: 'note' },
      coachNote: 'note',
      logged: true,
      record: { tag: 'missed-tactic' },
    })),
  };
});

import { useDiscussionPractice } from './useDiscussionPractice';
import { stockfishEngine } from '../services/stockfishEngine';
import { voiceService } from '../services/voiceService';
import { captureEvent } from '../services/analytics';

const FEN_BEFORE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** Point the engine at a before/after eval (white-perspective cp). */
function setEvals(beforeCp: number, afterCp: number): void {
  const analyze = vi.mocked(stockfishEngine.analyzePosition);
  analyze.mockReset();
  analyze
    .mockResolvedValueOnce({ evaluation: beforeCp, bestMove: 'e2e4' } as never)
    .mockResolvedValueOnce({ evaluation: afterCp, bestMove: 'e7e5' } as never);
}

beforeEach(() => {
  vi.mocked(captureEvent).mockClear();
  vi.mocked(voiceService.speakForced).mockClear();
  vi.mocked(stockfishEngine.analyzePosition).mockReset();
});

describe('useDiscussionPractice — Play stays pure (non-interruptive)', () => {
  it('is inert without interruptive: no prompt on a blunder', async () => {
    setEvals(100, -300);
    const { result } = renderHook(() => useDiscussionPractice(true));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
      });
    });
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
    expect(captureEvent).not.toHaveBeenCalled();
  });
});

describe('useDiscussionPractice — Learn (interruptive)', () => {
  const opts = { surface: 'coach-teach', interruptive: true } as const;

  it('SLIP opens the blocking picker and logs the response with its bucket', async () => {
    setEvals(100, -200); // white loses 300cp → blunder
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200,
      });
    });
    expect(result.current.phase).toBe('asking');
    expect(result.current.prompt?.kind).toBe('slip');
    expect(result.current.goodMove).toBeNull();

    await act(async () => {
      await result.current.submitReason('I wanted to attack the center');
    });
    const call = vi.mocked(captureEvent).mock.calls.find((c) => c[0] === 'discussion_response');
    expect(call).toBeTruthy();
    expect(call?.[1]).toMatchObject({
      kind: 'slip',
      response_mode: 'typed',
      was_hint: false,
      logged_tag: 'missed-tactic',
      bucket: 'tactical',
    });
    // The grounded reveal is NARRATED after the student commits (not just shown).
    expect(voiceService.speakForced).toHaveBeenCalledWith('note');
    expect(result.current.teach).toBe('note');
  });

  it('records response_mode=hint when the student taps Hint', async () => {
    setEvals(100, -200);
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200,
      });
    });
    await act(async () => { await result.current.submitReason('__HINT__'); });
    const call = vi.mocked(captureEvent).mock.calls.find((c) => c[0] === 'discussion_response');
    expect(call?.[1]).toMatchObject({ response_mode: 'hint', was_hint: true });
  });

  it('GOOD move fires a non-blocking spoken line — NO picker', async () => {
    setEvals(30, 25); // near-best (5cp), and detectTactics is mocked to a fork
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200,
      });
    });
    expect(result.current.prompt).toBeNull();          // no blocking picker
    expect(result.current.phase).toBe('idle');
    expect(result.current.goodMove?.playedSan).toBe('e4');
    expect(voiceService.speakForced).toHaveBeenCalledTimes(1);
    const good = vi.mocked(captureEvent).mock.calls.find((c) => c[0] === 'discussion_good_move');
    expect(good).toBeTruthy();
  });

  it('raiseSlipPrompt opens the picker from known review data (no engine)', async () => {
    // Post-game review hands in a known mistake — no analyzePosition call needed.
    const { result } = renderHook(() => useDiscussionPractice(true, { ...opts, source: 'game-review' }));
    act(() => {
      result.current.raiseSlipPrompt({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        bestSan: 'd4', cpLoss: 200, shouldCount: true, gamePhase: 'opening',
        studentRating: 1500,
      });
    });
    expect(result.current.phase).toBe('asking');
    expect(result.current.prompt?.kind).toBe('slip');
    expect(vi.mocked(stockfishEngine.analyzePosition)).not.toHaveBeenCalled();

    await act(async () => { await result.current.submitReason('I opened the center'); });
    const call = vi.mocked(captureEvent).mock.calls.find((c) => c[0] === 'discussion_response');
    expect(call?.[1]).toMatchObject({ surface: 'coach-teach', kind: 'slip' });
    expect(voiceService.speakForced).toHaveBeenCalled(); // reveal narrated
  });

  it('is RATING-ADAPTIVE: a 120cp mistake interrupts a 1200 but not an 800', async () => {
    // Beginner (800) — bar is blunders only, so a mistake does NOT interrupt.
    setEvals(100, -20); // 120cp loss = mistake
    const beginner = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await beginner.result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 800,
      });
    });
    expect(beginner.result.current.prompt).toBeNull();

    // Intermediate (1200) — bar is mistakes, so the same move DOES interrupt.
    setEvals(100, -20);
    const inter = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await inter.result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200,
      });
    });
    expect(inter.result.current.prompt?.kind).toBe('slip');
  });
});
