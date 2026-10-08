import { describe, it, expect } from 'vitest';
import { getAllPunishGems, getPunishGemsForOpening, getPunishGemsForTab } from './punishGems';

// The punish-the-mistake sections list the slip the student will meet MOST
// first (David 2026-10-08) — by games in which the opponent played it, not by
// engine strength and not by freqPct (a share of one position's games).
describe('punish gems are ordered most common first', () => {
  const openingIds = [...new Set(getAllPunishGems().map((g) => g.openingId))];

  it('every opening returns its gems in descending games', () => {
    for (const id of openingIds) {
      const games = getPunishGemsForOpening(id).map((g) => g.games);
      expect(games, id).toEqual([...games].sort((a, b) => b - a));
    }
  });

  it('a variation tab keeps the same order', () => {
    const gems = getPunishGemsForOpening('caro-kann');
    const tab = getPunishGemsForTab('caro-kann', gems[0].lineMoves).map((g) => g.games);
    expect(tab).toEqual([...tab].sort((a, b) => b - a));
  });

  it('Caro-Kann: the move-3 f3 slip (666k games) leads, not the 25.8% Qb3 in a rare position', () => {
    const order = getPunishGemsForOpening('caro-kann').map((g) => g.inaccuracy);
    expect(order[0]).toBe('f3');
    expect(order.indexOf('f3')).toBeLessThan(order.indexOf('Qb3'));
  });
});
