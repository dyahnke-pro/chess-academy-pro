// THE PROOF RULE (David 2026-10-07): a spoken conclusion carries its proof.
// Enforced by the TYPE, not a table: every Learn fact (\`LaneFact.proof\`,
// \`TeachingHint.proof\`, \`queueSpokenHint\`'s proof) is REQUIRED, so a lane that
// cannot answer cannot compile. This file holds how a proof is said.
import { describe, it, expect } from 'vitest';
import { withProof, lineProof, isProof, NO_PROOF } from './proof';

describe('how a proof is said', () => {
  it('an engine proof is never said at full size; an exact one is', () => {
    const exact = { kind: 'line' as const, exact: true, short: 'then Qxe8+ wins the rook', full: 'after Nf6+ gxf6, Qxe8+ wins the rook' };
    expect(withProof('The pin does not hold.', exact, 'full')).toBe('The pin does not hold. After Nf6+ gxf6, Qxe8+ wins the rook.');
    expect(withProof('The pin does not hold.', { ...exact, exact: false }, 'full')).toBe('The pin does not hold. Then Qxe8+ wins the rook.');
    expect(withProof('The pin does not hold.', null)).toBe('The pin does not hold.');
  });
  it('a named reason is not a proof; a line is', () => {
    expect(isProof(NO_PROOF.stated)).toBe(false);
    expect(isProof(lineProof({ fen: 'x', sans: ['Nf6+', 'Kh8', 'Nxe8'] }))).toBe(true);
    expect(lineProof({ fen: 'x', sans: [] })).toBeNull();
  });
});
