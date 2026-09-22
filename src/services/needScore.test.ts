// needScore — the student term of importance (unified-coach N2). The contract
// from the CLAUDE.md standard: cold start TEACHES; a mastered line is SILENT; a
// hole this student keeps falling in SPEAKS; a habitual book departure SPEAKS;
// the opponent's move never has need.
import { describe, it, expect } from 'vitest';
import { computeNeed, coldStudent, coldStartPrior, familiarity, NEED_THRESHOLD, COLD_START_GAMES, FAMILIAR_REPS, type StudentNeedContext, type NeedPlyInput } from './needScore';
import type { WeaknessSignal } from './weaknessSignal';
import type { BookDepartureRow } from './bookDepartureWeakness';

const forkHole: WeaknessSignal = {
  clusterId: 'analysis:tactic:fork', bucket: 'tactical', label: 'Forks', openCount: 4, total: 4, severity: 70,
  lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: ['fork'],
};

/** A ply input with the required `clauseKind` and `fundamentalId` defaulted;
 *  these tests are about the STUDENT term, and a caller that cares about either
 *  passes it explicitly. Both are REQUIRED on the real type on purpose — see
 *  `NeedPlyInput` — so this helper is the one place the tests answer them. */
const ply = (
  o: Omit<NeedPlyInput, 'clauseKind' | 'fundamentalId'>
    & { clauseKind?: string | null; fundamentalId?: string | null },
): NeedPlyInput => ({ clauseKind: null, fundamentalId: null, ...o });

const warm = (over: Partial<StudentNeedContext> = {}): StudentNeedContext => ({
  rating: 1500, gamesPlayed: COLD_START_GAMES + 10, signals: [], bookDepartures: [], capabilities: new Map(), ...over,
});

describe('needScore — cold start defaults to TEACH', () => {
  it('a fresh install: every band clears the bar on the prior', () => {
    for (const rating of [800, 1200, 1600, 2200]) {
      const v = computeNeed(ply({ ply: 3, studentMove: true }), coldStudent(rating));
      expect(v.speak, `rating ${rating}`).toBe(true);
      expect(v.prior).toBe(true);
      expect(coldStartPrior(0)).toBeGreaterThanOrEqual(NEED_THRESHOLD);
    }
  });
  it('the prior is a ceiling at zero games and takes NO rating', () => {
    // NO LONGER A RATING LADDER (2026-09-17). It took a rating, which is the
    // axis the capability model rejects — and for any student who never
    // imported games that rating is the profile default of 800 for life, so the
    // band measured nothing. A cold student has no evidence, every capability
    // is UNKNOWN, and unknown means teach it: one ceiling, no parameter but the
    // count of their own analysed games.
    expect(coldStartPrior(0)).toBe(100);
    expect(coldStartPrior.length, 'the prior takes the GAME COUNT, never a rating').toBe(1);
  });

  // B7(b) (2026-09-22): the prior FADES with games — it used to be a switch
  // that replaced the whole score with 100 for four games and dropped it on
  // the fifth. Negative control: restore `if (games < COLD) score = 100` → the
  // fade test fails at 2 games and the blend test fails at 3.
  it('FADES linearly with each analysed game and is gone at COLD_START_GAMES', () => {
    expect(coldStartPrior(0)).toBe(100);
    expect(coldStartPrior(2)).toBe(60);
    expect(coldStartPrior(COLD_START_GAMES - 1)).toBeLessThan(NEED_THRESHOLD);
    expect(coldStartPrior(COLD_START_GAMES)).toBe(0);
    expect(coldStartPrior(COLD_START_GAMES + 10)).toBe(0);
    const twoGames = computeNeed(ply({ ply: 3, studentMove: true }), { ...coldStudent(1200), gamesPlayed: 2 });
    expect(twoGames.score).toBe(60);
    expect(twoGames.prior).toBe(true);
  });

  it('is ADDED to the data, never swapped for it — three games plus an unseen line speaks, a familiar line does not', () => {
    const three = (lineReps: number[]): StudentNeedContext => ({ ...coldStudent(1200), gamesPlayed: 3, lineReps });
    const unseen = computeNeed(ply({ ply: 3, studentMove: true }), three([0, 0, 0]));
    expect(unseen.score).toBe(40 + NEED_THRESHOLD); // prior 40 + unfamiliarity 50
    expect(unseen.speak).toBe(true);
    expect(unseen.prior).toBe(false); // the data alone cleared the bar
    const familiar = computeNeed(ply({ ply: 3, studentMove: true }), three([0, 0, FAMILIAR_REPS]));
    expect(familiar.score).toBe(40);
    expect(familiar.speak).toBe(false);
  });
  it('the opponent\'s move never has need', () => {
    expect(computeNeed(ply({ ply: 4, studentMove: false }), coldStudent(900)).speak).toBe(false);
  });
});

