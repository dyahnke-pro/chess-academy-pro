import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '../db/schema';
import { remember, recallData } from '../services/studentMemory';

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

// The one strength estimate, mocked so a test asserts the WIRE (the graded
// move reached it) — `gameStrength.test.ts` and `liveStrength.test.ts` own
// what it does with the move.
vi.mock('../services/gameStrength', () => ({ recordStrengthMove: vi.fn(async () => {}) }));

import { useDiscussionPractice } from './useDiscussionPractice';
import { recordStrengthMove } from '../services/gameStrength';
import { recordMoveEvidence } from '../services/discussionPractice';
import { stockfishEngine } from '../services/stockfishEngine';
import { voiceService } from '../services/voiceService';
import { captureEvent } from '../services/analytics';
import { clearMovePriceMemo } from '../services/playedMoveGrade';

const FEN_BEFORE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

/** Point the engine at a before/after eval (white-perspective cp). The
 *  engine's best move defaults to d2d4 — DIFFERENT from the played e4 —
 *  because playing the engine's own best is never a slip (the 2026-08-06
 *  best-move guard), so slip fixtures must genuinely deviate. */
function setEvals(beforeCp: number, afterCp: number): void {
  const analyze = vi.mocked(stockfishEngine.analyzePosition);
  analyze.mockReset();
  // The record prices the move in ONE search (#2 root cause 4): the read
  // before names the best move; a `searchmoves` ask scores best and played
  // together — best at the read before, played at the read after.
  analyze.mockImplementation(((fen: string, _depth: number, o?: { searchmoves?: string }) => {
    if (o?.searchmoves) {
      const [best, played] = o.searchmoves.split(' ');
      return Promise.resolve({ evaluation: beforeCp, bestMove: best, isMate: false, mateIn: null, depth: 99, topLines: [
        { rank: 1, moves: [best], evaluation: beforeCp, mate: null },
        { rank: 2, moves: [played], evaluation: afterCp, mate: null },
      ] });
    }
    return Promise.resolve(fen === FEN_BEFORE
      ? { evaluation: beforeCp, bestMove: 'd2d4', isMate: false, mateIn: null, depth: 99, topLines: [{ rank: 1, moves: ['d2d4'], evaluation: beforeCp, mate: null }] }
      : { evaluation: afterCp, bestMove: 'e7e5', isMate: false, mateIn: null, depth: 99, topLines: [] });
  }) as never);
}

beforeEach(() => {
  vi.mocked(captureEvent).mockClear();
  vi.mocked(voiceService.speakForced).mockClear();
  vi.mocked(stockfishEngine.analyzePosition).mockReset();
  vi.mocked(recordMoveEvidence).mockClear();
  clearMovePriceMemo();
});

describe('useDiscussionPractice — Play stays pure (non-interruptive)', () => {
  it('is inert without interruptive: no prompt on a blunder', async () => {
    setEvals(100, -300);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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
        prompted: false,
        coachMade: false,
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

  it('a move made right after the coach announced the moment is recorded as PROMPTED', async () => {
    setEvals(20, 15);
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: true,
        coachMade: false,
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true,
        gamePhase: 'opening', moveNumber: 1, sourceGameId: 'teach-abc',
      });
    });
    expect(vi.mocked(recordMoveEvidence).mock.calls[0][0].prompted).toBe(true);
  });

  it('records on a BLUNDER too — the same computer, the other direction', async () => {
    setEvals(100, -200);
    const { result } = renderHook(() => useDiscussionPractice(true, opts));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false,
        coachMade: false,
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
        cpLoss: 0, sourceGameId: 'game-123', seedRating: 400, evalBeforeMover: 20,
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
        cpLoss: null, sourceGameId: 'game-123', seedRating: 400, evalBeforeMover: 20,
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
        cpLoss: 0, sourceGameId: 'game-123', seedRating: 400, evalBeforeMover: 20,
      });
    });
    expect(recordMoveEvidence).not.toHaveBeenCalled();
  });
});


/**
 * ONE ENGINE STRENGTH (P0b, 2026-10-04). The live estimate used to move only
 * through `recordGradedMove`, which only Play calls — so Learn and the WLPP
 * Play rung matched their opponent to a number that never moved. The graded
 * move `evaluatePlayerMove` already computes now moves it too (no second
 * analysis), keyed on the game, or on the surface's session when no game
 * record exists.
 */
describe('evaluatePlayerMove moves the student\'s strength estimate', () => {
  beforeEach(() => { vi.mocked(recordStrengthMove).mockClear(); });

  it('hands the graded move to the one estimate, for the game it belongs to (Learn)', async () => {
    setEvals(20, 20);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'learn', interruptive: false }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false, coachMade: false, fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: false, gamePhase: 'opening',
        studentRating: 900, sourceGameId: 'learn-game-1',
      });
    });
    expect(recordStrengthMove).toHaveBeenCalledTimes(1);
    const [gameId, seed, move] = vi.mocked(recordStrengthMove).mock.calls[0];
    expect(gameId).toBe('learn-game-1');
    expect(seed).toBe(900);
    expect(move).toMatchObject({ fenBefore: FEN_BEFORE, playedSan: 'e4', cpLoss: 0, evalBeforeMover: 20, prompted: false, coachMade: false });
  });

  it('the surface\'s own answers reach the estimate: told before the move, a chance the coach made', async () => {
    setEvals(20, 20);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'learn', interruptive: false }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: true, coachMade: true, fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: false, gamePhase: 'opening',
        studentRating: 900, sourceGameId: 'learn-game-2',
      });
    });
    expect(vi.mocked(recordStrengthMove).mock.calls[0][2]).toMatchObject({ prompted: true, coachMade: true });
  });

  it('keys on the surface session when there is no saved game (WLPP Play rung)', async () => {
    setEvals(20, -200);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false, coachMade: false, fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
        studentRating: 1200, liveSessionId: 'opening-play:1',
      });
    });
    expect(vi.mocked(recordStrengthMove).mock.calls[0][0]).toBe('opening-play:1');
  });

  it('moves nothing with no game, no session or no seed to start from', async () => {
    setEvals(20, 20);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'drill' }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false, coachMade: false, fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening',
      });
    });
    expect(recordStrengthMove).not.toHaveBeenCalled();
  });
});

describe('useDiscussionPractice — ONE hint dial across surfaces and sessions (persistent memory)', () => {
  beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

  it('a surface starts from the dial the last surface left, not the rating', async () => {
    await remember('hint-dial', 'student', { register: 'subtle', recent: [true, true, true] });
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'learn' }));
    await waitFor(() => expect(result.current.hintDial.register).toBe('subtle'));
  });

  it('a Play move moves the remembered dial (computed, not dropped)', async () => {
    setEvals(100, -300);
    const { result } = renderHook(() => useDiscussionPractice(true, { capabilityOrigin: 'play' }));
    await act(async () => {
      await result.current.evaluatePlayerMove({
        prompted: false,
        coachMade: false,
        fenBefore: FEN_BEFORE, fenAfter: FEN_AFTER, playedSan: 'e4',
        playerColor: 'white', inBook: false, learned: true, gamePhase: 'opening', studentRating: 1500,
      });
    });
    await waitFor(async () => expect((await recallData('hint-dial', 'student'))?.recent).toEqual([false]));
  });
});
