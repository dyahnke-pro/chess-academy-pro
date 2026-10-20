// THE GOLDEN REPLAY (Naroditsky, Three Knights speedrun — lead 2026-10-20):
// the student's own positional reasons from move 6 on were missing because
// no computer produced the first two; Qxf3's point was computed and unheard.
import { describe, it, expect } from 'vitest';
import { playedConcept, playedConceptLine } from './playedConcept';
import { denyExchange, spoilTheirPawns } from './exchangeIdeas';
import { studentMovePointFact } from './playCommentary';

const BB6 = 'r2qk2r/ppp2ppp/2np1n2/2b1p3/2B1P1b1/2NPBN2/PPP2PPP/R2Q1RK1 b kq - 2 7';
const BH5 = 'r2qk2r/ppp2ppp/1bnp1n2/4p3/2B1P1b1/2NPBN1P/PPP2PP1/R2Q1RK1 b kq - 0 8';
const BXF3 = 'r2q1rk1/ppp2ppp/1bnp1n2/4p2b/2B1P3/2NPBN1P/PPPQ1PPK/R4R2 b - - 4 10';
const QXF3 = 'r4rk1/ppp2ppp/1bnp1q2/4p2n/2B1P1R1/2NPBP1P/PPPQ1P1K/R7 b - - 4 13';

describe('8…Bh5 keeps the pin on f3', () => {
  it('a pin the move kept is named as kept, from the student seat', () => {
    const c = playedConcept(BH5, 'Bh5');
    expect(c?.kept).toBe(true);
    expect(playedConceptLine(c!, 'b')).toBe('With Bh5, your bishop on h5 keeps the pin on their knight on f3 against their queen on d1.');
  });
  it('NEGATIVE CONTROL: a retreat off the line keeps nothing', () => {
    expect(playedConcept(BH5, 'Be6')).toBeNull();
  });
});

describe('10…Bxf3 spoils their kingside pawns for good', () => {
  it('the only way back is a pawn that doubles their pawns', () => {
    expect(spoilTheirPawns(BXF3, 'Bxf3', 'b')?.text).toBe('You give your bishop for their knight on f3, and the only way back is with the g-pawn: their kingside pawns end up doubled, and that damage is for good.');
  });
  it('NEGATIVE CONTROL: a queen capture is not a pawn-doubling trade', () => {
    expect(spoilTheirPawns('r4rk1/ppp2ppp/1bnp1q2/4p2n/2B1P1R1/2NPBP1P/PPPQ1P1K/R7 b - - 4 13', 'Qxf3', 'b')).toBeNull();
  });

});

describe('13…Qxf3 wins the pawn — computed by the one move-point owner, read off the engine line', () => {
  it('that wins the pawn on f3', () => {
    expect(studentMovePointFact(QXF3, 'Qxf3', 'Rg4', ['f6f3', 'a1g1', 'g8h8'])?.text).toBe('That wins the pawn on f3 — nothing takes it back safely.');
  });
});

describe('7…Bb6 keeps the bishop so a trade on c5 cannot double your pawns', () => {
  it('and if they take on b6, axb6 opens the a-file — doubled pawns that cost nothing', () => {
    expect(denyExchange(BB6, 'Bb6', 'b', 30)?.text).toBe('Your bishop leaves c5, so their bishop can no longer take it there and double your pawns; if they take on b6, axb6 opens the a-file for your rook.');
  });
  it('NEGATIVE CONTROL: with no rook behind the file, equal damage waiting on b6 still silences it', () => {
    expect(denyExchange(BB6.replace(/^r2qk2r/, '3qk2r').replace(' kq ', ' k '), 'Bb6', 'b', 30)).toBeNull();
  });
});
