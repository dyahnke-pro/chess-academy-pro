import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { dialedReply, newlyAttackedPieces } from './coachDials';

const fenAfter = (moves: string): string => {
  const b = new Chess();
  for (const s of moves.split(/\s+/).filter(Boolean)) b.move(s);
  return b.fen();
};

describe('newlyAttackedPieces', () => {
  const ruy = fenAfter('e4 e5 Nf3 Nc6 Bb5');
  it('a pawn kicking a bishop is an attack on a piece', () => {
    expect(newlyAttackedPieces(ruy, 'a7a6', 'w')).toEqual(['b5']);
  });
  it('pawn-on-pawn tension is not', () => {
    expect(newlyAttackedPieces(ruy, 'g8f6', 'w')).toEqual([]); // hits e4, a pawn
    expect(newlyAttackedPieces(fenAfter('e4'), 'd7d5', 'w')).toEqual([]);
  });
  it('a check is an attack on the king', () => {
    expect(newlyAttackedPieces(fenAfter('e4 e5 f3'), 'd8h4', 'w')).toEqual(['e1']);
  });
  it('a piece already attacked is not newly attacked', () => {
    // After …a6 the bishop on b5 is hit; another move that also hits it adds nothing new.
    const hit = fenAfter('e4 e5 Nf3 Nc6 Bb5 a6 Ba4');
    expect(newlyAttackedPieces(hit, 'b7b5', 'w')).toEqual(['a4']); // b5 newly hits the bishop on a4
    expect(newlyAttackedPieces(fenAfter('e4 e5 Nf3 Nc6 Bb5 a6 h3'), 'g8f6', 'w')).toEqual([]); // b5 was already attacked
  });
  it('an illegal move attacks nothing', () => {
    expect(newlyAttackedPieces(ruy, 'a7a4', 'w')).toEqual([]);
  });
});

describe('dialedReply — attacks on pieces off', () => {
  const ruy = fenAfter('e4 e5 Nf3 Nc6 Bb5');
  it('a quiet first choice stands', () => {
    expect(dialedReply(ruy, 'w', 'g8f6', [{ uci: 'a7a6', cpLoss: 0 }], 80)).toEqual({ uci: 'g8f6', swapped: false, forced: false, attacks: [] });
  });
  it("the engine's top reply hits the bishop: the next acceptable non-attacking reply is played", () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 20 }, { uci: 'g8f6', cpLoss: 25 }], 80);
    expect(r).toEqual({ uci: 'g8f6', swapped: true, forced: false, attacks: [] }); // …Nd4 hits the knight on f3
  });
  it('a book road comes before the engine lines (it is the level-appropriate move)', () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'f8c5' }, { uci: 'g8f6', cpLoss: 0 }], 80);
    expect(r.uci).toBe('f8c5');
  });
  it('a quiet move outside the strength window is not acceptable — the least costly attacking one is played, forced', () => {
    const r = dialedReply(ruy, 'w', 'c6d4', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 30 }, { uci: 'g8f6', cpLoss: 200 }], 80);
    expect(r).toMatchObject({ uci: 'a7a6', swapped: true, forced: true });
    expect(r.attacks).toEqual(['b5']);
  });
  it('forced with the first choice already the cheapest: it stands', () => {
    const r = dialedReply(ruy, 'w', 'a7a6', [{ uci: 'a7a6', cpLoss: 0 }, { uci: 'c6d4', cpLoss: 30 }], 80);
    expect(r).toEqual({ uci: 'a7a6', swapped: false, forced: true, attacks: ['b5'] });
  });
});
