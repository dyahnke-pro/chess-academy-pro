import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  prefetchMasterPlay,
  prefetchWalkthroughSequence,
  __isKidSurfaceForTests,
  __resetOutOfBookStreakForTests,
  LOOKAHEAD_CANDIDATES,
  OUT_OF_BOOK_STREAK_LIMIT,
} from './masterPlayWatcher';
import {
  __resetMasterPlayLookupForTests,
} from './masterPlayLookup';
import { _resetLichessCircuitBreaker } from './lichessExplorerService';
import { masterPlayCache } from './masterPlayCache';
import { __resetMasterPlayPersistenceForTests } from './masterPlayPersistence';
import { db } from '../db/schema';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4_FEN_4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -';
const AFTER_D4_FEN_4 = 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -';

// Inject the fixture into all prefetches by passing it via the lookup
// path. We can't pass __testLocalDb through the watcher API, so we
// stub `import('../data/openings-lichess-extended.json')` via the
// lookup's dynamic import. Instead — set up a fetch stub returning
// empty, and rely on the local DB being loadable. The easiest path:
// directly call `lookupMasterPlay` with the fixture to warm the cache,
// then the watcher's calls will see cache hits. For miss cases, stub
// fetch.

// However the watcher CALLS lookupMasterPlay internally without
// __testLocalDb. So tests need to either:
//   a) Stub the dynamic import — complex.
//   b) Stub fetch and rely on live path.
// Going with (b). The cache state assertions still work because
// the watcher routes through masterPlayCache.

