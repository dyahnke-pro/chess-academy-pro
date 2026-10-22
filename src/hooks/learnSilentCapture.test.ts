// A mistake must be RECORDED whether or not anything is shown for it.
//
// David 2026-08-05, approving the removal of the mid-game cards: "1, but need to
// verify that mistakes are captured correctly." This is that verification, and
// it turned out to be load-bearing rather than ceremonial — recording was a side
// effect of the pop-up, so removing the pop-up would have silently starved My
// Mistakes, the Tactics drill queue and the weakness spine.
//
// Two couplings existed, both fixed in `useDiscussionPractice.evaluatePlayerMove`:
//
//   1. The only routes to `captureMisconception` were answering the card or
//      playing through it, and both require `ctxRef` to have been armed. A slip
//      that never raised a card was never recorded at all.
//   2. `slipWarrantsInterjection` — a RATING-ADAPTIVE bar for whether to
//      INTERRUPT (beginner→blunders, advanced→inaccuracies) — sat in front of
//      the early return, so it also decided what got remembered. A beginner's
//      150cp mistake fell under the bar and never reached their own drill queue.
//
// `mistakePuzzleCapture.test` covers the writer. Nothing covered REACHING it.
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderHook } from '@testing-library/react';

// `vi.hoisted` — vi.mock is hoisted above every import, so a factory that
// closes over a plain `const` hits its temporal dead zone and the module never
// resolves (the test just times out with no error).
const { captureMisconception, analyze, searchOverride } = vi.hoisted(() => ({
  captureMisconception: vi.fn(async () => ({ classification: null, coachNote: '', logged: false })),
  analyze: vi.fn(),
  /** When set, the engine's one-search scoring answers from here. */
  searchOverride: { current: null as null | ((fen: string, moves: string) => unknown) },
}));

vi.mock('../services/discussionPractice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/discussionPractice')>()),
  captureMisconception,
}));

// The engine is the only async dependency of the evaluate path; pin it so the
// cpLoss under test is exactly the one the assertions talk about.
vi.mock('../services/stockfishEngine', async () => {
  const { oneSearchFromReads } = await import('../test/mocks/oneSearchFromReads');
  return {
    stockfishEngine: {
      analyzeWithBudget: analyze,
      // A `searchmoves` search (the one price) answers from the same two reads.
      analyzePosition: (fen: string, depth: number, opts?: { searchmoves?: string }) => (opts?.searchmoves
        ? searchOverride.current ? Promise.resolve(searchOverride.current(fen, opts.searchmoves)) : oneSearchFromReads(fen, opts.searchmoves, (f: string) => analyze(f, depth) as Promise<{ evaluation: number }>)
        : analyze(fen, depth)),
      isReady: (): boolean => true,
    },
  };
});

vi.mock('../services/voiceService', () => ({
  voiceService: { speakForced: vi.fn(async () => undefined), stop: vi.fn(), speak: vi.fn(async () => undefined) },
}));

/** A real 150cp slip: 1.e4 e5 2.Nf3 and Black drops a pawn with ...Nf6??-ish.
 *  The engine is stubbed, so what matters is that before/after differ by 150cp
 *  from the MOVER's side and a best move exists to drill toward. */
const SLIP = {
  prompted: false,
  coachMade: false,
  fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
  fenAfter: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playedSan: 'Nf6',
  gamePhase: 'opening' as const,
  moveNumber: 2,
  playerColor: 'black' as const,
  inBook: false,
  learned: true,
};

// THE COLD IMPORT IS PAID ONCE, OUTSIDE ANY TEST (2026-10-01). `importOriginal`
// on discussionPractice pulls in the misconception + mistake-puzzle chain — ~7s
// cold. Paid inside the first test, it timed out under ship-check load and its
// still-running evaluate then landed in the NEXT test ("called 2 times"). A
// race, not a flake.
let useDiscussionPractice: typeof import('./useDiscussionPractice').useDiscussionPractice;
let clearMovePriceMemo: () => void;
beforeAll(async () => {
  ({ useDiscussionPractice } = await import('./useDiscussionPractice'));
  ({ clearMovePriceMemo } = await import('../services/playedMoveGrade'));
}, 120_000);

