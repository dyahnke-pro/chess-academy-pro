import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { replyAnswersAttack } from './coachFeatureService';

// Danya speedrun BGTBTghFQDI, 4…Nf6: the knight attacks e4, and the engine's
// best reply is Nf3 — it leaves the pawn. "It needs an answer this move" is false.
describe('an attack the best reply ignores asks nothing', () => {
  const c = new Chess();
  for (const s of 'e4 e5 d4 exd4 c3 c5 Bc4 Nf6'.split(' ')) c.move(s);
  it('Nf3 does not answer the attack on e4', () => {
    expect(replyAnswersAttack(c.fen(), 'e4', 'g1f3')).toBe(false);
  });
  it('Qe2 guards e4 — that answers it', () => {
    expect(replyAnswersAttack(c.fen(), 'e4', 'd1e2')).toBe(true);
  });
  it('e5 moves the pawn — that answers it', () => {
    expect(replyAnswersAttack(c.fen(), 'e4', 'e4e5')).toBe(true);
  });
});
