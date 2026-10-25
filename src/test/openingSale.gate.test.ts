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
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const c of calls) expect(c).toMatch(/,\s*ownedOpeningIds\)$/);
    expect(PAGE).toMatch(/const \{[^}]*ownedOpeningIds[^}]*\} = useEntitlement\(\)/);
  });

  it('the free-slot claim returns before claiming an owned opening', () => {
    const effect = PAGE.slice(PAGE.indexOf('// Claim the ONE free opening'), PAGE.indexOf('void claimFreeOpening(id)'));
    expect(effect).toContain('if (ownedOpeningIds.includes(id)) return;');
  });

  it('the drill wall names its opening so it can sell just that one', () => {
    expect(PAGE).toMatch(/<PaywallPage feature="opening" opening=\{\{ id, name: opening\.name \}\} \/>/);
  });
});
