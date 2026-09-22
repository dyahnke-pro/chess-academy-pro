// homeOpeningPlan — the Training Plan is built from the home openings and the
// recorded weaknesses INSIDE them (WO-HOME-OPENING-01 A4).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildGameRecord, buildUserProfile, resetFactoryCounter } from '../test/factories';
import { openingKeyFor } from './openingKey';
import type { BookDepartureRow } from './bookDepartureWeakness';
import type { UnifiedWeakness } from './weaknessSpine';
import type { HomeOpeningChoice } from './homeOpening';
import type { GameRecord, MiddlegamePlan, OpeningKey } from '../types';

const spineRows: UnifiedWeakness[] = [];
const departureRows: BookDepartureRow[] = [];
vi.mock('./weaknessSpine', () => ({ getUnifiedWeaknessProfile: async () => spineRows }));
vi.mock('./bookDeparturePrecompute', () => ({ getCachedBookDepartureRows: async () => departureRows }));
vi.mock('./appAuditor', () => ({ logAppAudit: async () => undefined }));
vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { id: 'main', name: 'S', currentRating: 1500, preferences: { chessComUsername: 'student' } }, setActiveProfile: () => undefined }) },
}));
vi.mock('./gameAnalysisService', () => ({
  gameNeedsAnalysis: (g: GameRecord) => g.fullyAnalyzed !== true,
}));

import { homePlanFor, buildHomeOpeningPlan } from './homeOpeningPlan';
import { rankHomeOpeningCandidates, toChoice } from './homeOpening';
import { db } from '../db/schema';
import { __resetHomeOpeningCacheForTests } from './homeOpeningService';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const PIRC_AUSTRIAN = openingKeyFor('B09', 'Pirc Defense: Austrian Attack');
const ID = { chessComUsername: 'student' };

function pirc(key: OpeningKey, n: number, winRate: number, tag: string, analysed: boolean): GameRecord[] {
  return Array.from({ length: n }, (_, i) => buildGameRecord({
    id: `${tag}-${i}`, openingId: key, white: 'opp', black: 'student', result: i < Math.round(n * winRate) ? '0-1' : '1-0',
    fullyAnalyzed: analysed, annotations: analysed ? [] : null,
  }));
}
const weakness = (over: Partial<UnifiedWeakness>): UnifiedWeakness => ({
  key: 'analysis:tactic:fork', tag: 'analysis:tactic:fork', label: 'Missed forks', bucket: 'tactical', openCount: 3, total: 3, severity: 60,
  sources: ['analysis'], puzzleThemes: ['fork'], positions: [], lastSeenAt: 1, gameIds: [], lastDrilledAt: null, capabilityTag: null, ...over,
});

describe('homePlanFor — the reps inside the home opening', () => {
  const games = [...pirc(PIRC, 20, 0.6, 'p', true), ...pirc(PIRC_AUSTRIAN, 8, 0.25, 'a', false)];
  const ranking = rankHomeOpeningCandidates(games, ID, 'black');
  const candidate = ranking.candidates[0];
  const choice: HomeOpeningChoice = toChoice(candidate, 'computed', 1);

  it('analyse → weakest line → departure → fundamentals inside those games → the middlegame plan', () => {
    const dep = (gameId: string): BookDepartureRow => ({ gameId, departurePly: 6, departedSan: 'e5', mainSan: 'Nf6', bookFen: 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 0 3', evalCostCp: 90, openingId: PIRC, playedAt: 1 });
    const plan = { id: 'mp-pirc', openingId: 'pirc-defense', title: 'The …c5 break', criticalPositionFen: 'x', overview: '', pawnBreaks: [], pieceManeuvers: [], strategicThemes: [] } as unknown as MiddlegamePlan;
    const s = homePlanFor({
      colour: 'black', choice, candidate, homeGames: games,
      weaknesses: [
        weakness({ key: 'a', label: 'Missed forks', gameIds: ['p-1', 'p-2', 'other-9'] }),
        weakness({ key: 'b', label: 'Left a piece loose', gameIds: ['p-3'], severity: 90 }),
        weakness({ key: 'c', label: 'Not in the home games', gameIds: ['other-1', 'other-2'] }),
        weakness({ key: 'd', label: 'Closed already', gameIds: ['p-1'], openCount: 0 }),
      ],
      departures: [dep('p-1'), dep('p-2'), dep('other-3'), { ...dep('p-4'), departurePly: 9, departedSan: 'h6', mainSan: 'c5', bookFen: 'other fen here x' }],
      plan,
    });
    expect(s.games).toBe(28);
    expect(s.analysed).toBe(20);
    expect(s.reps.map((r) => r.kind)).toEqual(['analyse', 'weakest-line', 'departure', 'fundamental', 'fundamental', 'middlegame-plan']);
    expect(s.reps[0].subtitle).toMatch(/8 of your 28 Pirc Defense games/);
    expect(s.reps[1].subtitle).toMatch(/Pirc Defense: Austrian Attack: 25% over 8 games/);
    expect(s.reps[1].route.path).toBe(`/openings/${PIRC_AUSTRIAN}`);
    expect(s.reps[2].subtitle).toMatch(/Move 3: …e5 instead of …Nf6, in 2 games/); // the other-3 row is not a home game; the h6 row is one game
    expect(s.reps[3].label).toBe('Missed forks');
    expect(s.reps[3].subtitle).toMatch(/In 2 of your Pirc Defense games/);
    expect(s.reps[4].label).toBe('Left a piece loose');
    expect(s.reps[3].route.path).toBe('/tactics/adaptive');
    expect(s.reps[5].label).toBe('Middlegame plan: The …c5 break');
    expect(s.reps[5].route.path).toContain('/coach/session/middlegame?subject=');
  });

  it('nothing recorded inside it → no reps, honestly (never an invented one)', () => {
    const all = pirc(PIRC, 12, 0.5, 'p', true);
    const r = rankHomeOpeningCandidates(all, ID, 'black');
    const s = homePlanFor({ colour: 'black', choice: toChoice(r.candidates[0], 'computed', 1), candidate: r.candidates[0], homeGames: all, weaknesses: [], departures: [], plan: null });
    expect(s.reps).toEqual([]);
  });
});

describe('buildHomeOpeningPlan — from the record on disk', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    spineRows.length = 0;
    departureRows.length = 0;
    __resetHomeOpeningCacheForTests();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', preferences: { ...buildUserProfile().preferences, chessComUsername: 'student' } }));
  });

  it('with a knight_mare-shaped record the plan is non-empty and names the Pirc', async () => {
    await db.games.bulkPut([...pirc(PIRC, 40, 0.49, 'p', false), ...pirc(PIRC_AUSTRIAN, 23, 0.4, 'a', false)]);
    spineRows.push(weakness({ key: 'a', label: 'Missed forks', gameIds: ['p-1', 'a-2'] }));
    const plan = await buildHomeOpeningPlan();
    expect(plan.white).toBeNull();
    expect(plan.black?.choice.family).toBe('Pirc Defense');
    expect(plan.black?.games).toBe(63);
    // The corpus has Pirc middlegame plans, so the plan rep is real, not seeded.
    expect(plan.black?.reps.map((r) => r.kind)).toEqual(['analyse', 'weakest-line', 'fundamental', 'middlegame-plan']);
    expect(plan.black?.reps[3].label).toMatch(/^Middlegame plan: /);
    expect(plan.black?.reps[0].subtitle).toMatch(/63 of your 63 Pirc Defense games/);
  });

  it('no games → both null', async () => {
    const plan = await buildHomeOpeningPlan();
    expect(plan).toEqual({ white: null, black: null });
  });
});
