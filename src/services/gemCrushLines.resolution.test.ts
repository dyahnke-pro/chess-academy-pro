import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findLivePunishment, gemResolution } from './gemCrushLines';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';

// A REAL gem from the shipped set — the first surfaceable one that the live
// detector recognises from its own move path.
function aLiveGem(): { gem: NonNullable<ReturnType<typeof findLivePunishment>>; path: string[]; fen: string } {
  for (const g of getAllPunishGems().filter(isSurfaceableGem)) {
    const path = [...g.lineMoves.split(/\s+/).filter(Boolean), g.inaccuracy];
    const live = findLivePunishment(null, path);
    if (!live) continue;
    const c = new Chess();
    for (const s of path) c.move(s);
    return { gem: live, path, fen: c.fen() };
  }
  throw new Error('no live gem in the shipped set');
}

describe('gemResolution — narration, arrows and a walk after the student moves', () => {
  it('found it: confirms the punish and walks the whole stored line', () => {
    const { gem, fen } = aLiveGem();
    const r = gemResolution(gem, fen, gem.punish);
    expect(r?.found).toBe(true);
    expect(r?.say).toMatch(/^That's the punish\./);
    expect(r?.line.startFen).toBe(fen);
    expect(r?.line.plies[0].san.replace(/[+#]$/, '')).toBe(gem.punish.replace(/[+#]$/, ''));
    expect(r?.line.plies.length).toBe(gem.punishSeq.length);
  });
  it('missed it: names the chance, and still offers the same walk', () => {
    const { gem, fen } = aLiveGem();
    const other = new Chess(fen).moves().find((m) => m.replace(/[+#]$/, '') !== gem.punish.replace(/[+#]$/, ''))!;
    const r = gemResolution(gem, fen, other);
    expect(r?.found).toBe(false);
    expect(r?.say).toMatch(/^That was the chance/);
    expect(r?.line.plies.length).toBeGreaterThan(0);
  });
  it('NEGATIVE CONTROL: a gem about a different board says nothing', () => {
    const { gem } = aLiveGem();
    expect(gemResolution(gem, new Chess().fen(), 'e4')).toBeNull();
  });
});
