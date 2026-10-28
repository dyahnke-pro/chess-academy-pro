// The three facts on the masters' own line after 1.e4 c5 2.a3 (606 games):
// 2…g6 3.b4 Bg7 4.Nc3 — read off the board, never a remembered pattern.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { deepFact, theirTarget, binding, moveHit } from './threeFacts';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('deepFact — what the move sets up, down the line', () => {
  it('…g6: makes room for the bishop on g7, which hits the rook on a1 once b4 opens the diagonal', () => {
    const f = deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Bg7'], true);
    expect(f?.text).toBe('making room for your bishop on g7, where it hits their rook on a1 once their b4 opens the diagonal');
    expect(f?.target).toBe('a1');
  });
  it('the same move from the other seat is said the other way round', () => {
    const f = deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Bg7'], false);
    expect(f?.text).toBe('making room for their bishop on g7, where it hits your rook on a1 once your b4 opens the diagonal');
  });
  it('a trade is not a plan: nothing when they take the piece that just moved (v4: …Bf6 Bxf6 Qxf6)', () => {
    // …Bf6 leaves e7, and …Qxf6 passes through e7 — "opening the way" by the
    // old test; but White took the bishop first, so it is a recapture.
    const fen = fenAfter(['b3', 'd5', 'Bb2', 'Nf6', 'Nf3', 'e6', 'e3', 'Be7', 'Be2', 'O-O', 'O-O', 'Ne4', 'd3', 'Nd6', 'Nbd2']);
    expect(deepFact(fen, 'Bf6', ['Bxf6', 'Qxf6'], true)).toBeNull();
    // Without the trade rule this read "opening the way for your queen to f6,
    // where it hits their rook on a1 once their Bxf6 opens the diagonal": the
    // queen's path d8–e7–f6 runs through the square the bishop left.
  });
  it('nothing when the next move was not made possible by this one', () => {
    // …g6 then …Nc6: the knight's route never needed g7.
    expect(deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Nc6'], true)).toBeNull();
  });
  it('nothing without a line to read', () => {
    expect(deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', null, true)).toBeNull();
    expect(deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4'], true)).toBeNull();
  });
});

describe('theirTarget — what their last move aims at', () => {
  it('their b4 is aimed at your c5 pawn (nothing guards it)', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true);
    expect(t?.text).toBe('their b4 is aimed at your pawn on c5');
    expect(t?.square).toBe('c5');
  });
  it('a pawn its guards cover is no target', () => {
    // 1.e4 e5 2.Nf3 hits e5 — but …Nc6 is not played yet, so it is; with
    // d6 already in, the knight's attack on a guarded pawn is no target.
    expect(theirTarget({ fenBefore: fenAfter(['e4', 'e5', 'd3', 'd6']), san: 'Nf3' }, true)).toBeNull();
  });
});

describe('binding — how the move answers it', () => {
  it('…Bg7 threatens Bxa1: it hits back on the side b4 is attacking', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true)!;
    expect(binding(fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']), 'Bg7', t, 'a1', true)).toBe('so this hits back on the side they\'re attacking');
  });
  it('…b6 covers the c5 pawn', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true)!;
    expect(binding(fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']), 'b6', t, null, true)).toBe('and this covers it');
  });
  it('nothing when the move takes the attacker (the capture says it)', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true)!;
    expect(binding(fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']), 'cxb4', t, 'b4', true)).toBeNull();
  });
  it('…h6 against Bg5: it goes after the bishop aimed at the knight', () => {
    const t = theirTarget({ fenBefore: fenAfter(['d4', 'Nf6', 'Nf3', 'e6']), san: 'Bg5' }, true)!;
    expect(t.text).toBe('their Bg5 is aimed at your knight on f6');
    expect(binding(fenAfter(['d4', 'Nf6', 'Nf3', 'e6', 'Bg5']), 'h6', t, 'g5', true)).toBe('and this goes after the bishop doing it');
  });
  it('a pawn poked while a bishop is hit is no answer (v4: …Qe5 in a lost game)', () => {
    // Their Bb5 is aimed at your knight on c6; a point on their a2 pawn is
    // on the same wing but worth less than the knight — no counter.
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'e5', 'Nf3', 'Nc6']), san: 'Bb5' }, true)!;
    expect(t.square).toBe('c6');
    expect(binding(fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']), 'h6', t, 'a2', true)).toBeNull();
    // Control: the same wing at equal or greater worth (their bishop on b5's
    // neighbour, the rook on a1) is a counter.
    expect(binding(fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']), 'h6', t, 'a1', true)).toBe('so this hits back on the side they\'re attacking');
  });
  it('a queen "hitting" a rook its partner guards is no counter (v4: …Qe5 in a lost game)', () => {
    // Black's Rfc8 is aimed at the bishop on c6; Qe5 eyes b8, but Rc8 guards
    // it — the only real hit is the e7 pawn, worth less than the bishop.
    const t = theirTarget({ fenBefore: '1r3rk1/p3pp1p/1qB3p1/5b2/5P2/2Q3P1/PPP4P/2KRR3 b - - 2 19', san: 'Rfc8' }, true)!;
    expect(t.square).toBe('c6');
    const fen = '1rr3k1/p3pp1p/1qB3p1/5b2/5P2/2Q3P1/PPP4P/2KRR3 w - - 3 20';
    expect(moveHit(fen, 'Qe5')).toBe('e7');
    expect(binding(fen, 'Qe5', t, moveHit(fen, 'Qe5'), true)).toBeNull();
  });
  it('a capture is its own point, never "hits back"', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true)!;
    expect(binding(fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']), 'cxb4', t, 'a3', true)).toBeNull();
  });
  it('a check is answered as a check: no target', () => {
    expect(theirTarget({ fenBefore: fenAfter(['e4', 'e5', 'Nf3', 'd6']), san: 'Bb5+' }, true)).toBeNull();
  });
  it('nothing when the move answers neither way', () => {
    const t = theirTarget({ fenBefore: fenAfter(['e4', 'c5', 'a3', 'g6']), san: 'b4' }, true)!;
    expect(binding(fenAfter(['e4', 'c5', 'a3', 'g6', 'b4']), 'h6', t, 'g5', true)).toBeNull();
  });
});

describe('deepFact — two moves ahead, both seats (WO-DECIDER-02)', () => {
  // 1.e4 c5 2.a3 g6 3.b4 Nc6 4.d3 Bg7: the bishop arrives a move later, and
  // b4 has already opened the long diagonal to the rook on a1.
  it('…g6 makes room for the bishop a move later', () => {
    const f = deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Nc6', 'd3', 'Bg7'], true);
    expect(f?.text).toBe('making room for your bishop on g7 a move later, where it hits their rook on a1');
  });
  it('the same for their move, said from your seat', () => {
    const f = deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Nc6', 'd3', 'Bg7'], false);
    expect(f?.text).toBe('making room for their bishop on g7 a move later, where it hits your rook on a1');
  });
  it('no further than two moves: a set-up three moves on is not this move\'s', () => {
    expect(deepFact(fenAfter(['e4', 'c5', 'a3']), 'g6', ['b4', 'Nc6', 'd3', 'e6', 'Nf3', 'Bg7'], true)).toBeNull();
  });
});
