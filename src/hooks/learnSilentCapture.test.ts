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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// `vi.hoisted` — vi.mock is hoisted above every import, so a factory that
// closes over a plain `const` hits its temporal dead zone and the module never
// resolves (the test just times out with no error).
const { captureMisconception, analyze } = vi.hoisted(() => ({
  captureMisconception: vi.fn(async () => ({ classification: null, coachNote: '', logged: false })),
  analyze: vi.fn(),
}));

vi.mock('../services/discussionPractice', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/discussionPractice')>()),
  captureMisconception,
}));

// The engine is the only async dependency of the evaluate path; pin it so the
// cpLoss under test is exactly the one the assertions talk about.
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

/** A real 150cp slip: 1.e4 e5 2.Nf3 and Black drops a pawn with ...Nf6??-ish.
 *  The engine is stubbed, so what matters is that before/after differ by 150cp
 *  from the MOVER's side and a best move exists to drill toward. */
const SLIP = {
  fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
  fenAfter: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  playedSan: 'Nf6',
  gamePhase: 'opening' as const,
  moveNumber: 2,
  playerColor: 'black' as const,
  inBook: false,
  learned: true,
};

describe('a mistake is captured with no card ever shown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    const { useDiscussionPractice } = await import('./useDiscussionPractice');
    const { result } = renderHook(() => useDiscussionPractice(true, { surface: 'coach-teach' }));

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
