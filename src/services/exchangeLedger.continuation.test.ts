// A LINE CUT SHORT TAKES BACK ONLY THE WAY THE LINE DOES (pass-3 false facts,
// class B: a follow-up no engine line plays). When the heard horizon or a gift
// cuts a longer line, the recapture it is played out with must be the line's
// own next move. The old cut appended the cheapest capture instead, a move the
// engine never chose. Lines are native Stockfish, depth 16 (the lesson
// writer's reads), scanned over 34,917 cached lines: these were 7 of 7.
import { describe, it, expect } from 'vitest';
import { heardProofCut } from './exchangeLedger';

describe('a cut line takes back only with the line\'s own move', () => {
  it('Qxd4 is not "answered by …Nxd4": the line plays …f6 (…Nxd4 walks into Nf6+ and Bh6 mate)', () => {
    const fen = 'r1bqk2r/ppppnp1p/2n3p1/3N2B1/2Pb4/8/PP2PPPP/R2QKB1R w KQkq - 0 8';
    const line = ['Qxd4', 'f6', 'Qxf6', 'Rg8', 'Qf3', 'd6', 'Qe3', 'Bf5', 'h4', 'h6'];
    const p = heardProofCut(fen, line, 'w');
    expect(p?.sans.slice(0, p.plies) ?? []).not.toContain('Nxd4');
    for (const [i, san] of (p?.sans.slice(0, p.plies) ?? []).entries()) expect(san).toBe(line[i]);
  });

  it('…cxb5 is not "answered by Nxb5": the line plays Nxe4', () => {
    const fen = 'r1bqkbnr/pp1p2pp/2p5/1B2P3/4p3/2N5/PPP2PPP/R1BQK2R b KQkq - 1 7';
    const line = ['d5', 'exd6', 'Nf6', 'Bg5', 'cxb5', 'Nxe4', 'Qa5+', 'Nc3', 'b4', 'Bxf6'];
    const p = heardProofCut(fen, line, 'b');
    for (const [i, san] of (p?.sans.slice(0, p.plies) ?? []).entries()) expect(san).toBe(line[i]);
  });

  it('…fxg7 is not "answered by …Kxg7": the line plays …Bg4 first', () => {
    const fen = '1r1qr1k1/2nb1pbp/p2B1np1/N1pPP3/Pp6/2N4P/1P3PP1/R2QRBK1 b - - 0 20';
    const line = ['bxc3', 'exf6', 'cxb2', 'fxg7', 'Bg4', 'Qxg4', 'bxa1=Q', 'Rxa1', 'Qxd6', 'Rd1'];
    const p = heardProofCut(fen, line, 'b');
    for (const [i, san] of (p?.sans.slice(0, p.plies) ?? []).entries()) expect(san).toBe(line[i]);
  });

  it('a line that ENDS one move short of a recapture is still played out (the cut\'s own job)', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.Bxf7+ — the line stops on the check; …Kxf7 is the take-back.
    const fen = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const p = heardProofCut(fen, ['Bxf7+'], 'w');
    expect(p?.sans).toContain('Kxf7');
  });
});