describe('a mistake is captured with no card ever shown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMovePriceMemo();
    searchOverride.current = null;
    // White-perspective evals. Black to move at -0: after Black's move White is
    // +150, so from Black's side that is a 150cp loss.
    // Keyed by FEN, not call order — `Promise.all` fires both concurrently.
    analyze.mockImplementation(async (fen: string) => (fen === SLIP.fenBefore
      ? { evaluation: 0, bestMove: 'b8c6', isMate: false, topLines: [{ moves: ['b8c6'] }] }
      : { evaluation: 150, bestMove: 'f3e5', isMate: false, topLines: [{ moves: ['f3e5'] }] }));
  });

  it('BEHAVIOURAL: a beginner\'s 150cp mistake is recorded even though it never interrupts', async () => {
    // 800-rated: `slipWarrantsInterjection(150, 800)` is false, so no card is
    // ever raised. The mistake must still reach the weakness bucket — that is
    // the whole point of keeping capture when the pop-ups go.
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));

    // Awaited directly rather than through `waitFor` — the capture is
    // synchronous with the evaluate call, and waitFor's act loop hangs here
    // under React 19 for a hook that resolves before the first poll.
    await result.current.evaluatePlayerMove({ ...SLIP, studentRating: 800 });

    expect(
      captureMisconception,
      'a beginner mistake vanished — it never interrupts, so capture is the ONLY record',
    ).toHaveBeenCalledTimes(1);

    // The recorded slip must carry what the drill queue needs: the position,
    // what was played, and what to learn instead.
    // `mock.calls` is an array of ARGUMENT LISTS — one level deeper than it reads.
    const [[args]] = captureMisconception.mock.calls as unknown as [[{
      context: { fen: string; playedSan: string; bestSan: string; cpLoss: number };
    }]];
    expect(args.context.fen).toBe(SLIP.fenBefore);
    expect(args.context.playedSan).toBe('Nf6');
    expect(args.context.bestSan, 'no best move = no drillable puzzle').toBeTruthy();
    expect(Math.round(args.context.cpLoss)).toBe(150);

    // …and nothing was shown for it.
    expect(result.current.prompt, 'no card may block the board').toBeNull();
    // 20s: `importOriginal` on discussionPractice pulls in the misconception +
    // mistake-puzzle chain, which is well past the 5s default on a cold run.
  }, 20_000);

  it('forwards the move history so the captured slip attributes a fundamental (David 2026-09-07)', async () => {
    // Live Learn/Play play must feed the per-fundamental scorecard + drill
    // queue, not just the coarse tag. The classifier needs the SAN history to
    // prove WHICH fundamental a slip neglected — so evaluatePlayerMove must
    // forward it into the capture's classifyInput.
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));

    const history = ['e4', 'e5', 'Nf3', 'Nf6'];
    await result.current.evaluatePlayerMove({ ...SLIP, studentRating: 800, historySans: history });

    expect(captureMisconception).toHaveBeenCalledTimes(1);
    const [[args]] = captureMisconception.mock.calls as unknown as [[{
      classifyInput: { historySans?: string[] };
    }]];
    expect(
      args.classifyInput.historySans,
      'without the history the classifier can never attribute a fundamental live',
    ).toEqual(history);
  }, 20_000);

  it('records the slip that the pop-up used to own', async () => {
    // This is the whole contract in one line: the capture call must be reachable
    // from `evaluatePlayerMove` itself, not from a card's answer handler.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync('src/hooks/useDiscussionPractice.ts', 'utf8'));

    const evaluateBody = src.slice(
      src.indexOf('const evaluatePlayerMove'),
      src.indexOf('const raiseSlipPrompt'),
    );
    expect(
      evaluateBody.includes('captureMisconception('),
      'evaluatePlayerMove must capture directly — otherwise recording depends on a card being armed',
    ).toBe(true);

    // And it must sit BEFORE the interjection gate's early return, or the gate
    // silently decides what is remembered.
    const captureAt = evaluateBody.indexOf('captureMisconception(');
    const gateAt = evaluateBody.indexOf('slipWarrantsInterjection(');
    expect(
      captureAt < gateAt,
      'capture must run before slipWarrantsInterjection — a beginner\'s 150cp mistake must still be recorded',
    ).toBe(true);
  });

  it('does not log the same slip twice when a card was open', async () => {
    // `dismissOnMove` used to capture on its own. With capture moved upstream,
    // logging there too would double-count one mistake in the weakness profile
    // purely because a card happened to be open when the student played on.
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync('src/hooks/useDiscussionPractice.ts', 'utf8'));
    const dismissBody = src.slice(
      src.indexOf('const dismissOnMove'),
      src.indexOf('const dismissTeach'),
    );
    expect(
      dismissBody.includes('captureMisconception('),
      'dismissOnMove must not re-log — evaluatePlayerMove already did',
    ).toBe(false);
  });

  it('keeps the interjection bar for INTERRUPTING, not for recording', async () => {
    // The rating gate is real pedagogy — the right lesson at the level it lands
    // (CLAUDE.md, David 2026-06-04). It must survive; it just must not be what
    // decides whether a mistake reaches the drill queue.
    const { slipWarrantsInterjection } = await import('../services/slipDetector');
    expect(slipWarrantsInterjection(150, 800), 'beginner: 150cp should not interrupt').toBe(false);
    expect(slipWarrantsInterjection(150, 1500), 'intermediate: 150cp interrupts').toBe(true);
  });
});

