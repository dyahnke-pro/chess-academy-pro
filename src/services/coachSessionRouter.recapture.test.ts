// "Take back" is also the chess word for RECAPTURE. Question walk 2026-09-27:
// "Should I take back with the pawn or the queen?" undid the exchange the
// student was asking about. Position: the Blumenfeld after 13.Nxe5.
import { describe, it, expect } from 'vitest';
import { tryRouteIntent } from './coachSessionRouter';

const FEN = '5rk1/pbq1bppp/3p1n2/1P1pN3/8/1P1BP3/1B1N1PPP/R2QR1K1 b - - 0 13';
const ctx = { currentFen: FEN, lastMoveBy: 'coach' as const };

describe('a recapture question is never an undo', () => {
  for (const q of [
    'Should I take back with the pawn or the queen?',
    'Should I recapture with the pawn or the queen?',
    'should i take back on e5?',
    'Which piece should I recapture with?',
    'Can I take back with the queen?',
  ]) {
    it(q, () => {
      const r = tryRouteIntent(q, ctx);
      expect(r?.kind).not.toBe('take_back_move');
    });
  }

  it('a real takeback still undoes (negative control)', () => {
    for (const q of ['take that back', 'take back my move', 'undo', 'can you take that back?']) {
      expect(tryRouteIntent(q, ctx)?.kind, q).toBe('take_back_move');
    }
  });
});
