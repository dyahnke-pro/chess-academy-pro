import { describe, it, expect, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import {
  __setHisPlayDbForTests,
  __resetHisPlayDbForTests,
  lookupHisPlaySync,
  hisGroundedPlanSync,
  HIS_PLAN_MIN_GAMES,
} from './hisPlayLookup';

// Small fixture keyed by positionFen (first 4 FEN fields), mirroring the real
// danya-play-db.json shape. Black-to-move after 1.e4 c5 2.Nc3 (his defense) and
// the follow-ups, so hisGroundedPlanSync can walk a short grounded line.
const startFen = (() => { const c = new Chess(); ['e4', 'c5', 'Nc3'].forEach((m) => c.move(m)); return c.fen(); })();
const key = (fen: string): string => fen.split(/\s+/).slice(0, 4).join(' ');
const fenAfter = (sans: string[]): string => { const c = new Chess(); sans.forEach((m) => c.move(m)); return c.fen(); };

const DB = {
  [key(startFen)]: { total: 2270, moves: [
    // d6 is both most-played AND his best-scoring (so it's the taught plan-move).
    { san: 'd6', games: 829, w: 560, d: 60, l: 209 },
    { san: 'Nc6', games: 790, w: 371, d: 100, l: 319 },
    { san: 'e6', games: 424, w: 240, d: 80, l: 104 },
  ] },
  [key(fenAfter(['e4', 'c5', 'Nc3', 'd6']))]: { total: 800, moves: [
    { san: 'Nf3', games: 500, w: 250, d: 100, l: 150 },
  ] },
  [key(fenAfter(['e4', 'c5', 'Nc3', 'd6', 'Nf3']))]: { total: 480, moves: [
    { san: 'Nc6', games: 300, w: 170, d: 40, l: 90 },
  ] },
};

const apply = (fen: string, san: string): string | null => {
  try { const c = new Chess(fen); c.move(san); return c.fen(); } catch { return null; }
};

afterEach(() => __resetHisPlayDbForTests());

describe('hisPlayLookup', () => {
  it('returns his recorded moves at a known position', () => {
    __setHisPlayDbForTests(DB);
    const hit = lookupHisPlaySync(startFen);
    expect(hit).not.toBeNull();
    expect(hit!.total).toBe(2270);
    expect(hit!.moves[0].san).toBe('d6');
  });

  it('returns null for an unknown position (falls through to masters)', () => {
    __setHisPlayDbForTests(DB);
    expect(lookupHisPlaySync(fenAfter(['d4', 'd5', 'c4']))).toBeNull();
  });

  it('returns null when the DB is not loaded', () => {
    __resetHisPlayDbForTests();
    expect(lookupHisPlaySync(startFen)).toBeNull();
  });

  it('builds a grounded plan by following his top move per ply', () => {
    __setHisPlayDbForTests(DB);
    const plan = hisGroundedPlanSync(startFen, apply, 6);
    expect(plan).not.toBeNull();
    expect(plan!.side).toBe('b');
    expect(plan!.line[0]).toBe('d6');
    expect(plan!.sideMoves[0]).toBe('d6');
    expect(plan!.leadGames).toBe(829);
    expect(plan!.leadWinPct).toBe(Math.round((100 * 560) / 829));
    // walks into the follow-up positions present in the fixture
    expect(plan!.line).toContain('Nf3');
  });

  it('refuses to call a thin position "his plan" (below HIS_PLAN_MIN_GAMES)', () => {
    __setHisPlayDbForTests({
      [key(startFen)]: { total: HIS_PLAN_MIN_GAMES - 1, moves: [{ san: 'd6', games: 5, w: 3, d: 1, l: 1 }] },
    });
    expect(hisGroundedPlanSync(startFen, apply, 6)).toBeNull();
  });

  it('drops a frequent-but-LOSING plan to masters (win-rate gate) — the Barry Attack case', () => {
    // His most-played move here scores badly (18%W, no draws) — teaching it
    // would teach a losing plan, so hisGroundedPlanSync returns null.
    __setHisPlayDbForTests({
      [key(startFen)]: { total: 22, moves: [{ san: 'd6', games: 22, w: 4, d: 0, l: 18 }] },
    });
    expect(hisGroundedPlanSync(startFen, apply, 6)).toBeNull();
  });

  it('picks his best-scoring FREQUENT move, not merely the most-played', () => {
    // d6: most-played but 30% score; e6: nearly as frequent and 65% score → e6 wins.
    __setHisPlayDbForTests({
      [key(startFen)]: { total: 200, moves: [
        { san: 'd6', games: 100, w: 25, d: 10, l: 65 },
        { san: 'e6', games: 90, w: 55, d: 8, l: 27 },
      ] },
    });
    const plan = hisGroundedPlanSync(startFen, apply, 2);
    expect(plan).not.toBeNull();
    expect(plan!.sideMoves[0]).toBe('e6');
  });
});
