import { describe, expect, it } from 'vitest';
import { rankWeaknesses, MAX_TARGETS, type MeterReading } from './weakness';
import { MISSIONS, type MissionRecordRow } from './registry';
import type { MissionCard, MissionOutcome } from './missionCard';

const DC = MISSIONS['develop-and-castle'];
const FP = MISSIONS['free-piece-stay-ahead'];
let clock = 0;
const rows = (card: MissionCard, ...outcomes: MissionOutcome[]): MissionRecordRow[] =>
  outcomes.map((outcome) => ({ missionId: card.id, outcome, at: ++clock }));

describe('the weakest taught habits (a boss reads these)', () => {
  it('ranks by the record: more misses, weaker', () => {
    const r = [...rows(DC, 'pass-first-try', 'missed', 'pass-first-try'), ...rows(FP, 'missed', 'miss-shown', 'pass-retry')];
    const t = rankWeaknesses([DC, FP], 4, r, []);
    expect(t.map((x) => x.cardId)).toEqual(['free-piece-stay-ahead', 'develop-and-castle']);
    expect(t[0]).toMatchObject({ misses: 2.5, games: 3, pattern: 'free-piece', skill: 'threats' });
  });

  it('a habit with no evidence is never a target — grey is not weak', () => {
    expect(rankWeaknesses([DC, FP], 4, [], [])).toEqual([]);
    // Clean on the record and no meter: nothing to go after.
    expect(rankWeaknesses([DC], 4, rows(DC, 'pass-first-try', 'pass-first-try'), [])).toEqual([]);
  });

  it('an unreached game counts for nothing either way', () => {
    expect(rankWeaknesses([FP], 4, rows(FP, 'incomplete', 'incomplete', 'missed'), [])[0]).toMatchObject({ games: 1, misses: 1, score: 1 });
  });

  it('only habits taught at or below the tier are eligible', () => {
    const later: MissionCard = { ...FP, id: 'free-piece-stay-ahead', level: 5 };
    expect(rankWeaknesses([later], 4, rows(FP, 'missed', 'missed'), [])).toEqual([]);
  });

  it('the skill meter counts: a habit whose meter sits below the student average is weaker', () => {
    const meters: MeterReading[] = [
      { id: 'development', rating: 1000, rated: true },
      { id: 'threats', rating: 1400, rated: true },
    ];
    const t = rankWeaknesses([DC, FP], 4, [], meters);
    expect(t.map((x) => x.cardId)).toEqual(['develop-and-castle']);
    expect(t[0].score).toBeCloseTo(0.5);
    // An unrated meter is no evidence.
    expect(rankWeaknesses([DC], 4, [], [{ id: 'development', rating: 600, rated: false }])).toEqual([]);
  });

  it(`never more than ${MAX_TARGETS}`, () => {
    const cards = [1, 2, 3, 4].map((level) => ({ ...FP, id: `free-piece-stay-ahead`, level }) as MissionCard);
    expect(rankWeaknesses(cards, 4, rows(FP, 'missed'), []).length).toBeLessThanOrEqual(MAX_TARGETS);
  });
});
