// Pass-3 false facts, class B (the Watch-course writers, 2026-11-12): a move's
// purpose named with a follow-up no engine line backs. Engine reads below are
// native Stockfish, depth 16, MultiPV 3 (UCI); the pass reads the same.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { DEFAULT_INTENT, moveIntent } from './moveIntent';
import type { AnalysisLine } from '../types';

const lines = (ls: Array<{ cp: number; pv: string }>): AnalysisLine[] =>
  ls.map((l, i) => ({ rank: i + 1, evaluation: l.cp, moves: l.pv.split(' '), mate: null }));
const fenOf = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };

describe('a prepared move comes within three moves a side of the line', () => {
  // Vienna, Stanley: 1.e4 e5 2.Nc3 Nf6 3.Bc4 Bc5 4.d3 d6 5.Nf3 O-O 6.O-O Bg4
  // 7.h3 Bh5 8.Bg5 h6 9.Bh4 Nbd7 10.Nd5. The knight leaving c3 frees the
  // c-pawn, and the old read said "Your Nd5 prepares c3" (the writers heard
  // "prepares b4" off an older read): the only line that plays c3 does so on
  // its tenth ply, after the knight has been traded on f6 and both kingsides
  // have moved. Three moves a side is the window a prepared move is read in.
  const fen = 'r2q1rk1/pppn1pp1/3p1n1p/2b1p2b/2B1P2B/2NP1N1P/PPP2PP1/R2Q1RK1 w - - 2 10';
  const reads = {
    before: lines([
      { cp: 35, pv: 'g2g4 h5g6 g1h1 c7c6 f1g1 b7b5 c4b3 b5b4 g4g5 b4c3 g5f6' },
      { cp: 6, pv: 'c3a4 g7g5 h4g3 c5b6 a4b6 a7b6 f1e1 f8e8 a2a4 d7c5 c2c3' },
      { cp: -10, pv: 'a2a3 g7g5 g2g4 f6g4 h3g4 h5g4 h4g3 d8f6 g1g2 c7c6 c3a4 h6h5' },
    ]),
    after: lines([
      { cp: -42, pv: 'g7g5 g2g4 g5h4 g4h5 f6d5 c4d5 d7f6 f3h2 f6d5 e4d5 g8h8 d1f3 f7f5' },
      { cp: -6, pv: 'c7c6 d5f6 d7f6 g2g4 g7g5 h4g3 h5g6 c4b3 a7a5 c2c3 c5b6 b3c2 g8g7' },
      { cp: 14, pv: 'c5b6 d5f6 d7f6 g2g4 h5g6 f1e1 c7c6 d3d4 f8e8 a2a4 e5d4 e4e5 d6e5' },
    ]),
    passBefore: [], passAfter: [],
  };
  it('Nd5 does not "prepare c3"', () => {
    const out = moveIntent(fen, 'Nd5', reads, 'student', DEFAULT_INTENT);
    expect(out?.prepares?.san ?? null).not.toBe('c3');
    expect(out?.text ?? '').not.toMatch(/\bc3\b/);
  });
});

describe('a threat carried out by the piece the move took is not "stopped"', () => {
  // Petrov, Steinitz: … 9.Nc3 Nxc3 10.bxc3. The old read said "Their bxc3 does
  // two jobs: it stops your …Bxh2+". After a pass the line is …Bxh2+ Kxh2
  // …Nxd1: the queen falls to the knight on c3, the very piece bxc3 took.
  const fen = fenOf('e4 e5 Nf3 Nf6 d4 Nxe4 Bd3 d5 Nxe5 Nd7 Nxd7 Bxd7 O-O Bd6 c4 c6 Nc3 Nxc3');
  const reads = {
    before: lines([
      { cp: 39, pv: 'b2c3 e8g8 c4d5 c6d5 d1h5 g7g6 h5d5 d8c7 c1h6 f8d8' },
      { cp: -92, pv: 'd1e1 c3e4 f2f3 d8f6 c1e3 f6e7 f3e4 d5e4 d3e4 e7e4' },
      { cp: -336, pv: 'f1e1 c3e4 c4d5 c6d5 f2f3 d8h4 g2g3 d6g3 h2g3 h4g3' },
    ]),
    after: lines([
      { cp: 31, pv: 'e8g8 c4d5 c6d5 d1h5 g7g6 h5d5 d8c7 c1h6 f8e8 h2h4' },
      { cp: 76, pv: 'd5c4 f1e1 d6e7 c1g5 d7e6 g5e7 d8e7 d3c4 e8g8 c4e6' },
      { cp: 88, pv: 'd7e6 c4d5 c6d5 a1b1 d8c7 d1a4 e8f8 c1a3 b7b6 f2f4' },
      // The same read's line for …Bxh2+ (MultiPV 40, rank 32): it now just
      // loses the bishop, which is what made the old read call it "stopped".
      { cp: 412, pv: 'd6h2 g1h2 d8h4 h2g1 e8g8 c4d5 f7f5 d5c6 d7c6 f2f3 f8e8 d3c4 g8h8' },
    ]),
    // The board before bxc3 with Black to move again (White passes).
    passBefore: lines([
      { cp: -714, pv: 'c3d1 f1e1 d7e6 e1d1 d5c4 d3f1 e8g8 g2g3 f7f6 c1f4' },
      { cp: -649, pv: 'd6h2 g1h2 c3d1 f1e1 e8f8 e1d1 f8g8 g2g3' },
      { cp: -426, pv: 'c3e4 f2f3 e4f6 c4c5 d6e7 d1e1 b7b6 b2b4 a7a5 c1g5' },
    ]),
    passAfter: [],
  };
  it('bxc3 does not "stop …Bxh2+"', () => {
    const out = moveIntent(fen, 'bxc3', reads, 'opponent', DEFAULT_INTENT);
    expect(out?.prevents?.san ?? null).not.toBe('Bxh2+');
    expect(out?.text ?? '').not.toMatch(/Bxh2/);
  });
});
