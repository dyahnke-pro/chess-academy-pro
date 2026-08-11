import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock stockfishEngine before importing
// The band layer calls the explorer. Left un-mocked it makes a real network
// request from a unit test; mocked as a HANG it reproduces the regression.
const pickBookMoveMock = vi.fn();
vi.mock('./coachBookMove', () => ({
  pickBookMove: (...a: unknown[]) => pickBookMoveMock(...a),
}));

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
    getBestMove: vi.fn(),
    forceRestart: vi.fn(),
    initialize: vi.fn(),
    stop: vi.fn(),
  },
}));

import { getAdaptiveMove, getTargetStrength, tryOpeningBookMove, breakBookProbability, explorerBandForElo, slipsAllowed, pickTaughtSlip, studentPlayingRating } from './coachGameEngine';
import { readFileSync } from 'node:fs';
import { stockfishEngine } from './stockfishEngine';
import type { StockfishAnalysis } from '../types';
import { configFromTargetElo } from './coachPlaySession';

/** The rating→skill answer from its ONE owner.
 *
 *  🔒 THESE TESTS USED TO HARDCODE THE LADDER'S OUTPUT (skill 16 at 1684,
 *  skill 5 at 900, skill 20 at 2000+) — so when the scale was corrected on
 *  2026-08-11, eight of them failed for asserting the bug. Skill Level is not
 *  Elo, and reading it as though it were handed David's 1729 an opponent
 *  playing around 2500 the moment his game left book.
 *
 *  What these tests are FOR is the wiring: that the engine is called with the
 *  rating-matched skill rather than full strength, and that a weaker target is
 *  genuinely weaker. Asking the owner keeps them testing exactly that and
 *  stops them breaking every time the curve is tuned. */
const skillFor = (elo: number): number => configFromTargetElo(elo).skill;

const analyzePositionMock = vi.mocked(stockfishEngine).analyzePosition;
const getBestMoveMock = vi.mocked(stockfishEngine).getBestMove;

const mockAnalysis: StockfishAnalysis = {
  bestMove: 'e2e4',
  evaluation: 30,
  isMate: false,
  mateIn: null,
  depth: 12,
  topLines: [
    { rank: 1, evaluation: 30, moves: ['e2e4', 'e7e5'], mate: null },
    { rank: 2, evaluation: 20, moves: ['d2d4', 'd7d5'], mate: null },
    { rank: 3, evaluation: 10, moves: ['c2c4', 'e7e5'], mate: null },
  ],
  nodesPerSecond: 1000000,
};

