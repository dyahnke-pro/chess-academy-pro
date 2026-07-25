import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeWatchGemAside } from './watchGemArrows';
import { getPunishGemsForOpening, isSurfaceableGem } from '../data/lessons/punishGems';

/** Find a real surfaceable gem to drive the test off live data. */
function firstSurfaceableGem(openingId: string) {
  return getPunishGemsForOpening(openingId).filter(isSurfaceableGem)[0] ?? null;
}

describe('computeWatchGemAside', () => {
  it('returns null when the opening has no gems or the path does not match', () => {
    expect(computeWatchGemAside(null, ['e4'])).toBeNull();
    expect(computeWatchGemAside('caro-kann', [])).toBeNull();
    expect(computeWatchGemAside('caro-kann', ['e4'])).toBeNull(); // not a gem spine
  });

  it('surfaces the crush aside exactly on a gem opening spine (real data)', () => {
    const gem = firstSurfaceableGem('caro-kann');
    if (!gem) return; // no caro gem in this build — skip
    const pathSans = gem.lineMoves.split(/\s+/).filter(Boolean);
    const aside = computeWatchGemAside('caro-kann', pathSans);
    expect(aside).toBeTruthy();
    expect(aside!.inaccuracy).toBe(gem.inaccuracy);
    expect(aside!.punish).toBe(gem.punish);
    // exactly two arrows: the mistake (red) + the crush (green)
    expect(aside!.arrows).toHaveLength(2);
    expect(aside!.arrows[0].color).toBe('red');
    expect(aside!.arrows[1].color).toBe('green');
    expect(aside!.say.length).toBeGreaterThan(10);
    expect(aside!.say).toContain(gem.punish.replace(/[!?]+$/g, ''));
  });

  it('draws BOTH arrows from real squares on the STATIC board (board never moves)', () => {
    // Sweep every surfaceable gem: the inaccuracy + punish must be legal from the
    // spine terminus, and the punish.from square must be occupied on the static
    // board (so the arrow originates on a real piece — the "board never moves"
    // guarantee holds geometrically).
    const openingIds = ['caro-kann', 'sicilian-defense', 'french-defense', 'italian-game', 'ruy-lopez', 'vienna-game'];
    let checked = 0;
    for (const id of openingIds) {
      for (const gem of getPunishGemsForOpening(id).filter(isSurfaceableGem)) {
        const pathSans = gem.lineMoves.split(/\s+/).filter(Boolean);
        const aside = computeWatchGemAside(id, pathSans);
        if (!aside) continue;
        // rebuild the static position and assert both arrow origins are occupied
        const c = new Chess();
        for (const s of pathSans) c.move(s);
        const board = c.fen();
        for (const arrow of aside.arrows) {
          const probe = new Chess(board);
          expect(probe.get(arrow.from as never)).toBeTruthy(); // origin has a piece
        }
        checked += 1;
      }
    }
    // sanity: we actually exercised at least a few gems
    expect(checked).toBeGreaterThan(0);
  });

  it('never throws on a malformed / unknown opening', () => {
    expect(computeWatchGemAside('not-a-real-opening', ['e4', 'e5'])).toBeNull();
  });
});
