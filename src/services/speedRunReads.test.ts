import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  keepTension, anyMoveFine, uglyButRight, castleSide, provokes, threatStronger, heldByTactic,
  secureFirst, mutualPins, overprotect, positionOpened, awkwardBlock, speedRunReads,
} from './speedRunReads';

const fenAt = (sans: string): string => { const c = new Chess(); for (const m of sans.split(' ')) c.move(m); return c.fen(); };
const line = (moves: string[], evaluation: number) => ({ moves, evaluation, mate: null });

describe('his habits of thought, computed (each checked against the existing computers)', () => {
  it('keep the tension: exd5 is there, the engine develops instead', () => {
    const fen = fenAt('e4 e5 Nf3 d5');
    // the student could take on d5; the engine prefers a quiet move
    expect(keepTension(fen, 'w', 'Nc3')?.text).toMatch(/Keep the tension/);
    expect(keepTension(fen, 'w', 'exd5')).toBeNull();
  });
  it('any move is fine: three moves inside an inaccuracy of each other', () => {
    const fen = fenAt('e4 e5');
    expect(anyMoveFine(fen, [line(['g1f3'], 30), line(['b1c3'], 25), line(['f1c4'], 20)])?.text).toMatch(/Several moves are equally good/);
    expect(anyMoveFine(fen, [line(['g1f3'], 120), line(['b1c3'], 25), line(['f1c4'], 20)])).toBeNull();
  });
  it('the ugly move that is correct: the engine doubles your own pawns', () => {
    // bxc3 doubles the c-pawns (c3 and c2)
    const fen = '4k3/8/8/8/8/2n5/1PP5/4K3 w - - 0 1';
    expect(uglyButRight(fen, 'bxc3')?.text).toMatch(/looks ugly — it doubles your own pawns/);
    expect(uglyButRight(fen, 'Kd1')).toBeNull();
  });
  it('which side to castle: the intact wing', () => {
    expect(castleSide('r3k2r/pppppppp/8/8/8/8/P4PPP/R3K2R w KQkq - 0 1', 'w')?.text).toMatch(/castle short/);
    expect(castleSide('r3k2r/pppppppp/8/8/8/8/PPP2PPP/R3K2R w KQkq - 0 1', 'w')).toBeNull();
  });
  it('provoke the commitment: the reply is a pawn advance into your half', () => {
    const fen = '4k3/8/8/2p5/8/8/8/4KB2 w - - 0 1';
    expect(provokes(fen, [line(['f1e2', 'c5c4'], 10)])?.text).toMatch(/invites .* fixed/);
    expect(provokes(fen, [line(['f1e2', 'e8d7'], 10)])).toBeNull();
  });
  it('the threat is stronger than the execution', () => {
    // Nxd5 wins a pawn now, but the engine prefers Bc4 by a margin
    const fen = '4k3/8/8/3p4/8/2N5/8/4KB2 w - - 0 1';
    expect(threatStronger(fen, 'w', [line(['f1c4'], 200), line(['c3d5'], 100)])?.text).toMatch(/threat is stronger than carrying it out/);
    expect(threatStronger(fen, 'w', [line(['c3d5'], 200)])).toBeNull();
  });
  it('a piece held only by a tactic: outnumbered, yet taking it loses', () => {
    // the knight on e5 is hit by the rook on a5 and the queen on e7, guarded once by d4 — and Rxe5 dxe5 loses for them
    expect(heldByTactic('6k1/4q3/8/r3N3/3P4/8/8/6K1 w - - 0 1', 'w')?.text).toMatch(/safe only because of a tactic/);
    // one attacker, one defender: not outnumbered
    expect(heldByTactic('6k1/4q3/8/4N3/3P4/8/8/6K1 w - - 0 1', 'w')).toBeNull();
  });
  it('secure the loose piece before collecting', () => {
    // Rxa7 is there, but the bishop on c4 is loose and hit by the queen on c8; the engine retreats it first
    const fen = '2q1k3/p7/8/8/2B5/8/8/R3K3 w - - 0 1';
    expect(secureFirst(fen, 'w', [line(['c4b3'], 50)])?.text).toMatch(/secure it first/);
    expect(secureFirst(fen, 'w', [line(['a1a7'], 50)])).toBeNull();
  });
  it('mutual pins', () => {
    // Bb5 pins the d7 knight to e8; …Bb4 pins the d2 knight to e1
    expect(mutualPins('4k3/3n4/8/1B6/1b6/8/3N4/4K3 w - - 0 1')?.text).toMatch(/Both sides are pinned/);
    // only one side pinned
    expect(mutualPins('4k3/3n4/8/1B6/8/8/3N4/2bK4 w - - 0 1')).toBeNull();
  });
  it('overprotection: the outpost knight with a single guard', () => {
    const fen = '4k3/8/8/4N3/3P4/8/8/4K3 w - - 0 1';
    expect(overprotect(fen, 'w')?.text).toMatch(/overprotect it/);
  });
  it('the position opened: their knight steps off your bishop\'s diagonal, and you have a capture', () => {
    // …Nf5 opens the a1 bishop onto their queen on f6
    const r = positionOpened({ fenBefore: '6k1/8/5q2/8/3n4/8/8/B5K1 b - - 0 1', san: 'Nf5' }, 'w', 'Bxf6');
    expect(r?.text).toMatch(/hit the gas/);
    expect(positionOpened({ fenBefore: '6k1/8/5q2/8/3n4/8/8/B5K1 b - - 0 1', san: 'Nf5' }, 'w', 'Kg2')).toBeNull();
  });
  it('the awkward block: Bb5+ forces …Bd7, pinned with almost nowhere to go', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
    expect(awkwardBlock(fen, [line(['f1b5', 'c8d7'], 30)])?.text).toMatch(/stuck/);
    expect(awkwardBlock(fen, [line(['g1f3', 'g8f6'], 30)])).toBeNull();
  });
  it('the reads list never throws on any opening position (smoke over a real game)', () => {
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 Qh4 Nd2 c6 Bc4 d6 Nf3 Qh5'.split(' ')) {
      c.move(m);
      expect(() => speedRunReads({ fen: c.fen(), me: 'w', lines: [] })).not.toThrow();
    }
  });
});