describe('coachGameEngine', () => {
  beforeEach(() => {
    analyzePositionMock.mockResolvedValue(mockAnalysis);
    getBestMoveMock.mockResolvedValue('e2e4');
    // Default to the threaded (desktop) path so the depth-by-ELO assertions
    // below test the full curve. The single-threaded depth cap is covered by
    // its own test.
    vi.stubGlobal('crossOriginIsolated', true);
  });

  describe('getAdaptiveMove — movetime-first (David 2026-08-07: depth-14 selection took 5-6s per reply)', () => {
    it('returns the movetime search result as the move', async () => {
      const result = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(result.move).toBe('e2e4');
      expect(result.source).toBe('stockfish-best');
      expect(analyzePositionMock).not.toHaveBeenCalled(); // depth search never runs when the timed search delivers
    });

    it('uses the bounded THREADED movetime with the rating-matched skill', async () => {
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(getBestMoveMock).toHaveBeenCalledWith(expect.any(String), 1200, skillFor(1200));
    });

    it('uses the longer single-threaded movetime when not cross-origin isolated', async () => {
      vi.stubGlobal('crossOriginIsolated', false);
      await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1500);
      expect(getBestMoveMock).toHaveBeenCalledWith(expect.any(String), 2500, skillFor(1500));
    });
  });

  describe('getAdaptiveMove — depth-search recovery ladder (movetime search failed)', () => {
    beforeEach(() => {
      // The timed search must FAIL for the depth ladder to run at all.
      getBestMoveMock.mockResolvedValue('(none)');
    });

    it('returns a move and analysis from the depth search', async () => {
      const result = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1200);
      expect(result.move).toBeTruthy();
      expect(result.analysis).toBe(mockAnalysis);
    });

    it('always returns the best move or 2nd-best move', async () => {
      for (let i = 0; i < 20; i++) {
        const result = await getAdaptiveMove('startfen', 1000);
        expect(['e2e4', 'd2d4']).toContain(result.move);
      }
    });

    it('uses depth 10 for < 1000 ELO', async () => {
      await getAdaptiveMove('startfen', 900);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 10, { 'Skill Level': skillFor(900) });
    });

    it('uses depth 12 for 1000-1199 ELO', async () => {
      await getAdaptiveMove('startfen', 1100);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 12, { 'Skill Level': skillFor(1100) });
    });

    it('uses depth 14 for 1200-1499 ELO', async () => {
      await getAdaptiveMove('startfen', 1300);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 14, expect.any(Object));
    });

    it('uses depth 16 for 1500-1799 ELO', async () => {
      await getAdaptiveMove('startfen', 1600);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 16, expect.any(Object));
    });

    it('uses depth 18 for 1800+ ELO', async () => {
      await getAdaptiveMove('startfen', 2000);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 18, expect.any(Object));
    });

    it('caps depth at 10 on single-threaded (no cross-origin isolation)', async () => {
      // iOS / no-SharedArrayBuffer path: a deep search blows the move-timeout
      // budget and falls back to random, so the depth is capped (David 2026-06-21).
      vi.stubGlobal('crossOriginIsolated', false);
      await getAdaptiveMove('startfen', 1600); // depth 16 on threaded
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), 10, expect.any(Object));
    });

    it('a weak opponent is weakened as far as the scale goes', async () => {
      await getAdaptiveMove('startfen', 700);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), expect.any(Number), { 'Skill Level': skillFor(700) });
      // Skill 0 still plays around 1320, so this is the floor, not a choice.
      expect(skillFor(700)).toBe(0);
    });

    it('a strong opponent is genuinely stronger than a weak one', async () => {
      await getAdaptiveMove('startfen', 2100);
      expect(analyzePositionMock).toHaveBeenCalledWith(expect.any(String), expect.any(Number), { 'Skill Level': skillFor(2100) });
      expect(skillFor(2100)).toBeGreaterThan(skillFor(1200));
    });
  });

  describe('getTargetStrength', () => {
    it('returns player rating for medium (matches strength)', () => {
      expect(getTargetStrength(1420)).toBe(1420);
    });

    it('floors at 600', () => {
      expect(getTargetStrength(500)).toBe(600);
    });

    it('returns player rating + 200 for hard', () => {
      expect(getTargetStrength(1400, 'hard')).toBe(1600);
    });

    it('returns player rating - 300 for easy', () => {
      expect(getTargetStrength(1400, 'easy')).toBe(1100);
    });

    it('returns 600 for low easy rating (at the floor)', () => {
      expect(getTargetStrength(800, 'easy')).toBe(600);
    });
  });

  describe('breakBookProbability (opening book-break by rating)', () => {
    it('strong players (>=1600) never break book', () => {
      expect(breakBookProbability(1600)).toBe(0);
      expect(breakBookProbability(2000)).toBe(0);
    });

    it('beginners break book most of the time', () => {
      expect(breakBookProbability(800)).toBeGreaterThanOrEqual(0.6);
    });

    it('monotonically decreases as rating rises', () => {
      const p = [700, 1000, 1200, 1400, 1550, 1600].map(breakBookProbability);
      for (let i = 1; i < p.length; i += 1) expect(p[i]).toBeLessThanOrEqual(p[i - 1]);
    });

    it('lower-intermediates still break book sometimes, strong-intermediates rarely', () => {
      expect(breakBookProbability(1250)).toBeGreaterThan(0.2);
      expect(breakBookProbability(1550)).toBeGreaterThan(0);
      expect(breakBookProbability(1550)).toBeLessThan(0.2);
    });
  });

  describe('tryOpeningBookMove', () => {
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

    it('returns the next book move when on the opening line', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], frenchMoves, 'black');
      expect(result).toBe('e7e6');
    });

    it('returns null when no opening is requested', () => {
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['e4'], null, 'black');
      expect(result).toBeNull();
    });

    it('returns null when game has deviated from book', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(AFTER_E4_FEN, ['d4'], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when it is not the AI turn', () => {
      const frenchMoves = ['e4', 'e6', 'd4', 'd5'];
      const result = tryOpeningBookMove(START_FEN, [], frenchMoves, 'black');
      expect(result).toBeNull();
    });

    it('returns null when past the end of book moves', () => {
      const frenchMoves = ['e4', 'e6'];
      const afterE4E6Fen = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      const result = tryOpeningBookMove(afterE4E6Fen, ['e4', 'e6'], frenchMoves, 'white');
      expect(result).toBeNull();
    });

    it('returns the correct move for AI playing white', () => {
      const italianMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
      const result = tryOpeningBookMove(START_FEN, [], italianMoves, 'white');
      expect(result).toBe('e2e4');
    });
  });
});

