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

describe('squaresProof / legalLineProof — no claim speaks on the "stated" escape (P3)', () => {
  it('a geometry claim rests on its squares; no squares is no proof', async () => {
    const { squaresProof } = await import('./proof');
    const p = squaresProof('Their bishop on g4 pins your knight on f3 to your queen on d1.', ['g4', 'f3', 'd1', 'x9']);
    expect(p?.kind).toBe('squares');
    expect(p?.exact).toBe(true);
    expect(p?.squares).toEqual(['g4', 'f3', 'd1']);
    expect(squaresProof('Watch out.', [])).toBeNull();
  });
  it('a line that cannot be played is no proof', async () => {
    const { legalLineProof } = await import('./proof');
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(legalLineProof(start, ['e4', 'e5'])?.line?.sans).toEqual(['e4', 'e5']);
    expect(legalLineProof(start, ['e2e4'])?.line?.sans).toEqual(['e4']);
    expect(legalLineProof(start, ['Nf6'])).toBeNull();
    // Scholar's mate: the mating move, exact.
    const p = legalLineProof('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ['Qxf7#'], true);
    expect(p?.exact).toBe(true);
    expect(p?.short).toBe('The move is Qxf7#');
  });
});