describe('C3 — the live capture carries the engine lines + evals the sweep writes', () => {
  type Lines = { pvAfterPlayed?: string[]; pvAfterBest?: string[]; evalBefore?: number; evalAfterPlayed?: number };
  const captured = (): Lines => {
    const [[args]] = captureMisconception.mock.calls as unknown as [[{ classifyInput: Lines }]];
    return args.classifyInput;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    analyze.mockImplementation(async (fen: string) => (fen === SLIP.fenBefore
      ? { evaluation: 0, bestMove: 'b8c6', isMate: false, topLines: [{ moves: ['b8c6', 'f1c4', 'g8f6'] }] }
      : { evaluation: 150, bestMove: 'f3e5', isMate: false, topLines: [{ moves: ['f3e5', 'd7d6', 'e5f3'] }] }));
  });

  it('BEHAVIOURAL: the punishing line (SAN, from the board after the move), the best line minus its first move, and MOVER-POV evals all reach the classifier', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));
    await result.current.evaluatePlayerMove({ ...SLIP, studentRating: 800, historySans: ['e4', 'e5', 'Nf3', 'Nf6'] });
    expect(captureMisconception).toHaveBeenCalledTimes(1);
    const c = captured();
    // The OLD capture carried none of these four — the comment beside it said
    // the PV-gated detectors "stay review-only", with the reads in hand.
    expect(c.pvAfterPlayed, 'the reply PV, replayed from fenAfter').toEqual(['Nxe5', 'd6', 'Nf3']);
    expect(c.pvAfterBest, 'the best line from fenBefore, minus the best move itself').toEqual(['Bc4', 'Nf6']);
    expect(c.evalBefore, 'Black to move at White +0 → mover 0').toBe(0);
    expect(c.evalAfterPlayed, 'White +150 after the move → mover -150').toBe(-150);
  }, 20_000);

  it('NEGATIVE CONTROL: a mate read is a sentinel, never a number handed to the attributor', async () => {
    analyze.mockImplementation(async (fen: string) => (fen === SLIP.fenBefore
      ? { evaluation: 0, bestMove: 'b8c6', isMate: false, topLines: [{ moves: ['b8c6', 'f1c4', 'g8f6'] }] }
      : { evaluation: 10000, bestMove: 'f3e5', isMate: true, mateIn: 5, topLines: [{ moves: ['f3e5'] }] }));
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));
    await result.current.evaluatePlayerMove({ ...SLIP, studentRating: 800, historySans: ['e4', 'e5', 'Nf3', 'Nf6'] });
    expect(captureMisconception).toHaveBeenCalledTimes(1);
    const c = captured();
    expect(c.evalAfterPlayed).toBeUndefined();
    expect(c.evalBefore).toBe(0);
    expect(c.pvAfterPlayed).toEqual(['Nxe5']);
  }, 20_000);

  it('NEGATIVE CONTROL: a pre-move line that does not start with the best move yields NO afterBest line', async () => {
    analyze.mockImplementation(async (fen: string) => (fen === SLIP.fenBefore
      ? { evaluation: 0, bestMove: 'b8c6', isMate: false, topLines: [{ moves: ['d7d6', 'f1c4'] }] }
      : { evaluation: 150, bestMove: 'f3e5', isMate: false, topLines: [{ moves: ['f3e5', 'd7d6', 'e5f3'] }] }));
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));
    await result.current.evaluatePlayerMove({ ...SLIP, studentRating: 800, historySans: ['e4', 'e5', 'Nf3', 'Nf6'] });
    expect(captureMisconception).toHaveBeenCalledTimes(1);
    expect(captured().pvAfterBest).toBeUndefined();
    expect(captured().pvAfterPlayed).toEqual(['Nxe5', 'd6', 'Nf3']);
  }, 20_000);
});