// David 2026-08-02, playing a Vienna on his iPhone: EIGHT coach moves, EIGHT
// `analyzePosition failed/timeout after 8000ms`, every one landing on the
// fallback — which called getBestMove WITHOUT a skill argument, so it defaulted
// to 20. A 1684-rated opponent played full-strength Stockfish for the whole
// game and beat him by seven pawns.
describe('getAdaptiveMove — the single-threaded (iOS) opponent', () => {
  beforeEach(() => {
    analyzePositionMock.mockClear();
    getBestMoveMock.mockClear();
    vi.stubGlobal('crossOriginIsolated', false);
    vi.stubGlobal('SharedArrayBuffer', undefined);
  });

  it('searches by TIME, not depth, so it cannot time out every move', async () => {
    const result = await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 1684);
    expect(getBestMoveMock).toHaveBeenCalled();
    expect(analyzePositionMock).not.toHaveBeenCalled();
    expect(result.move).toBe('e2e4');
  });

  it('plays at the rating-matched skill level, never full strength', async () => {
    await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 1684);
    const skillArgs = getBestMoveMock.mock.calls.map((c) => c[2]);
    expect(skillArgs.length).toBeGreaterThan(0);
    for (const skill of skillArgs) {
      expect(skill).toBe(skillFor(1684));
      expect(skill).not.toBe(20);
    }
  });

  it('a weaker opponent gets a weaker skill level', async () => {
    await getAdaptiveMove('r3k2r/pp2bppp/2n5/3pP3/2pP2Q1/5N2/P1P1B1PP/q3BK1R b kq - 1 15', 900);
    const weak = getBestMoveMock.mock.calls.map((c) => c[2]);
    expect(weak.every((s) => s === skillFor(900))).toBe(true);
    expect(skillFor(900)).toBeLessThan(skillFor(1684));
  });
});

// ── THE COACH MAKES THE MISTAKES OF ITS RATING ────────────────────────────
// David 2026-08-11: "Based on rating I want coach making mistakes! Maybe have
// coach use the amateur database for openings?" — and, on where the lookup
// hangs: "The DB check should be attached to easy and medium and hard
// settings."
//
// Both halves matter. A weakened engine plays WORSE, and worse is not HUMAN:
// its errors are diffuse and arbitrary, a 1300's are specific and repeat. And
// the band has to follow the SETTING, not a coin flip — the first draft hung it
// off `shouldBreakBook`, whose probability is zero at 1600 and above, so medium
// and hard would never have consulted it.
describe('explorerBandForElo — the band follows the difficulty', () => {
  it('gives a weak opponent a weak band', () => {
    expect(explorerBandForElo(1000)).toBe('1000,1200');
    expect(explorerBandForElo(1150)).toBe('1000,1200');
  });

  it('gives a strong opponent a strong band', () => {
    expect(explorerBandForElo(2300)).toBe('2200,2500');
  });

  it('always names two real explorer buckets', () => {
    const BUCKETS = new Set(['1000', '1200', '1400', '1600', '1800', '2000', '2200', '2500']);
    for (let elo = 400; elo <= 3000; elo += 50) {
      const parts = explorerBandForElo(elo).split(',');
      expect(parts, `elo ${elo}`).toHaveLength(2);
      for (const p of parts) expect(BUCKETS.has(p), `elo ${elo} → ${p}`).toBe(true);
    }
  });

  it('never hands a weaker player a stronger band than a stronger player', () => {
    // Monotonic, which is what makes "easy blunders more than hard" true rather
    // than hoped for. resolveConfig maps easy/medium/hard to elo-300 / elo /
    // elo+300, so monotonic-in-elo IS monotonic-in-difficulty.
    let prev = -1;
    for (let elo = 400; elo <= 3000; elo += 50) {
      const floor = Number(explorerBandForElo(elo).split(',')[0]);
      expect(floor, `elo ${elo} went backwards`).toBeGreaterThanOrEqual(prev);
      prev = floor;
    }
  });

  it('the three difficulties land on different bands for a typical student', () => {
    // A 1500 student: easy 1200, medium 1500, hard 1800. If these collapsed to
    // one band the setting would be decorative.
    const easy = explorerBandForElo(1500 - 300);
    const medium = explorerBandForElo(1500);
    const hard = explorerBandForElo(1500 + 300);
    expect(new Set([easy, medium, hard]).size, `easy=${easy} medium=${medium} hard=${hard}`).toBe(3);
  });
});


