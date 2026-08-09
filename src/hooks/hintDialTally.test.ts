// The hint dial has to move on moves that never raise a card.
//
// David 2026-08-09: "We can use the amount of times the user finds the right
// move and adjust the hint accordingly." Which means the tally has to see EVERY
// evaluated move — including the ones that pass silently, which is most of
// them. A dial fed only by moves that interrupted would be reading a filtered
// sample of the student's worst play and would sit at "obvious" forever.
//
// This is the same coupling `learnSilentCapture.test.ts` pins for the mistake
// record, one layer over: what the coach REMEMBERS about the student must never
// be a side effect of what it happened to SHOW.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { captureMisconception, analyze } = vi.hoisted(() => ({
  captureMisconception: vi.fn(async () => ({ classification: null, coachNote: '', logged: false })),
  analyze: vi.fn(),
}));

vi.mock('../services/discussionPractice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/discussionPractice')>()),
  captureMisconception,
}));

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzeWithBudget: analyze,
    analyzePosition: analyze,
    isReady: (): boolean => true,
  },
}));

vi.mock('../services/voiceService', () => ({
  voiceService: { speakForced: vi.fn(async () => undefined), stop: vi.fn(), speak: vi.fn(async () => undefined) },
}));

/** Black to move; a quiet position with a best move available. The engine is
 *  stubbed, so the FENs only need to be legal and distinct. */
const BEFORE = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

const move = (over: Record<string, unknown> = {}) => ({
  fenBefore: BEFORE,
  fenAfter: AFTER,
  playedSan: 'Nf6',
  gamePhase: 'opening' as const,
  moveNumber: 2,
  playerColor: 'black' as const,
  inBook: false,
  learned: true,
  ...over,
});

/** White-perspective evals. Black to move at 0; `after` is what White is worth
 *  once Black has moved, so `after` cp IS Black's loss. */
const evalsShedding = (cp: number) => async (fen: string) => (fen === BEFORE
  ? { evaluation: 0, bestMove: 'b8c6', isMate: false, topLines: [{ moves: ['b8c6'] }] }
  : { evaluation: cp, bestMove: 'f3e5', isMate: false, topLines: [{ moves: ['f3e5'] }] });

describe('the hint dial reads every evaluated move', () => {
  beforeEach(() => vi.clearAllMocks());

  it('backs off for a student who keeps finding the move — with no card ever shown', async () => {
    analyze.mockImplementation(evalsShedding(0)); // best move every time
    const { useDiscussionPractice } = await import('./useDiscussionPractice');
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach' }));

    expect(result.current.hintDial.register).toBe('moderate');

    for (let i = 0; i < 3; i += 1) {
      // `act` so the dial's state update is flushed into `result.current` —
      // without it every assertion below reads the seed value and the test
      // passes or fails on the harness rather than on the code.
      await act(async () => { await result.current.evaluatePlayerMove({ ...move(), studentRating: 1200 }); });
    }

    expect(
      result.current.hintDial.register,
      'three found moves and the coach is still spelling things out',
    ).toBe('subtle');
    expect(result.current.prompt, 'nothing should have interrupted').toBeNull();
  }, 20_000);

  it('spells it out for a student who keeps missing, below the interruption bar', async () => {
    // 150cp at 800 rated: `slipWarrantsInterjection` is FALSE, so not one of
    // these raises a card. The dial must still hear them — this is exactly the
    // beginner the obvious register exists for.
    analyze.mockImplementation(evalsShedding(150));
    const { useDiscussionPractice } = await import('./useDiscussionPractice');
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach' }));

    for (let i = 0; i < 3; i += 1) {
      await act(async () => { await result.current.evaluatePlayerMove({ ...move(), studentRating: 800 }); });
    }

    expect(result.current.prompt, 'a 150cp slip must not interrupt an 800').toBeNull();
    expect(
      result.current.hintDial.register,
      'the dial never heard the misses because they were below the interruption bar',
    ).toBe('obvious');
  }, 20_000);

  it('seeds from the rating that arrives with the first move', async () => {
    // The rating is a per-move argument, not a construction option, so the dial
    // opens at 'moderate' and has to re-seed on first use or a 2400 gets the
    // beginner's opening register.
    analyze.mockImplementation(evalsShedding(0));
    const { useDiscussionPractice } = await import('./useDiscussionPractice');
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach' }));

    await act(async () => { await result.current.evaluatePlayerMove({ ...move(), studentRating: 2400 }); });
    expect(result.current.hintDial.register).toBe('subtle');
  }, 20_000);

  it('does not count following the coach\'s own book move as finding it', async () => {
    // Otherwise a prepared line talks the register up to subtle right before
    // the student reaches the middlegame, where they need the help most.
    analyze.mockImplementation(evalsShedding(0));
    const { useDiscussionPractice } = await import('./useDiscussionPractice');
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach' }));

    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await result.current.evaluatePlayerMove({
          ...move({ inBook: true, bookMoveSan: 'Nf6' }),
          studentRating: 1200,
        });
      });
    }

    expect(result.current.hintDial.recent, 'book moves entered the tally').toHaveLength(0);
    expect(result.current.hintDial.register).toBe('moderate');
  }, 20_000);
});
