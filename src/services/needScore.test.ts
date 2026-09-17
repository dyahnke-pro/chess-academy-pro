// needScore — the student term of importance (unified-coach N2). The contract
// from the CLAUDE.md standard: cold start TEACHES; a mastered line is SILENT; a
// hole this student keeps falling in SPEAKS; a habitual book departure SPEAKS;
// the opponent's move never has need.
import { describe, it, expect } from 'vitest';
import { computeNeed, coldStudent, coldStartPrior, familiarity, NEED_THRESHOLD, COLD_START_GAMES, FAMILIAR_REPS, type StudentNeedContext } from './needScore';
import type { WeaknessSignal } from './weaknessSignal';
import type { BookDepartureRow } from './bookDepartureWeakness';

const forkHole: WeaknessSignal = {
  clusterId: 'analysis:tactic:fork', bucket: 'tactical', label: 'Forks', openCount: 4, severity: 70,
  lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: ['fork'],
};

const warm = (over: Partial<StudentNeedContext> = {}): StudentNeedContext => ({
  rating: 1500, gamesPlayed: COLD_START_GAMES + 10, signals: [], bookDepartures: [], ...over,
});

describe('needScore — cold start defaults to TEACH', () => {
  it('a fresh install: every band clears the bar on the prior', () => {
    for (const rating of [800, 1200, 1600, 2200]) {
      const v = computeNeed({ ply: 3, studentMove: true }, coldStudent(rating));
      expect(v.speak, `rating ${rating}`).toBe(true);
      expect(v.prior).toBe(true);
      expect(coldStartPrior()).toBeGreaterThanOrEqual(NEED_THRESHOLD);
    }
  });
  it('weaker bands get a higher prior than stronger ones (their teaching leads a tie-break)', () => {
    // NO LONGER A RATING LADDER (2026-09-17). It took a rating, which is the
    // axis the capability model rejects — and for any student who never
    // imported games that rating is the profile default of 800 for life, so the
    // band measured nothing. A cold student has no evidence, every capability
    // is UNKNOWN, and unknown means teach it: one ceiling, no parameter.
    expect(coldStartPrior()).toBe(100);
    expect(coldStartPrior.length, 'the prior must take NO rating').toBe(0);
  });
  it('the opponent\'s move never has need', () => {
    expect(computeNeed({ ply: 4, studentMove: false }, coldStudent(900)).speak).toBe(false);
  });
});

describe('needScore — the data takes over', () => {
  it('a mastered line (five correct reps, no holes, no departures) is SILENT', () => {
    const ctx = warm({ lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed({ ply: 5, studentMove: true }, ctx);
    expect(v.speak).toBe(false);
    expect(v.prior).toBe(false);
    expect(familiarity(FAMILIAR_REPS)).toBe(1);
  });
  it('a never-seen line on a warm profile IS a need — and each correct rep decays it', () => {
    const never = computeNeed({ ply: 5, studentMove: true }, warm({ lineReps: new Array(20).fill(0) }));
    expect(never.speak).toBe(true);
    expect(never.prior).toBe(false);
    const twice = computeNeed({ ply: 5, studentMove: true }, warm({ lineReps: new Array(20).fill(2) }));
    expect(twice.speak).toBe(false); // 30 < 50 — decayed; needs a hole / departure / the thread
    expect(twice.score).toBeLessThan(never.score);
  });
  it('a persistent, worsening hole matching the ply\'s concept SPEAKS', () => {
    const ctx = warm({ signals: [forkHole], lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed({ ply: 9, studentMove: true, conceptId: 'fork' }, ctx);
    expect(v.speak).toBe(true);
    expect(v.reasons.join(' ')).toMatch(/weakness: analysis:tactic:fork/);
  });
  it('the same hole does NOT fire on a ply whose concept is unrelated', () => {
    const ctx = warm({ signals: [forkHole], lineReps: new Array(20).fill(FAMILIAR_REPS) });
    const v = computeNeed({ ply: 9, studentMove: true, conceptId: 'pin' }, ctx);
    expect(v.speak).toBe(false);
  });
  it('a habitual costly book departure at this ply SPEAKS even on a familiar line', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: 'italian', playedAt: 1 };
    const ctx = warm({ bookDepartures: [row], openingId: 'italian', lineReps: new Array(20).fill(FAMILIAR_REPS) });
    expect(computeNeed({ ply: 7, studentMove: true }, ctx).speak).toBe(true);
    expect(computeNeed({ ply: 13, studentMove: true }, ctx).speak).toBe(false); // elsewhere in the line
  });
  it('a departure in ANOTHER opening does not bleed into this one', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: 'sicilian', playedAt: 1 };
    const ctx = warm({ bookDepartures: [row], openingId: 'italian', lineReps: new Array(20).fill(FAMILIAR_REPS) });
    expect(computeNeed({ ply: 7, studentMove: true }, ctx).speak).toBe(false);
  });
  it('a causal-thread ply plus a result deficit clears the bar together', () => {
    const ctx = warm({ lineReps: new Array(20).fill(FAMILIAR_REPS), openingScore: 0.3, overallScore: 0.55 });
    expect(computeNeed({ ply: 11, studentMove: true, onThread: false }, ctx).speak).toBe(false);
    expect(computeNeed({ ply: 11, studentMove: true, onThread: true }, ctx).speak).toBe(true);
  });
  it('score is clamped to 0–100', () => {
    const row: BookDepartureRow = { gameId: 'g1', departurePly: 7, departedSan: 'a6', mainSan: 'Nf6', bookFen: 'x', evalCostCp: 120, openingId: null, playedAt: 1 };
    const ctx = warm({ signals: [forkHole], bookDepartures: [row], lineReps: [], openingScore: 0, overallScore: 0.9 });
    const v = computeNeed({ ply: 7, studentMove: true, conceptId: 'fork', onThread: true }, ctx);
    expect(v.score).toBe(100);
  });
});
