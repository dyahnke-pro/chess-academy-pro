import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import { __setHisPlayDbForTests, __resetHisPlayDbForTests } from './hisPlayLookup';
import { __setLocalDbForTests, __resetLocalDbForTests } from './masterPlayLookup';
import { buildHisGroundedPlanBeat, buildMastersGroundedPlanBeat } from './reviewStrategicOrientation';

const key = (fen: string): string => fen.split(/\s+/).slice(0, 4).join(' ');
const fenAfter = (sans: string[]): string => { const c = new Chess(); sans.forEach((m) => c.move(m)); return c.fen(); };

// Black to move after 1.e4 c5 2.Nc3 (his defensive tabiya).
const tabiya = fenAfter(['e4', 'c5', 'Nc3']);

afterEach(() => { __resetHisPlayDbForTests(); __resetLocalDbForTests(); });

describe('grounded opening-plan beats', () => {
  it('his beat speaks his grounded plan (depersonalized, no "his")', () => {
    __setHisPlayDbForTests({
      [key(tabiya)]: { total: 200, moves: [{ san: 'd6', games: 120, w: 70, d: 20, l: 30 }] },
      [key(fenAfter(['e4', 'c5', 'Nc3', 'd6']))]: { total: 100, moves: [{ san: 'Nf3', games: 80, w: 40, d: 20, l: 20 }] },
    });
    const beat = buildHisGroundedPlanBeat(tabiya, 'b', 'Sicilian Defense');
    expect(beat).not.toBeNull();
    expect(beat!.text).toContain("Black's plan is …d6");
    expect(beat!.text.toLowerCase()).not.toContain(' his '); // never attributes
    expect(beat!.arrows.length).toBeGreaterThan(0);
  });

  it('his beat is null on the wrong side (only the student side is grounded)', () => {
    __setHisPlayDbForTests({ [key(tabiya)]: { total: 200, moves: [{ san: 'd6', games: 120, w: 70, d: 20, l: 30 }] } });
    // tabiya is Black-to-move; asking for White returns null.
    expect(buildHisGroundedPlanBeat(tabiya, 'w', 'Sicilian Defense')).toBeNull();
  });

  it('masters beat speaks the main line when the position is in the masters DB', () => {
    __setLocalDbForTests({
      positions: {
        [key(tabiya)]: [{ san: 'd6', games: 800 }, { san: 'Nc6', games: 500 }],
        [key(fenAfter(['e4', 'c5', 'Nc3', 'd6']))]: [{ san: 'Nf3', games: 400 }],
      },
    } as never);
    const beat = buildMastersGroundedPlanBeat(tabiya, 'b', 'Sicilian Defense');
    expect(beat).not.toBeNull();
    expect(beat!.text).toContain('main line');
    expect(beat!.text).toContain('master games');
  });

  it('masters beat is null on a thin position (below MASTERS_PLAN_MIN_GAMES)', () => {
    __setLocalDbForTests({ positions: { [key(tabiya)]: [{ san: 'd6', games: 5 }] } } as never);
    expect(buildMastersGroundedPlanBeat(tabiya, 'b', 'Sicilian Defense')).toBeNull();
  });

  it('both null → the chain yields nothing (no generic template)', () => {
    __resetHisPlayDbForTests();
    __resetLocalDbForTests();
    expect(buildHisGroundedPlanBeat(tabiya, 'b', 'Sicilian Defense')).toBeNull();
    expect(buildMastersGroundedPlanBeat(tabiya, 'b', 'Sicilian Defense')).toBeNull();
  });
});
