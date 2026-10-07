// THE PROOF RULE (David 2026-10-07): a conclusion that is spoken carries the
// proof its computer found. Every Learn lane declares where it stands
// (`ComputerRole.proof`, required — a new lane cannot compile without an
// answer), and the number of lanes still OWING a proof may only go DOWN.
import { describe, it, expect } from 'vitest';
import { COMPUTER_ROLES } from './computerRoles';
import { withProof } from './proof';

/** Lower this as lanes carry their proof. Never raise it. */
const OWED_CEILING = 50;

describe('every spoken conclusion carries its proof', () => {
  it('the lanes still owing a proof never grow', () => {
    const owed = Object.values(COMPUTER_ROLES).filter((r) => r.proof.state === 'owed').length;
    expect(owed).toBeLessThanOrEqual(OWED_CEILING);
  });
  it('an engine proof is never said at full size; an exact one is', () => {
    const exact = { kind: 'line' as const, exact: true, short: 'then Qxe8+ wins the rook', full: 'after Nf6+ gxf6, Qxe8+ wins the rook' };
    expect(withProof('The pin does not hold.', exact, 'full')).toBe('The pin does not hold. After Nf6+ gxf6, Qxe8+ wins the rook.');
    expect(withProof('The pin does not hold.', { ...exact, exact: false }, 'full')).toBe('The pin does not hold. Then Qxe8+ wins the rook.');
    expect(withProof('The pin does not hold.', null)).toBe('The pin does not hold.');
  });
});