// ── THE COACH MUST ALWAYS MOVE ────────────────────────────────────────────
// The first version of the rating-band layer stopped the coach moving at all.
// The prod audit right after it drove ten student moves and got ZERO coach
// replies -- 0 plan sentences where the run before had 84, and a verdict lane
// that never ran because no reply reached it. Two faults: an unbounded network
// await in front of the move, and a layer that never incremented the shared
// miss-streak so the "stop asking" breaker could not trip for it.
describe('the rating band never holds the coach hostage', () => {
  beforeEach(() => {
    pickBookMoveMock.mockReset();
    analyzePositionMock.mockResolvedValue(mockAnalysis);
    getBestMoveMock.mockResolvedValue('e2e4');
  });

  it('still returns a move when the explorer never answers', async () => {
    // The exact failure: a promise that never settles. Without the time box
    // this test hangs, which is what the student experienced.
    pickBookMoveMock.mockImplementation(() => new Promise(() => {}));
    const res = await getAdaptiveMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      1300,
    );
    expect(res.move, 'the coach produced no move').toBeTruthy();
    expect(res.source).not.toBe('amateur-band');
  }, 20000);

  it('still returns a move when the explorer throws', async () => {
    pickBookMoveMock.mockRejectedValue(new Error('lichess-rate-limited'));
    const res = await getAdaptiveMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      1300,
    );
    expect(res.move).toBeTruthy();
  }, 20000);

  it('plays the human move when the band has one', async () => {
    // The positive control. Without it, "always returns a move" would also be
    // satisfied by a layer that had quietly stopped working.
    pickBookMoveMock.mockResolvedValue({ san: 'e4', uci: 'e2e4', openingName: null });
    const res = await getAdaptiveMove(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      1300,
    );
    expect(res.source).toBe('amateur-band');
    expect(res.move).toBe('e2e4');
  }, 20000);

  it('asks the explorer for the band the rating implies', async () => {
    pickBookMoveMock.mockResolvedValue({ san: 'e4', uci: 'e2e4', openingName: null });
    await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1300);
    expect((pickBookMoveMock.mock.calls[0][1] as { ratings: string }).ratings).toBe('1200,1400');
  }, 20000);
});

// ── WALKING INTO A TRAP, ON PURPOSE ───────────────────────────────────────
// David 2026-08-11, on the gem lane having never fired once in production:
// "68 yes!" — let the coach deliberately play a curated slip so the student
// has a real punish to find. Zero of 344 gem inaccuracies exist in the openings
// DB and none is an engine pick, so the lane could never fire by accident.
describe('the coach walks into a curated trap, but only as a lesson', () => {
  // The Englund Gambit trap position: 1.d4 e5 2.dxe5 Nc6 3.Nf3 Qe7 and White's
  // natural-looking Bf4 walks into ...Qb4+ picking up the b2 pawn. A real gem.
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  beforeEach(() => {
    analyzePositionMock.mockResolvedValue(mockAnalysis);
    getBestMoveMock.mockResolvedValue('e2e4');
    pickBookMoveMock.mockReset();
    pickBookMoveMock.mockResolvedValue(null);
  });

  it('never walks in against a strong opponent', async () => {
    // A hard game is a hard game. A strong opponent falling into a known
    // amateur trap is a broken difficulty setting, not a teaching moment.
    const res = await getAdaptiveMove(START, 2200);
    expect(res.source).not.toBe('taught-slip');
  }, 20000);

  it('still produces a legal move on every path', async () => {
    // The whole layer is wrapped so a missed teaching moment can never cost a
    // move — the failure that took the coach silent earlier tonight.
    for (const elo of [800, 1200, 1600, 2400]) {
      const res = await getAdaptiveMove(START, elo);
      expect(res.move, `elo ${elo}`).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
    }
  }, 30000);
});

