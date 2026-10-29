/**
 * A gem's label on the opening page, tested against the REAL gem file. The
 * Vienna makes the move number concrete — two traps punished after `Qf6`, two
 * after `Nge7`; slip and punish alone would print duplicate labels.
 */
import { describe, it, expect } from 'vitest';
import { gemChipLabel } from './gemTrapMenu';
import { getPunishGemsForOpening, isSurfaceableGem } from './punishGems';

const vienna = getPunishGemsForOpening('vienna-game').filter(isSurfaceableGem);

describe('gemChipLabel', () => {
  it('reads as something a person can act on', () => {
    expect(vienna.length).toBeGreaterThan(0);
    for (const g of vienna) expect(gemChipLabel(g)).toMatch(/^Opponent plays \d+(…|\.)\S+ — punish with \S+$/);
  });

  it('labels every Vienna trap uniquely, the two Qf6 traps included', () => {
    const labels = vienna.map(gemChipLabel);
    expect(new Set(labels).size).toBe(labels.length);
    const qf6 = vienna.filter((g) => g.inaccuracy === 'Qf6').map(gemChipLabel);
    expect(qf6.length, 'expected the Vienna to still have two Qf6 gems').toBe(2);
    expect(qf6[0]).not.toBe(qf6[1]);
  });
});