describe('needScore — the data takes over', () => {
  it('a mastered line (five correct reps, no holes, no departures) is SILENT', () => {
    const ctx = warm({ lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed(ply({ ply: 5, studentMove: true }), ctx);
    expect(v.speak).toBe(false);
    expect(v.prior).toBe(false);
    expect(familiarity(FAMILIAR_REPS)).toBe(1);
  });
  it('a never-seen line on a warm profile IS a need — and each correct rep decays it', () => {
    const never = computeNeed(ply({ ply: 5, studentMove: true }), warm({ lineReps: new Array(20).fill(0) }));
    expect(never.speak).toBe(true);
    expect(never.prior).toBe(false);
    const twice = computeNeed(ply({ ply: 5, studentMove: true }), warm({ lineReps: new Array(20).fill(2) }));
    expect(twice.speak).toBe(false); // 30 < 50 — decayed; needs a hole / departure / the thread
    expect(twice.score).toBeLessThan(never.score);
  });
  it('a persistent, worsening hole matching the ply\'s concept SPEAKS', () => {
    const ctx = warm({ signals: [forkHole], lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed(ply({ ply: 9, studentMove: true, conceptId: 'fork' }), ctx);
    expect(v.speak).toBe(true);
    expect(v.reasons.join(' ')).toMatch(/weakness: analysis:tactic:fork/);
  });
  it('the same hole does NOT fire on a ply whose concept is unrelated', () => {
    const ctx = warm({ signals: [forkHole], lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed(ply({ ply: 9, studentMove: true, conceptId: 'pin' }), ctx);
    expect(v.speak).toBe(false);
  });
  it('a habitual costly book departure at this ply SPEAKS even on a familiar line', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: 'italian', playedAt: 1 };
    const ctx = warm({ bookDepartures: [row], openingId: 'italian', lineReps: new Array(20).fill(FAMILIAR_REPS) });
    expect(computeNeed(ply({ ply: 7, studentMove: true }), ctx).speak).toBe(true);
    expect(computeNeed(ply({ ply: 13, studentMove: true }), ctx).speak).toBe(false); // elsewhere in the line
  });
  it('a departure in ANOTHER opening does not bleed into this one', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: 'sicilian', playedAt: 1 };
    const ctx = warm({ bookDepartures: [row], openingId: 'italian', lineReps: new Array(20).fill(FAMILIAR_REPS) });
    expect(computeNeed(ply({ ply: 7, studentMove: true }), ctx).speak).toBe(false);
  });
  it('a causal-thread ply plus a result deficit clears the bar together', () => {
    const ctx = warm({ lineReps: new Array(20).fill(FAMILIAR_REPS), openingScore: 0.3, overallScore: 0.55 });
    expect(computeNeed(ply({ ply: 11, studentMove: true, onThread: false }), ctx).speak).toBe(false);
    expect(computeNeed(ply({ ply: 11, studentMove: true, onThread: true }), ctx).speak).toBe(true);
  });
  it('score is clamped to 0–100', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: null, playedAt: 1 };
    const ctx = warm({ signals: [forkHole], bookDepartures: [row], lineReps: [], openingScore: 0, overallScore: 0.9 });
    const v = computeNeed(ply({ ply: 7, studentMove: true, conceptId: 'fork', onThread: true }), ctx);
    expect(v.score).toBe(100);
  });
});