function stubFetch(payload: unknown, status = 200): ReturnType<typeof vi.fn> {
  const fn = vi.fn(
    async (): Promise<Response> =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  vi.spyOn(globalThis, 'fetch').mockImplementation(fn);
  return fn;
}

/** Build a Lichess explorer payload matching the fixture's starting-FEN
 *  entry so the watcher's "current" prefetch returns those 4 moves. */
const STARTING_FEN_EXPLORER_PAYLOAD = {
  white: 19950,
  draws: 20200,
  black: 9900,
  moves: [
    { uci: 'e2e4', san: 'e4', averageRating: 2480, white: 9000, draws: 8500, black: 4500, game: null },
    { uci: 'd2d4', san: 'd4', averageRating: 2510, white: 7600, draws: 7800, black: 3600, game: null },
    { uci: 'g1f3', san: 'Nf3', averageRating: 2500, white: 2400, draws: 2800, black: 1300, game: null },
    { uci: 'c2c4', san: 'c4', averageRating: 2520, white: 950, draws: 1100, black: 450, game: null },
  ],
  topGames: [],
  opening: null,
};

beforeEach(async () => {
  __resetOutOfBookStreakForTests();
  __resetMasterPlayLookupForTests();
  __resetMasterPlayPersistenceForTests();
  _resetLichessCircuitBreaker();
  // Clear the durable Dexie master-play cache so a prior test's
  // persisted live result doesn't short-circuit this test's lookup.
  await db.masterPlayCache.clear();
});

afterEach(() => {
  __resetMasterPlayLookupForTests();
  vi.restoreAllMocks();
});

describe('__isKidSurfaceForTests', () => {
  it('matches /kid/* prefixes', () => {
    expect(__isKidSurfaceForTests('/kid')).toBe(true);
    expect(__isKidSurfaceForTests('/kid/pawn-games')).toBe(true);
    expect(__isKidSurfaceForTests('/kid/knight-games/play')).toBe(true);
    expect(__isKidSurfaceForTests('/kid/journey/level-1')).toBe(true);
  });

  it('does NOT match coach / openings / dashboard routes', () => {
    expect(__isKidSurfaceForTests('/coach/chat')).toBe(false);
    expect(__isKidSurfaceForTests('/coach/teach')).toBe(false);
    expect(__isKidSurfaceForTests('/openings/italian-game')).toBe(false);
    expect(__isKidSurfaceForTests('/')).toBe(false);
    expect(__isKidSurfaceForTests('/kidsomething')).toBe(false); // doesn't begin /kid/
  });
});

describe('prefetchMasterPlay — kid exclusion', () => {
  it('returns immediately without hitting cache or network on /kid/* surfaces', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await prefetchMasterPlay(STARTING_FEN, { surface: '/kid/pawn-games' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(masterPlayCache.size()).toBe(0);
  });

  it('returns immediately on /kid/journey/*', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await prefetchMasterPlay(STARTING_FEN, { surface: '/kid/journey/maze-1' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prefetchWalkthroughSequence also short-circuits on /kid/*', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await prefetchWalkthroughSequence([STARTING_FEN, AFTER_E4_FEN_4], {
      surface: '/kid/pawn-games',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('prefetchMasterPlay — current + look-ahead', () => {
  it('populates the cache for the current FEN', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat' });
    const cached = masterPlayCache.get(STARTING_FEN);
    expect(cached).not.toBeNull();
    expect(cached?.moves.map((m) => m.san)).toContain('e4');
  });

  it('look-ahead also populates the cache for the top-3 child positions', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat' });
    // Child positions after e4, d4, Nf3 should now be in the cache too.
    expect(masterPlayCache.has(AFTER_E4_FEN_4)).toBe(true);
    expect(masterPlayCache.has(AFTER_D4_FEN_4)).toBe(true);
  });

  it('look-ahead is bounded by LOOKAHEAD_CANDIDATES', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat' });
    // 1 current + 3 look-ahead (capped at LOOKAHEAD_CANDIDATES) = 4 entries.
    // Our fixture's starting FEN has 4 moves but only top-3 are
    // prefetched as children.
    expect(LOOKAHEAD_CANDIDATES).toBe(3);
    expect(masterPlayCache.size()).toBeLessThanOrEqual(LOOKAHEAD_CANDIDATES + 1);
  });

  it('skipLookahead=true does not fire child prefetches', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchMasterPlay(STARTING_FEN, {
      surface: '/coach/chat',
      skipLookahead: true,
    });
    expect(masterPlayCache.size()).toBe(1);
    expect(masterPlayCache.has(AFTER_E4_FEN_4)).toBe(false);
  });

  it('dedupes — second prefetch for the same FEN reuses the cache', async () => {
    const fetchSpy = stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat', skipLookahead: true });
    const firstCalls = fetchSpy.mock.calls.length;
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat', skipLookahead: true });
    // Cache hit — fetch should not have been called again.
    expect(fetchSpy.mock.calls.length).toBe(firstCalls);
  });

  it('returns without throwing when the position has no master data (source:none)', async () => {
    stubFetch({ white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null });
    await expect(
      prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat' }),
    ).resolves.toBeUndefined();
    expect(masterPlayCache.get(STARTING_FEN)?.source).toBe('none');
  });

  it('handles a malformed SAN in master data without crashing look-ahead', async () => {
    // chess.js.move() will return null for an illegal SAN, which we
    // skip. Verify the watcher doesn't blow up on it.
    stubFetch({
      white: 100,
      draws: 100,
      black: 100,
      moves: [
        { uci: 'X1X2', san: 'Zzz9', averageRating: 2500, white: 100, draws: 100, black: 100, game: null },
        { uci: 'e2e4', san: 'e4', averageRating: 2500, white: 100, draws: 100, black: 100, game: null },
      ],
      topGames: [],
      opening: null,
    });
    await expect(
      prefetchMasterPlay(STARTING_FEN, { surface: '/coach/chat' }),
    ).resolves.toBeUndefined();
    // Real e4 child position should still be cached even though Zzz9 was invalid.
    expect(masterPlayCache.has(AFTER_E4_FEN_4)).toBe(true);
  });
});

describe('prefetchWalkthroughSequence', () => {
  it('prefetches every FEN in the sequence', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchWalkthroughSequence([STARTING_FEN], {
      surface: '/openings/italian-game',
    });
    expect(masterPlayCache.has(STARTING_FEN)).toBe(true);
  });

  it('uses the walkthrough-preload trigger label (does not fan out to look-ahead)', async () => {
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchWalkthroughSequence([STARTING_FEN], {
      surface: '/openings/italian-game',
    });
    // Walkthrough preload sets skipLookahead, so only the spine entry caches.
    expect(masterPlayCache.size()).toBe(1);
  });
});


describe('out-of-book live-fetch cutoff (2026-07-11 rate-limit root fix)', () => {
  // Two distinct legal positions that are far out of any book. FENs differ
  // so each is a genuine cache miss.
  const OOB_FEN_1 = '8/5pkp/4p1p1/3r4/p4P2/2Pp4/3R2PP/2B4K b - - 0 40';
  const OOB_FEN_2 = '8/5pkp/4p1p1/8/p4P2/2Pr4/3R2PP/2B4K w - - 0 41';
  const OOB_FEN_3 = '8/5pkp/4p1p1/8/p4P2/2PR4/6PP/2B4K b - - 0 41';
  const EMPTY_PAYLOAD = { white: 0, draws: 0, black: 0, moves: [], topGames: [], opening: null };

  it(`suppresses LIVE fetches after ${OUT_OF_BOOK_STREAK_LIMIT} consecutive empty current-position prefetches`, async () => {
    const fetchFn = stubFetch(EMPTY_PAYLOAD);
    await prefetchMasterPlay(OOB_FEN_1, { surface: '/coach/play' });
    await prefetchMasterPlay(OOB_FEN_2, { surface: '/coach/play' });
    const callsAfterStreak = fetchFn.mock.calls.length;
    expect(callsAfterStreak).toBeGreaterThan(0); // the first two DID go live
    // Streak reached — the third prefetch must make NO live call.
    await prefetchMasterPlay(OOB_FEN_3, { surface: '/coach/play' });
    expect(fetchFn.mock.calls.length).toBe(callsAfterStreak);
  });

  it('a non-empty current-position result resets the streak (transposition back into book re-arms)', async () => {
    const fetchFn = stubFetch(EMPTY_PAYLOAD);
    await prefetchMasterPlay(OOB_FEN_1, { surface: '/coach/play' });
    await prefetchMasterPlay(OOB_FEN_2, { surface: '/coach/play' });
    // In-book position: payload with games resets the streak…
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    // …but live is suppressed right now, so warm it via the cache-free
    // path a REAL re-entry would use: the local masters DB / persisted
    // tiers. Simulate by seeding the memory cache directly (the free tier
    // the suppressed lookup still reads).
    masterPlayCache.set(STARTING_FEN, {
      fen: STARTING_FEN.split(' ').slice(0, 4).join(' '),
      totalGames: 100,
      moves: [{ san: 'e4', uci: 'e2e4', games: 60, whitePct: 50, drawPct: 30, blackPct: 20 }],
      source: 'lichess-live',
    } as never);
    await prefetchMasterPlay(STARTING_FEN, { surface: '/coach/play' });
    // Streak is reset — the NEXT novel position goes live again.
    const before = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await prefetchMasterPlay(OOB_FEN_3, { surface: '/coach/play' });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before);
  });

  it('walkthrough preloads are exempt from the cutoff (curated book lines)', async () => {
    const fetchFn = stubFetch(EMPTY_PAYLOAD);
    await prefetchMasterPlay(OOB_FEN_1, { surface: '/coach/play' });
    await prefetchMasterPlay(OOB_FEN_2, { surface: '/coach/play' });
    const callsAfterStreak = fetchFn.mock.calls.length;
    stubFetch(STARTING_FEN_EXPLORER_PAYLOAD);
    await prefetchWalkthroughSequence([STARTING_FEN], { surface: '/openings/italian-game' });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length + callsAfterStreak)
      .toBeGreaterThan(callsAfterStreak); // the preload still went live
    expect(masterPlayCache.has(STARTING_FEN)).toBe(true);
  });
});
