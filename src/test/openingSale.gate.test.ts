import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A BOUGHT OPENING IS OPEN, AND NEVER SPENDS THE FREE SLOT (openings à la
 * carte, David 2026-10-25). `canViewOpening` takes the owned list as a REQUIRED
 * argument; this pins that the page hands it the store's list (not an empty
 * stand-in) at every call, and that the free-slot claim steps aside for an
 * opening that was paid for.
 */
const PAGE = readFileSync(resolve(__dirname, '../components/Openings/OpeningDetailPage.tsx'), 'utf8');

describe('the opening page reads what was bought', () => {
  it('every canViewOpening call passes the owned openings from the store', () => {
    const calls = PAGE.match(/canViewOpening\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(1);
    for (const c of calls) expect(c).toMatch(/,\s*ownedOpeningIds\)$/);
    expect(PAGE).toMatch(/const \{[^}]*ownedOpeningIds[^}]*\} = useEntitlement\(\)/);
  });

  it('a bought opening never asks for, or spends, the free pick', () => {
    // The pick is claimed only from the free-pick confirm, and the confirm
    // shows only while `freePickOpen` — which excludes an owned opening.
    const open = PAGE.slice(PAGE.indexOf('const freePickOpen ='), PAGE.indexOf('freePickOpenRef.current = freePickOpen;'));
    expect(open).toContain('!ownedOpeningIds.includes(id)');
    expect(PAGE.match(/claimFreeOpening\(id\)/g) ?? []).toHaveLength(1);
    expect(PAGE.slice(PAGE.indexOf('const confirmFreePick'))).toMatch(/^const confirmFreePick[\s\S]*?claimFreeOpening\(id\)/);
  });

  it('every opening wall names its opening so it can sell just that one', () => {
    const walls = PAGE.match(/<PaywallPage\s+feature="opening"[\s\S]*?\/>/g) ?? [];
    expect(walls.length).toBe(2);
    for (const w of walls) expect(w).toMatch(/opening=\{\{ id: opening\.id, name: opening\.name \}\}/);
  });
});
