/** A proof is heard, so it has a horizon (hand walk 2340, move 9). */
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { proofAgainstMover } from './exchangeLedger';

function uciOf(fen: string, sans: string[]): string[] {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
}

describe('proofAgainstMover — a line a listener can follow', () => {
  it('a 14-ply "proof" is not a reason', () => {
    const c = new Chess();
    for (const m of 'e4 c5 Nf3 Nc6 c3 e5 d4 cxd4 cxd4 d5 exd5 Qxd5 Nc3 Bb4 Bd2 Bxc3 Bxc3 Nge7'.split(' ')) c.move(m);
    const line = 'Qd2 e4 Ne5 Nxe5 dxe5 O-O Qf4 Ng6 Qg3 h5 Be2 h4 Qe3 Nxe5'.split(' ');
    expect(proofAgainstMover(c.fen(), uciOf(c.fen(), line), 'w')).toBeNull();
  });

  it('a two-ply proof still speaks', () => {
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
    expect(proofAgainstMover(fen, uciOf(fen, ['Nxe5', 'Nxe5']), 'w')).toMatch(/Nxe5 and Nxe5 — .*knight/);
  });
});

describe('proofForMover — the winning line, played out (P2 #3)', () => {
  it('a forcing line that ends a piece up is said from the winner\'s seat', async () => {
    const { proofForMover } = await import('./exchangeLedger');
    // Black to move after 4.Nxe5?? in the Blackburne Shilling: …Qg5 hits e5 and g2.
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5'.split(' ')) c.move(m);
    const got = proofForMover(c.fen(), uciOf(c.fen(), ['Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#']), 'b');
    expect(got?.text ?? '').toMatch(/mate|win/);
    expect(got!.plies).toBeGreaterThanOrEqual(3);
  });
  it('a line that proves nothing says nothing', async () => {
    const { proofForMover } = await import('./exchangeLedger');
    const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 3 3';
    expect(proofForMover(fen, uciOf(fen, ['O-O', 'Nf6', 'd3', 'Be7']), 'w')).toBeNull();
  });
});
