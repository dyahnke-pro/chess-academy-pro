// A PIN IS ONE THING, READ ONE WAY (task 172, 2026-11-11). `pinGeometry` holds
// the one test of a pin a coach would name (`isRealPin`: the piece behind is
// worth more, the piece in front can leave the line, it cannot simply take the
// pinner, and stepping off the line costs something). Two readers kept walks
// of their own — the board teacher's unpin (`pawnKickNext.pinsAgainst`) and the
// move's job (`bookMoveWhy`'s private `pinBy`) — and said pins that are not
// pins: a pawn "pinned" along its own file, a pawn that can take the pinner, a
// knight in front of a rook guarded twice. Each case is a logged fact on its
// exact board, and each fails on the code before both read the one test.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pinsAgainst } from './pawnKickNext';
import { buildReviewMoveTeachingFact } from './reviewMoveTeaching';
import { moveJob, MINE, THEIRS } from './bookMoveWhy';

const said = (fen: string, san: string, mine: boolean): string => buildReviewMoveTeachingFact(fen, san, mine, null)?.text ?? '';

describe('the unpin is said only of a real pin (board teacher)', () => {
  it('Bf4 unpins no pawn on a2: a pawn on its own file in front of its rook was never pinned (Benko)', () => {
    expect(said('r4rk1/3nppbp/3p1np1/q1pP4/4P3/2N2NP1/PP3PKP/R1BQR3 w - - 7 13', 'Bf4', false)).not.toMatch(/[Uu]npins/);
  });

  it('Qf3 unpins no pawn on e4: the e-pawn pushes along the file the rook looks down (Philidor)', () => {
    expect(said('r1bqrbk1/pp1n1ppp/2pp1n2/8/P2NP3/2N5/BPP1QPPP/R1B2RK1 w - - 3 11', 'Qf3', false)).not.toMatch(/[Uu]npins/);
  });

  it('…dxc6 unpins no pawn on b7: that pawn could take the bishop itself (Schliemann)', () => {
    const fen = 'r1b1kbnr/ppppq1pp/2B5/5P2/4p3/5N2/PPPPQPPP/RNB1K2R b KQkq - 0 6';
    // Neither the d7 pawn nor the b7 pawn is pinned by the bishop on c6: each can take it.
    expect(pinsAgainst(fen, 'b').filter((p) => p.pinner === 'c6')).toEqual([]);
    expect(said(fen, 'dxc6', true)).not.toMatch(/[Uu]npins/);
  });

  it('…Qb6 unpins no pawn on d7 (Queen’s Indian)', () => {
    expect(said('rn1q1rk1/pb1pbppp/4pn2/2p5/Q1P5/2N2NP1/PP2PPBP/R1BR2K1 b - - 5 10', 'Qb6', true)).not.toMatch(/[Uu]npins/);
  });

  it('a real unpin is still said: …Be7 frees the knight on f6 from the bishop on g5', () => {
    expect(said('rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 3 4', 'Be7', false)).toMatch(/[Uu]npins their knight on f6/);
  });

  it('…and the pin behind it is one the one test names', () => {
    expect(pinsAgainst('rnbqkb1r/ppp2ppp/4pn2/3p2B1/2PP4/2N5/PP2PPPP/R2QKBNR b KQkq - 3 4', 'b')).toEqual([{ pinner: 'g5', pinned: 'f6', behind: 'd8' }]);
  });
});

describe('a guard is said beside a pin only when it is one (the move’s job)', () => {
  it('Qc2 guards the knight on c3, but the queen on a5 does not pin it: the rook behind it is guarded (Benko)', () => {
    const job = moveJob('r4rk1/3nppbp/3p1np1/q1pP4/4P3/2N2NP1/PP3PKP/R1BQR3 w - - 7 13', 'Qc2', 'w', THEIRS, null, []);
    expect(job?.clause ?? '').not.toMatch(/pins/);
  });

  it('…Rfc8 puts a guarded rook behind the knight on c6: the queen on c1 pins nothing (London)', () => {
    const c = new Chess('r4rk1/pp2ppbp/1qnpbnp1/2p5/3P1B2/2P1PN1P/PP1NBPP1/R1Q2RK1 b - - 2 10');
    c.move('cxd4');
    c.move('cxd4');
    const job = moveJob(c.fen(), 'Rfc8', 'b', THEIRS, null, []);
    expect(job?.clause ?? '').not.toMatch(/pins/);
  });

  it('a real pin is still named: a second guard for the knight the bishop on b5 pins to the king', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6', 'd4']) c.move(m);
    const job = moveJob(c.fen(), 'Nge7', 'b', MINE, null, []);
    expect(job?.clause).toMatch(/your knight on c6, which their bishop on b5 pins/);
  });

  it('Rd1 guards the bishop on d3 their queen ATTACKS: a guarded rook behind it is no pin (Milner-Barry)', () => {
    const c = new Chess('r3kbnr/1p1b1ppp/p3p3/3pP3/3q4/2NB4/PP3PPP/R1BQ1RK1 w kq - 0 11');
    c.move('Qe2'); c.move('Be7');
    expect(moveJob(c.fen(), 'Rd1', 'w', MINE, null, [])?.clause).toBe('it adds a second guard to your bishop on d3, which their queen on d4 attacks');
  });

  it('…Rhd8 guards the knight on d7 their rook ATTACKS: the rook now behind it is guarded (QGA)', () => {
    const c = new Chess('r3k2r/1b1nb1Np/p4n2/1p2q3/4P3/2N5/PP2QPPP/R1BR2K1 b kq - 0 15');
    c.move('Kf7'); c.move('Nf5');
    expect(moveJob(c.fen(), 'Rhd8', 'b', MINE, null, [])?.clause).toBe('it adds a second guard to your knight on d7, which their rook on d1 attacks');
  });
});
