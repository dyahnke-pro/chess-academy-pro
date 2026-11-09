// David's Colle read (2026-11-05), 23…g6 after 23.Bh6. The Learn turn said
// "Their …g6 stops your Rxe6, which would hit their queen on b6. Anything
// else, like …Kf8, gives up three or four points." Two defects, each at its
// producer:
//   1. moveIntent skipped Qxg7 — a threat landing on the square the moved
//      pawn left read as a "rescue" — so a lesser threat stood in for the mate;
//   2. the gap was said with no reason (David: "I want it to also say why").
import { describe, it, expect } from 'vitest';
import { decisiveReason } from './decisiveReason';
import type { AnalysisLine } from '../types';

const FEN = '2r1r1k1/1b3ppp/pq2p2B/1p1p4/8/2P3Q1/P4PPP/R3R1K1 b - - 4 23';
const line = (rank: number, evaluation: number, moves: string, mate: number | null = null): AnalysisLine =>
  ({ rank, evaluation, mate, moves: moves.split(' ') }) as AnalysisLine;
// The game's own stored reads at this board (learn-replay-games.json, colle800 ply 46).
const BEFORE = [
  line(1, 49, 'g7g6 g3e5 f7f6 e5f6 c8c7 e1e5 b6c6 a1e1 d5d4 f2f3 c7f7 e5e6'),
  line(2, 354, 'g8f8 g3g7 f8e7 h6g5 e7d6 g7f7 b6c6 g5f4 d6c5 f4e5 c5b6 e5d4'),
  line(3, 674, 'b6f2 g1f2 g7g6 f2g1 e6e5 g3f2 e8e6 a2a4 f7f5 a4b5 c8c7'),
];
const AFTER = [line(1, 55, 'g3e5 f7f6 e5f6 c8c7 e1e5 c7f7 f6h4 d5d4 c3d4 b7d5 a2a3')];
// Black passes: Qxg7 is mate.
const PASS = [line(1, 0, 'g3g7', 1), line(2, 300, 'e1e6 f7e6 g3g7')];

const reason = (pass: AnalysisLine[]) => decisiveReason({
  fenBefore: FEN, san: 'g6', reads: { before: BEFORE, passBefore: pass, after: AFTER, passAfter: [] },
  seat: 'opponent', prevCapture: null, namesPreparedMove: true,
});

describe('23…g6: the mate it stops, and why the alternative costs', () => {
  it('names the mate, never a lesser threat behind it', () => {
    const r = reason(PASS);
    expect(r?.text).toMatch(/^Their …g6 stops your Qxg7, which was mate\./);
    expect(r?.text).not.toMatch(/Rxe6/);
  });

  it('says why …Kf8 gives up its points: the check it lets in', () => {
    expect(reason(PASS)?.text).toMatch(/Anything else, like …Kf8, gives up three or four points: it lets you play Qxg7\+\./);
  });

  it('a runner-up line with no second read never names what it wins', () => {
    expect(reason(PASS)?.text).not.toMatch(/win two pawns/);
  });
});
