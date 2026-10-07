// One trap rule, two homes that cannot drift: the app's `isWeaponGem` and the
// audits' `isTrapGem` (scripts/audit-lib/trap-bar.mjs) must agree on every gem
// the app ships. An audit holding the old +0.5 rule demanded gems the app had
// correctly stopped surfacing (2026-10-07).
import { describe, it, expect } from 'vitest';
import { getAllPunishGems, isWeaponGem, TRAP_BAR_CP } from './punishGems';
// @ts-expect-error — .mjs audit helper, no types
import { isTrapGem, TRAP_BAR_CP as AUDIT_BAR } from '../../../scripts/audit-lib/trap-bar.mjs';

describe('the trap bar is one rule for the app and its audits', () => {
  it('same threshold', () => {
    expect(AUDIT_BAR).toBe(TRAP_BAR_CP);
  });
  it('same verdict on every shipped gem', () => {
    const gems = getAllPunishGems();
    const disagree = gems.filter((g) => isWeaponGem(g) !== (isTrapGem(g) as boolean));
    expect(gems.length).toBeGreaterThan(300);
    expect(disagree.map((g) => `${g.openingId}:${g.inaccuracy}`)).toEqual([]);
  });
});
