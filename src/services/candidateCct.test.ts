import { describe, it, expect } from 'vitest';
import { candidateCct, candidateCctSentence } from './candidateCct';

describe('candidateCct — the blunder check before a candidate', () => {
  it('a move that leaves a piece to be taken: the capture is found', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 — White considers 4.Ng5?? no: 4.d3 is safe; 4.Nxe5 lets …Nxe5.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const c = candidateCct(fen, 'Nxe5')!;
    expect(c.wins.map((w) => w.san)).toContain('Nxe5');
    expect(candidateCctSentence(c)).toMatch(/^Blunder check on Nxe5: after it they have .*Nxe5, winning your knight/);
  });
  it('4.d3 guards e4: nothing to win and no double attack (only the check Bb4+)', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const c = candidateCct(fen, 'd3')!;
    expect(c.checks).toEqual(['Bb4+']);
    expect(c.wins).toEqual([]);
    expect(c.doubles).toEqual([]);
  });
  it('a fork it allows is named as a double attack', () => {
    // King e1, rook a1, their knight b4: after h3, …Nc2+ forks king and rook.
    const fen = '4k3/8/8/8/1n6/8/7P/R3K3 w - - 0 1';
    const c = candidateCct(fen, 'h3')!;
    expect(c.doubles.map((d) => d.san)).toContain('Nc2+');
    expect(candidateCctSentence(c)).toMatch(/Nc2\+, hitting your king and rook on a1 at once/);
  });
  it('castling there drops e4: the capture is named', () => {
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(candidateCct(fen, 'O-O')!.wins.map((w) => w.san)).toEqual(['Nxe4']);
  });
  it('a double attack that is simply taken back is no double attack', () => {
    // 4.d3: …d5 hits e4 and c4, but exd5 takes it.
    const fen = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(candidateCct(fen, 'd3')!.doubles.map((d) => d.san)).not.toContain('d5');
  });
  it('an illegal candidate is no answer', () => {
    expect(candidateCct('8/8/8/8/8/8/8/K6k w - - 0 1', 'Qh5')).toBeNull();
  });
});