// #2 root cause 4 (2026-10-20): ONE price for a move. David's Kg5 (ply 77 of the
// Smith-Morra replay) was 63 at the door and 115 in the record — the record took
// the read before minus a separate read after. Stockfish depth 20: 112-142; one
// search at depth 14 scores e5 -4 and Kg5 -137 = 133. The record takes that.
describe('the record prices the move in ONE search (Kg5)', () => {
  const KG5 = {
    prompted: false,
    coachMade: false,
    fenBefore: '5k2/1p6/3p2P1/p7/3nPK2/2N5/8/8 w - - 4 39',
    fenAfter: '5k2/1p6/3p2P1/p5K1/3nP3/2N5/8/8 b - - 5 39',
    playedSan: 'Kg5',
    gamePhase: 'endgame' as const,
    moveNumber: 39,
    playerColor: 'white' as const,
    inBook: false,
    learned: true,
  };
  beforeEach(() => {
    vi.clearAllMocks();
    clearMovePriceMemo();
    // The two separate reads that gave 115: before -3 (best e5), after -118.
    analyze.mockImplementation(async (fen: string) => (fen === KG5.fenBefore
      ? { evaluation: -3, bestMove: 'e4e5', isMate: false, depth: 6, topLines: [{ rank: 1, moves: ['e4e5'], evaluation: -3, mate: null }] }
      : { evaluation: -118, bestMove: 'd4e6', isMate: false, depth: 14, topLines: [{ rank: 1, moves: ['d4e6'], evaluation: -118, mate: null }] }));
    // One search, both moves: e5 -4, Kg5 -137.
    searchOverride.current = (_fen, moves) => (moves === 'e4e5 f4g5'
      ? { evaluation: -4, bestMove: 'e4e5', isMate: false, mateIn: null, depth: 14, topLines: [{ rank: 1, moves: ['e4e5'], evaluation: -4, mate: null }, { rank: 2, moves: ['f4g5'], evaluation: -137, mate: null }] }
      : { evaluation: 0, bestMove: '', isMate: false, mateIn: null, depth: 14, topLines: [] });
  });

  it('captures cpLoss 133 (one search), never 115 (before minus after)', async () => {
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));
    await result.current.evaluatePlayerMove({ ...KG5, studentRating: 1500 });
    const calls = captureMisconception.mock.calls as unknown as Array<[{ context: { cpLoss?: number } }]>;
    expect(calls.length).toBe(1);
    expect(calls[0][0].context.cpLoss).toBe(133);
  });

  it('an unpriced move records nothing — never a cost of 0', async () => {
    searchOverride.current = () => { throw new Error('engine down'); };
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach', capabilityOrigin: 'learn' }));
    await result.current.evaluatePlayerMove({ ...KG5, studentRating: 1500 });
    expect(captureMisconception).not.toHaveBeenCalled();
  });
});
