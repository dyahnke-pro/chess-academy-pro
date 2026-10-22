// WO-LAYERS-01 step 8 — strength matched in real time, ANCHORED to how real
// players at each rating play (David 2026-10-22: the old +60/−35 stepper read
// him 1679 from a 1414 seed and the coach won four games running).
import { describe, it, expect } from 'vitest';
import curve from '../data/move-quality-curve.json';
import { carryLiveStrength, CARRY_RD_MIN, lossBand, MISTAKE_CP, SEED_RD, startLiveStrength, updateLiveStrength, type LiveMove, type LiveStrength } from './liveStrength';

/** A board from the 9th move on (the curve's own filter). */
const MIDGAME = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/3P4/2NBPN2/PP3PPP/R2Q1RK1 w - - 0 9';
const OPENING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const move = (cpLoss: number | null, over: Partial<LiveMove> = {}): LiveMove => ({
  fenBefore: MIDGAME, cpLoss, evalBeforeMover: 20, prompted: false, coachMade: false, gem: false, ...over,
});
const play = (s: LiveStrength, ms: LiveMove[]): LiveStrength => ms.reduce(updateLiveStrength, s);

/** A player whose moves fall in the bands real players at `rating` play
 *  (the fitted curve), from a fixed seed so the test is repeatable. */
