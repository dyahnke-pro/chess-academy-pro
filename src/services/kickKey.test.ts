// OS-11 smaller sets: a rule restating its fact (g2 6…e5) — "e5 kicks their
// knight off d4" (the move's point) and "The rule behind e5: kick their knight
// off d4" (the principle) read one `pawnHit` and now carry one key.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { studentMovePointFact } from './playCommentary';
import { principleLine } from './moveFundamentals';
import { kickKey } from './conceptKey';

describe('one kick claim (g2 6…e5)', () => {
  const c = new Chess();
  for (const m of 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 f3'.split(' ')) c.move(m);
  const before = c.fen();
  it('the move\'s point claims kick:d4', () => {
    const p = studentMovePointFact(before, 'e5', 'f3', null);
    expect(p?.text).toMatch(/kicks their knight off d4/i);
    expect(p?.claim).toBe(kickKey('d4'));
  });
  it('the principle line is the tempo fact on the same square (positionFacts keys it kick:d4)', () => {
    const line = principleLine(before, 'e5', 'black', new Set(), 0);
    expect(line?.id).toMatch(/(^|:)tempo(:|$)/);
    expect(line?.squares[1]).toBe('d4');
  });
});
