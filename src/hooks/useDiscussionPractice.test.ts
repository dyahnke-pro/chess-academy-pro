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
  // The good-move gate now verifies the tactic's SOURCE piece belongs to the
  // mover (findMoverTactic) — the mocked fork anchors on e4, which holds the
  // student's pawn after 1.e4 in FEN_AFTER below.
  detectTactics: vi.fn(() => ({ tactics: [{ type: 'fork', involvedSquares: ['e4', 'd5', 'f5'], description: 'mock fork' }], hangingPieces: [] })),
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
    // The POSITIVE half. Mocked at the same seam as the negative one so this
    // file stays Dexie-free; `capabilityEvidence.test.ts` proves the real
    // writer. What is asserted HERE is the thing a service test cannot see:
    // that the live surface calls it AT ALL, on every graded move, and hands
    // it the right origin.
    recordMoveEvidence: vi.fn(async () => 1),
  };
});

import { useDiscussionPractice } from './useDiscussionPractice';
import { recordMoveEvidence } from '../services/discussionPractice';
import { stockfishEngine } from '../services/stockfishEngine';
import { voiceService } from '../services/voiceService';
import { captureEvent } from '../services/analytics';

const FEN_BEFORE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** Point the engine at a before/after eval (white-perspective cp). The
 *  engine's best move defaults to d2d4 — DIFFERENT from the played e4 —
 *  because playing the engine's own best is never a slip (the 2026-08-06
 *  best-move guard), so slip fixtures must genuinely deviate. */
function setEvals(beforeCp: number, afterCp: number): void {
  const analyze = vi.mocked(stockfishEngine.analyzePosition);
  analyze.mockReset();
  analyze
    .mockResolvedValueOnce({ evaluation: beforeCp, bestMove: 'd2d4' } as never)
    .mockResolvedValueOnce({ evaluation: afterCp, bestMove: 'e7e5' } as never);
}

beforeEach(() => {
  vi.mocked(captureEvent).mockClear();
  vi.mocked(voiceService.speakForced).mockClear();
  vi.mocked(stockfishEngine.analyzePosition).mockReset();
  vi.mocked(recordMoveEvidence).mockClear();
});

describe('useDiscussionPractice — Play stays pure (non-interruptive)', () => {
  it('is inert without interruptive: no prompt on a blunder', async () => {
    setEvals(100, -300);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
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
  const opts = { surface: 'coach-teach', interruptive: true, capabilityOrigin: 'learn' } as const;

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
    // The GROUNDED reveal is narrated + shown (not the classifier's LLM note):
    // classification + the best move + the engine's why (David 2026-07-10). The
    // teaching card is used because this test does NOT pass onReveal.
    expect(result.current.teach).toMatch(/best move was/i);
    expect(result.current.teach).toMatch(/blunder|mistake/i);
    expect(voiceService.speakForced).toHaveBeenCalledWith(result.current.teach);
  });

  it('onReveal routes the reveal away + closes the picker (no teaching card)', async () => {
    setEvals(100, -200);
    const reveals: string[] = [];
    const { result } = renderHook(() =>
      useDiscussionPractice(true, { ...opts, onReveal: (t) => reveals.push(t) }),
    );
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200,
      });
    });
    await act(async () => {
      await result.current.submitReason('I wanted to attack the center');
    });
    // Pop-up gone; reveal delivered to the callback (the surface posts it to chat).
    expect(result.current.phase).toBe('idle');
    expect(result.current.prompt).toBeNull();
    expect(result.current.teach).toBeNull();
    expect(reveals).toHaveLength(1);
    expect(reveals[0]).toMatch(/best move was/i);
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

// ─── THE POSITIVE HALF IS WIRED ──────────────────────────────────────────────
// 19 modules recorded a MISS and exactly ONE recorded a HOLD — post-game
// analysis — so a capability could go RED from anywhere and could only go GREEN
// through a path most students never take. These assert the live surface now
// feeds it, which is the half that was missing.
describe('capability evidence is recorded from LIVE play', () => {
  const opts = { surface: 'coach-teach', interruptive: true, capabilityOrigin: 'learn' } as const;

  it('records on a CLEAN move — the model must see the good moves too', async () => {
    setEvals(20, 15);   // nothing lost
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true,
        gamePhase: 'opening', moveNumber: 1, sourceGameId: 'teach-abc',
      });
    });
    expect(recordMoveEvidence, 'a clean move recorded nothing — green is unreachable again')
      .toHaveBeenCalledTimes(1);
    const arg = vi.mocked(recordMoveEvidence).mock.calls[0][0];
    expect(arg.origin).toBe('learn');
    expect(arg.prompted).toBe(false);
    expect(arg.sourceGameId).toBe('teach-abc');
  });

  it('records on a BLUNDER too — the same computer, the other direction', async () => {
    setEvals(100, -200);
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true,
        gamePhase: 'opening', moveNumber: 1,
      });
    });
    expect(recordMoveEvidence).toHaveBeenCalledTimes(1);
    // The outcome is decided inside the recorder from this cpLoss, never here.
    expect(vi.mocked(recordMoveEvidence).mock.calls[0][0].cpLoss).toBeGreaterThan(0);
  });
});

/**
 * THE POSITIVE HALF ON A SURFACE THAT ALREADY GRADED THE MOVE.
 *
 * `/coach/play` stopped calling `evaluatePlayerMove` on 2026-06-04 (it ran a
 * second Stockfish pair and a second classifier that disagreed with the
 * blunder interceptor). `recordMoveEvidence` lived inside that call, so the
 * positive half went with it and the main playing surface recorded ZERO holds
 * while still declaring `capabilityOrigin: 'play'` — wired to the eye, dead in
 * fact. `recordGradedMove` is the door that takes the caller's OWN cpLoss, so
 * the fix cannot become a second analysis.
 */
describe('recordGradedMove — the door for an already-graded move', () => {
  it('records the caller\'s grade with the mount\'s origin and the game id', () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
    act(() => {
      result.current.recordGradedMove({
        fenBefore: FEN_BEFORE, playedSan: 'e4', moverColor: 'white',
        cpLoss: 0, sourceGameId: 'game-123',
      });
    });
    expect(recordMoveEvidence).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordMoveEvidence).mock.calls[0][0]).toMatchObject({
      fenBefore: FEN_BEFORE, playedSan: 'e4', moverColor: 'white',
      cpLoss: 0, origin: 'play', prompted: false, sourceGameId: 'game-123',
    });
  });

  it('NEVER analyses — an ungradeable move records nothing rather than reading as clean', () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
    act(() => {
      result.current.recordGradedMove({
        fenBefore: FEN_BEFORE, playedSan: 'e4', moverColor: 'white',
        cpLoss: null, sourceGameId: 'game-123',
      });
    });
    expect(recordMoveEvidence).not.toHaveBeenCalled();
    // The whole point of the door: unknown stays unknown, and no engine is
    // reached for it (the 2026-06-04 regression must not return).
    expect(stockfishEngine.analyzePosition).not.toHaveBeenCalled();
  });

  it('stays inert where the surface opted out of recording', () => {
    const { result } = renderHook(() =>
      useDiscussionPractice(false, { capabilityOrigin: 'play' }));
    act(() => {
      result.current.recordGradedMove({
        fenBefore: FEN_BEFORE, playedSan: 'e4', moverColor: 'white',
        cpLoss: 0, sourceGameId: 'game-123',
      });
    });
    expect(recordMoveEvidence).not.toHaveBeenCalled();
  });
});