function simulated(rating: number, n: number, seed: number): LiveMove[] {
  const ge = curve.atLeast.map(({ D, S }) => 1 - 1 / (1 + Math.pow(10, -(rating - D) / S)));
  const at = { bands: [1 - ge[0], ...ge.map((g, i) => g - (ge[i + 1] ?? 0))] };
  let x = seed;
  const rnd = (): number => ((x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const cost = [10, 35, 75, 150, 250, 400];
  return Array.from({ length: n }, () => {
    let u = rnd(); let b = 0;
    while (b < 5 && u > at.bands[b]) { u -= at.bands[b]; b += 1; }
    return move(cost[b]);
  });
}

describe('liveStrength — read against real players, never a step size', () => {
  it('a seed is a guess: wide, centred where it was given', () => {
    const s = startLiveStrength(1414);
    expect(Math.abs(s.rating - 1414)).toBeLessThan(10);
    expect(s.rd).toBeGreaterThan(SEED_RD - 20);
  });

  it('a beginner seeded at the floor starts at the floor, not 640 (the prior is not cut in half)', () => {
    expect(startLiveStrength(400).rating).toBeLessThan(470);
  });

  it('the cost bands match the curve', () => {
    expect([0, 19, 20, 99, 100, 299, 300, 900].map(lossBand)).toEqual([0, 0, 1, 2, 3, 4, 5, 5]);
  });

  it('what is not evidence moves nothing', () => {
    const s = startLiveStrength(1414);
    expect(updateLiveStrength(s, move(null)), 'ungraded').toBe(s);
    expect(updateLiveStrength(s, move(0, { evalBeforeMover: null })), 'unknown board').toBe(s);
    expect(updateLiveStrength(s, move(400, { evalBeforeMover: 450 })), 'a decided game').toBe(s);
    expect(updateLiveStrength(s, move(0, { fenBefore: OPENING })), 'book territory').toBe(s);
    expect(updateLiveStrength(s, move(0, { prompted: true })), 'the coach said something first').toBe(s);
    expect(updateLiveStrength(s, move(400, { prompted: true })), '…either way').toBe(s);
  });

  it('a find on a chance the COACH made earns nothing; missing it still counts', () => {
    const s = startLiveStrength(1414);
    expect(updateLiveStrength(s, move(0, { coachMade: true }))).toBe(s);
    expect(updateLiveStrength(s, move(MISTAKE_CP - 1, { coachMade: true }))).toBe(s);
    expect(updateLiveStrength(s, move(400, { coachMade: true })).rating).toBeLessThan(s.rating);
  });

  it('a known opening slip counts before the 9th move', () => {
    const s = startLiveStrength(1414);
    expect(updateLiveStrength(s, move(400, { fenBefore: OPENING, gem: true })).rating).toBeLessThan(s.rating);
  });

  it('a blunder lowers it, a precise move raises it — by evidence, never 300 points at once', () => {
    const s = startLiveStrength(1414);
    const down = updateLiveStrength(s, move(400));
    const up = updateLiveStrength(s, move(5));
    expect(down.rating).toBeLessThan(s.rating);
    expect(up.rating).toBeGreaterThan(s.rating);
    expect(s.rating - down.rating).toBeLessThan(150);
    expect(down.evidence).toBe(1);
  });

  it('THE REGRESSION: David\'s six counted moves (five clean, one miss) no longer read 1679', () => {
    // The old stepper: 1414 + 5 × 60 − 35 = 1679, and the coach played to it.
    const s = play(startLiveStrength(1414), [move(30), move(30), move(250), move(30), move(30), move(30)]);
    expect(s.rating).toBeLessThan(1500);
  });

  it('THE ANCHOR: a player is read near their real strength, from a seed far away', () => {
    for (const [truth, seedRating] of [[1000, 1414], [1400, 900], [1900, 1414]] as const) {
      const reads = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => play(startLiveStrength(seedRating), simulated(truth, 400, k * 7919)).rating);
      const mean = reads.reduce((a, b) => a + b, 0) / reads.length;
      expect(Math.abs(mean - truth), `truth ${truth}, seed ${seedRating}: read ${reads.join(', ')}`).toBeLessThan(200);
    }
  });

  it('the next game starts from where the last ended, never surer than the floor', () => {
    const c = carryLiveStrength({ rating: 1200, rd: 40, evidence: 300 });
    expect(Math.abs(c.rating - 1200)).toBeLessThan(10);
    expect(c.rd).toBeGreaterThanOrEqual(CARRY_RD_MIN - 5);
    expect(c.evidence).toBe(300);
  });
});

describe('gem hits place the player (the strongest early signal)', () => {
  it('walking into a gem is read before the 9th move; the signal names walked-into, punished, missed', async () => {
    const { Chess } = await import('chess.js');
    const { getAllPunishGems, isSurfaceableGem } = await import('../data/lessons/punishGems');
    const { gemMoveSignal, warmGemIndexes } = await import('./gemCrushLines');
    const { vi } = await import('vitest');
    const gem = getAllPunishGems().find(isSurfaceableGem);
    expect(gem, 'no surfaceable gem in the data').toBeTruthy();
    if (!gem) return;
    const c = new Chess();
    for (const san of gem.lineMoves.split(/\s+/).filter(Boolean)) c.move(san);
    const beforeSlip = c.fen();
    // Cold: the index is never built on the move path — no signal yet.
    expect(gemMoveSignal(beforeSlip, gem.inaccuracy)).toBeNull();
    warmGemIndexes();
    await vi.waitFor(() => expect(gemMoveSignal(beforeSlip, gem.inaccuracy)).toBe('walked-into'), { timeout: 20000, interval: 50 });
    c.move(gem.inaccuracy);
    const afterSlip = c.fen();
    expect(gemMoveSignal(afterSlip, gem.punishSeq[0] ?? gem.punish)).toBe('punished');
    const other = c.moves().find((m) => m.replace(/[+#]/g, '') !== (gem.punishSeq[0] ?? gem.punish).replace(/[+#]/g, ''));
    if (other) expect(gemMoveSignal(afterSlip, other)).toBe('missed-punish');
    expect(gemMoveSignal(new Chess().fen(), 'a3')).toBeNull();

    // Read by its cost like every move — before the 9th move only because it
    // is a gem (no step size: a walked-into gem's cost is what lowers it).
    const s = startLiveStrength(1000);
    expect(updateLiveStrength(s, { fenBefore: beforeSlip, cpLoss: 250, evalBeforeMover: 0, prompted: false, coachMade: false, gem: true }).rating).toBeLessThan(1000);
    expect(updateLiveStrength(s, { fenBefore: beforeSlip, cpLoss: 250, evalBeforeMover: 0, prompted: false, coachMade: false, gem: false }), 'no gem: book territory').toBe(s);
  }, 30000);
});
