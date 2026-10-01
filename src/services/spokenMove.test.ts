import { describe, expect, it } from 'vitest';
import { sayMoveClause, sayMoveNoun } from './spokenMove';

describe('disambiguation survives into speech (walk 2026-09-30, game 2)', () => {
  it('two rooks that can take on one square are told apart', () => {
    expect(sayMoveNoun('R1xe3')).toBe('the first-rank rook taking on e3');
    expect(sayMoveNoun('R8xe3')).toBe('the eighth-rank rook taking on e3');
    expect(sayMoveNoun('Nbd2')).toBe('the b-file knight to d2');
    expect(sayMoveClause('Rxe3')).toBe('the rook takes e3');
  });
});
