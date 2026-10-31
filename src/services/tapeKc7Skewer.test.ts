// Prod Learn tape 2026-10-31 (Scandinavian, Lasker): …Ra8+ Kc7 Rxh8 — White's
// rook check skewered the king on c8 and the rook on h8. The coach said of the
// forced king move "King to c7 steps off c8 so the rook can come to c8" and
// "King to c7 is a discovered attack", and of their gxf6 "wins by force: they
// win a knight — it is g-pawn takes f6 itself". Each fixed at its producer.
import { describe, it, expect } from 'vitest';
import { playedConcept } from './playedConcept';
import { computePlyFacts } from './pvPlayback';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { decisiveReason } from './decisiveReason';
import { Chess } from 'chess.js';

const BEFORE_KC7 = 'R1k4r/1p3p1p/5p2/2p1p3/8/2PB4/1P2NPP1/6K1 b - - 1 22';

describe('a king driven out of check by a skewer', () => {
  it('is not a discovered attack: the rook it "unveils" is taken first', () => {
    expect(playedConcept(BEFORE_KC7, 'Kc7')).toBeNull();
    const c = new Chess(BEFORE_KC7); c.move('Kc7');
    expect(computePlyFacts(BEFORE_KC7, c.fen(), { san: 'Kc7', color: 'b' }).tacticLanded).not.toBe('discovery');
  });
  it('a real discovery still lands (the revealer is not simply taken)', () => {
    // The knight on d3 steps off the d-file: the rook on d1 now hits the queen
    // on d5. Her Qxd1+ is met by Kxd1, so the revealer is not simply taken.
    const fen = '4k3/8/8/3q4/8/3N4/8/3RK3 w - - 0 1';
    const c = new Chess(fen); c.move('Nf4');
    expect(computePlyFacts(fen, c.fen(), { san: 'Nf4', color: 'w' }).tacticLanded).toBe('discovery');
  });
  it('says nothing about making room for the rook — the move was forced', () => {
    const t = buildReviewMoveTeachingFact(BEFORE_KC7, 'Kc7', true, null)?.text ?? '';
    expect(t).not.toMatch(/so the rook can come/);
  });
});

describe('a win that lands on the move itself names the move once', () => {
  it('"gxf6 wins by force: they win a knight." — never "it is gxf6 itself"', () => {
    const fen = '2kr1b1r/ppp2ppp/2n1pn2/q5P1/3P4/2N2N2/PPP2PP1/R1BQKB1R w KQ - 0 9';
    const r = decisiveReason({
      namesPreparedMove: true, fenBefore: fen, san: 'gxf6', seat: 'opponent', opponentLastSan: 'e6',
      reads: {
        before: [
          { rank: 1, evaluation: 420, mate: null, moves: ['g5f6', 'a5b6', 'c1d2', 'b6b2'] },
          { rank: 2, evaluation: 40, mate: null, moves: ['c1d2', 'f6d5', 'c3d5', 'a5d5'] },
        ],
        after: [], passBefore: [], passAfter: [],
      },
    });
    expect(r?.text ?? '').not.toMatch(/itself/);
    if (r && /wins by force/.test(r.text)) expect(r.text).toMatch(/wins by force: [^—]+\.$/);
  });
});