// ── WHO GETS WALKED INTO A TRAP ───────────────────────────────────────────
// David 2026-08-11, verbatim: "Intermediate should only get them on easy.
// Beginners should get them on easy and medium. Advanced players should never
// get them."
describe('slipsAllowed — the matrix, exactly', () => {
  const BEGINNER = 800;
  const INTERMEDIATE = 1500;
  const ADVANCED = 2200;

  it('beginners: easy and medium, never hard', () => {
    expect(slipsAllowed(BEGINNER, 'easy')).toBe(true);
    expect(slipsAllowed(BEGINNER, 'medium')).toBe(true);
    expect(slipsAllowed(BEGINNER, 'hard')).toBe(false);
  });

  it('intermediate: easy ONLY', () => {
    expect(slipsAllowed(INTERMEDIATE, 'easy')).toBe(true);
    expect(slipsAllowed(INTERMEDIATE, 'medium')).toBe(false);
    expect(slipsAllowed(INTERMEDIATE, 'hard')).toBe(false);
  });

  it('advanced: never, at any setting', () => {
    for (const d of ['easy', 'medium', 'hard', undefined] as const) {
      expect(slipsAllowed(ADVANCED, d), `advanced on ${d}`).toBe(false);
    }
  });

  it('reads the band and the setting SEPARATELY', () => {
    // The bug this replaces: gating on the resolved targetElo, which folds
    // difficulty in. A 1500 on easy resolves to 1200 and an 800 on medium to
    // 800 — one should get a slip and one should too, but a 1500 on MEDIUM
    // (1500) must not, and no single number can express that.
    expect(slipsAllowed(1500, 'easy')).toBe(true);
    expect(slipsAllowed(1500, 'medium')).toBe(false);
  });

  it('an unknown setting is treated as medium, not as permission', () => {
    expect(slipsAllowed(INTERMEDIATE, undefined)).toBe(false);
    expect(slipsAllowed(BEGINNER, undefined)).toBe(true);
  });

  it('the band edges land on the documented side', () => {
    expect(slipsAllowed(999, 'medium'), 'just under beginner ceiling').toBe(true);
    expect(slipsAllowed(1000, 'medium'), 'exactly 1000 is intermediate').toBe(false);
    expect(slipsAllowed(2000, 'easy'), 'exactly 2000 is still intermediate').toBe(true);
    expect(slipsAllowed(2001, 'easy'), 'over 2000 is advanced').toBe(false);
  });

  it('no slip at all when the caller did not say who the student is', async () => {
    // Absent identity, the lane stays OFF. The safe way round for a feature
    // that hands the student a won position.
    pickBookMoveMock.mockResolvedValue(null);
    const res = await getAdaptiveMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 900);
    expect(res.source).not.toBe('taught-slip');
  }, 20000);
});

