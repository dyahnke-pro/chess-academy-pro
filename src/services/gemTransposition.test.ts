// The gem calculator must fire on the POSITION, not on one stored move order
// (David 2026-08-01: "so when a chance for a gem arrives the coach can teach it
// on the fly?"). It ran on every ply but matched full-string SAN equality from
// move one, so the same board reached another way taught nothing.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computeGemCrush, findLivePunishment } from './gemCrushLines';
import { getAllPunishGems, isSurfaceableGem } from '../data/lessons/punishGems';

/** Reorder a gem's spine into a different legal move order reaching the SAME
 *  position, or null when no such reordering exists. */
const transpose = (sans: string[]): string[] | null => {
  for (let i = 0; i + 3 < sans.length; i += 2) {
    // Swap two adjacent full moves (i,i+1) with (i+2,i+3).
    const alt = [...sans];
    [alt[i], alt[i + 1], alt[i + 2], alt[i + 3]] = [alt[i + 2], alt[i + 3], alt[i], alt[i + 1]];
    const a = new Chess(); const b = new Chess();
    let ok = true;
    try {
      for (const s of alt) if (!a.move(s)) { ok = false; break; }
      for (const s of sans) b.move(s);
    } catch { ok = false; }
    if (!ok) continue;
    if (alt.join(' ') === sans.join(' ')) continue;
    if (a.fen().split(' ').slice(0, 4).join(' ') === b.fen().split(' ').slice(0, 4).join(' ')) return alt;
  }
  return null;
};

describe('gem calculator fires on the position, not the move order', () => {
  it('finds a gem reached by a different legal move order', () => {
    let tested = 0;
    for (const gem of getAllPunishGems()) {
      if (tested >= 5) break;
      if (!isSurfaceableGem(gem)) continue;
      const sans = gem.lineMoves.split(/\s+/).filter(Boolean);
      const alt = transpose(sans);
      if (!alt) continue;
      tested += 1;
      // The stored order works (it always did).
      expect(computeGemCrush(null, sans), `${gem.inaccuracy}: stored order`).not.toBeNull();
      // The transposed order reaches the SAME board, so it must work too.
      expect(computeGemCrush(null, alt), `${gem.inaccuracy}: transposed order`).not.toBeNull();
      // And the live-punish path, where the path includes the opponent's slip.
      expect(findLivePunishment(null, [...alt, gem.inaccuracy]), `${gem.inaccuracy}: live punish transposed`).not.toBeNull();
    }
    expect(tested, 'no transposable gem found to test').toBeGreaterThan(0);
    console.log(`transposition cases verified: ${tested}`);
  }, 120000);

  it('does not fire on a position that has no gem', () => {
    expect(computeGemCrush(null, ['a3', 'a6', 'b3', 'b6'])).toBeNull();
    expect(findLivePunishment(null, ['a3', 'a6', 'b3'])).toBeNull();
  });
});