// ── THE SHARED PICKER ─────────────────────────────────────────────────────
// David asked for the slip on Play as well as Learn, and the two surfaces pick
// their moves by completely different routes: Learn goes through
// `getAdaptiveMove`, Play has its own book→Stockfish fast path and reaches
// `getAdaptiveMove` only when both fail. One picker, called at the same
// precedence in both, is what keeps the matrix and the budget from drifting
// apart — and what stops the Play wiring from being a grep that never fires.
describe('pickTaughtSlip — one lane, two surfaces', () => {
  /** Stafford Gambit after 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6 — White to move, and a
   *  curated gem (Nxf7, the "oh no, my queen" walk-in) sits exactly here. */
  const GEM = 'r1bqkb1r/pppp1ppp/2n2n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 1 4';
  /** A fresh game, so the budget re-arms. */
  const NEW_GAME = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  beforeEach(async () => {
    analyzePositionMock.mockResolvedValue(mockAnalysis);
    getBestMoveMock.mockResolvedValue('e2e4');
    pickBookMoveMock.mockReset();
    pickBookMoveMock.mockResolvedValue(null);
    // The budget is module state and one slip per game is the whole point, so
    // a test that ran before this one has legitimately spent it. Start each
    // test from a fresh game the way a student would.
    await pickTaughtSlip(NEW_GAME, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test-arm');
  });

  it('offers the curated slip on a real gem board', async () => {
    // 1420 is the app's default rating — an intermediate — so easy is the one
    // setting that should hand it over.
    const slip = await pickTaughtSlip(GEM, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    expect(slip, 'no slip offered on a board a gem is filed at').not.toBeNull();
    expect(slip?.san).toBe('Nxf7');
    expect(slip?.punishSan, 'the punish did not come with it').toBeTruthy();
    // UCI, because both call sites need a move they can actually play.
    expect(slip?.uci).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
  }, 20000);

  it('spends its budget once, then re-arms on a new game', async () => {
    const first = await pickTaughtSlip(GEM, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    expect(first, 'the first ask should be answered').not.toBeNull();
    const second = await pickTaughtSlip(GEM, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    expect(second, 'a second walk-in in the same game teaches the wrong thing').toBeNull();

    // 🔒 THE RE-ARM IS THE POINT. Play reaches `getAdaptiveMove` only when its
    // book and engine BOTH fail, so a budget that reset only there would give
    // that surface one slip per SESSION — a student's second game would
    // silently never get one, which is the invisible-dead-lane shape this whole
    // feature exists to fix.
    await pickTaughtSlip(NEW_GAME, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    const afterNewGame = await pickTaughtSlip(GEM, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    expect(afterNewGame, 'the budget never re-armed for the next game').not.toBeNull();
  }, 30000);

  it('obeys the matrix on the very board that would otherwise slip', async () => {
    // Same gem board, same student — only the setting changes. This is the half
    // a "did it fire" check cannot see: a lane that fires unconditionally
    // passes the fire test and fails this one.
    await pickTaughtSlip(NEW_GAME, 1100, { studentElo: 1420, difficulty: 'easy' }, 'test');
    expect(await pickTaughtSlip(GEM, 1700, { studentElo: 1420, difficulty: 'hard' }, 'test'),
      'an intermediate on hard was handed the trap').toBeNull();
    expect(await pickTaughtSlip(GEM, 1420, { studentElo: 1420, difficulty: 'medium' }, 'test'),
      'an intermediate on medium was handed the trap').toBeNull();
    expect(await pickTaughtSlip(GEM, 1900, { studentElo: 2400, difficulty: 'easy' }, 'test'),
      'an advanced player was handed the trap').toBeNull();
  }, 30000);

  it('never throws, whatever it is handed', async () => {
    for (const fen of ['', 'not a fen', GEM, NEW_GAME]) {
      await expect(pickTaughtSlip(fen, 1100, { studentElo: 900, difficulty: 'easy' }, 'test'))
        .resolves.not.toThrow();
    }
  }, 20000);
});

// "MY ELO IS 1300 DOES THAT TRANSFER OVER? WHERE DID YOU GET 1729 FROM?"
// (David 2026-08-11.)
//
// It did not transfer. 1729 was his PUZZLE rating — the app's own tactics Elo,
// seeded at 1200 and drifting up as he solved puzzles — and Learn was matching
// the opponent against it while Play used the 1300 he had actually entered.
// Same app, same student, two different opponents, and the wrong one was on
// the surface he was playing.
describe('the opponent is matched against the rating the student SET', () => {
  it("takes the entered rating, not the puzzle rating", () => {
    expect(studentPlayingRating({ currentRating: 1300, puzzleRating: 1729 })).toBe(1300);
  });

  it('falls back to the puzzle rating only when nothing was entered', () => {
    // A poor proxy, but better than a constant — and on a fresh profile the
    // two are equal anyway.
    expect(studentPlayingRating({ currentRating: null, puzzleRating: 1729 })).toBe(1729);
    expect(studentPlayingRating({ puzzleRating: 1450 })).toBe(1450);
  });

  it('survives a missing or nonsense profile rather than guessing high', () => {
    expect(studentPlayingRating(null)).toBe(1200);
    expect(studentPlayingRating(undefined)).toBe(1200);
    expect(studentPlayingRating({ currentRating: 0, puzzleRating: 0 })).toBe(1200);
    expect(studentPlayingRating({ currentRating: Number.NaN, puzzleRating: 1500 })).toBe(1500);
  });

  it("David's profile now faces an opponent aimed at 1300, not 1729", () => {
    // The two bugs compounded: the wrong INPUT (1729 instead of 1300) and the
    // wrong SCALE (skill read as though it were Elo). Together they put a
    // ~2500-strength engine in front of a 1300 player.
    const profile = { currentRating: 1300, puzzleRating: 1729 };
    const target = getTargetStrength(studentPlayingRating(profile), 'medium');
    expect(target).toBe(1300);
    expect(configFromTargetElo(target).skill).toBeLessThanOrEqual(2);
  });

  it('both coach surfaces read the ONE owner', () => {
    // They disagreed for as long as both existed. A shared function is the
    // only thing that stops them disagreeing again.
    const read = (p: string): string => readFileSync(p, 'utf8');
    for (const f of ['src/components/Coach/CoachTeachPage.tsx', 'src/components/Coach/CoachGamePage.tsx']) {
      expect(read(f), `${f} does not use the shared playing rating`).toContain('studentPlayingRating(activeProfile)');
    }
    expect(read('src/components/Coach/CoachTeachPage.tsx'), 'Learn is matching the opponent to a puzzle rating again')
      .not.toContain('getTargetStrength(activeProfile?.puzzleRating');
  });
});
