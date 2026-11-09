import { describe, it, expect } from 'vitest';
import { andList, fileList } from './andList';

describe('fileList — the one wording for a list of files (walk 900: "the b, c-file")', () => {
  it('one, two, three files', () => {
    expect(fileList(['c'])).toBe('the c-file');
    expect(fileList(['b', 'c'])).toBe('the b- and c-files');
    expect(fileList(['a', 'b', 'c'])).toBe(`the ${andList(['a-', 'b-', 'c'])}-files`);
    expect(fileList([])).toBe('');
  });
});

describe('lineShape names where a long line lands (claim check 2026-10-17)', () => {
  it('a long line is its first move and where it lands, each with its mover', async () => {
    const { lineShape } = await import('./andList');
    expect(lineShape(['a', 'b', 'c', 'd'], 'you', null)).toBe('you play a and, two moves later, they play d');
  });
});

describe('a long line names the move that wins (David 2026-11-09: "yes!")', () => {
  it('the capture that takes the rook is said — the old shape went from Bxb7 straight to Rxa8', async () => {
    const { lineShape, lineShapePlies } = await import('./andList');
    // Bxb7 Bxb2 Bxa8 Rxa8: the bishop takes on b7, then the rook on a8.
    const fen = 'r2r2k1/1b6/8/8/4B3/2b5/1P6/6K1 w - - 0 1';
    const line = ['Bxb7', 'Bxb2', 'Bxa8', 'Rxa8'];
    expect(lineShapePlies(line, fen)).toEqual([0, 2, 3]);
    expect(lineShape(line, 'you', fen)).toBe('you play Bxb7 and Bxa8 a move later, and they answer Rxa8');
  });
  it('the knight taken in the middle is said, though the line is cut before the recapture (Carlsen–Caruana 19…Ng5, prod Review)', async () => {
    const { lineShape } = await import('./andList');
    // After …bxa4: Rxa4 axb4 dxe6 Rxa4 — the d-pawn takes the knight; the line
    // is said to their rook taking yours (you take theirs back after).
    const fen = 'r3qrk1/1bp2pb1/3pn1pp/p2P4/pP2Pn1B/4NN2/2B2PPP/R2QR1K1 w - - 0 20';
    expect(lineShape(['Rxa4', '…axb4', 'dxe6', '…Rxa4'], 'you', fen)).toBe('you play Rxa4 and dxe6 a move later, and they answer Rxa4');
  });
  it('a line whose last move takes the most already names the win: nothing is added', async () => {
    const { lineShape } = await import('./andList');
    // Nd5 h6 Nxc7+ Kd7 Nxa8: the rook on a8 is the win, and it ends the line.
    const fen = 'r3k3/2p4p/8/8/8/2N5/8/6K1 w - - 0 1';
    expect(lineShape(['Nd5', 'h6', 'Nxc7+', 'Kd7', 'Nxa8'], 'you', fen)).toBe('you play Nd5 and, two moves later, you play Nxa8');
  });
  it('one half of a trade is never the move that wins', async () => {
    const { lineShapePlies } = await import('./andList');
    // Ng5 Be6 Bxe6 fxe6 Nxe6: bishop for bishop, then the knight takes e6.
    expect(lineShapePlies(['Ng5', 'Be6', 'Bxe6', 'fxe6', 'Nxe6'], '2b1k3/5p2/8/8/8/1B3N2/8/6K1 w - - 0 1')).toEqual([0, 4]);
  });
  it('a piece given for less: the move that takes it back is the win', async () => {
    const { lineShape } = await import('./andList');
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1';
    expect(lineShape(['Bxf7+', 'Kxf7', 'Ng5+', 'Kg8', 'Qf3'], 'you', fen)).toBe('you play Bxf7+, they answer Kxf7 and, two moves later, you play Qf3');
  });
  it('one move at most, never a score sheet, and with no board nothing is added', async () => {
    const { lineShapePlies } = await import('./andList');
    expect(lineShapePlies(['Nxe5', 'dxe5', 'Qxd8+', 'Kxd8', 'Bxf7'], null)).toEqual([0, 4]);
    expect(lineShapePlies(['a', 'b', 'c', 'd'], null)).toEqual([0, 3]);
  });
});

describe('every move of a spoken line says whose it is (OS-8 gap 7, Smith-Morra replay 2026-10-19)', () => {
  it('"Nxd5, Nxd5 and Bxd5" becomes yours and theirs', async () => {
    const { lineShape, seatedLine } = await import('./andList');
    expect(lineShape(['Nxd5', 'Nxd5', 'Bxd5'], 'you', null)).toBe('you play Nxd5, they answer Nxd5 and you play Bxd5');
    expect(lineShape(['Nxd5', 'Nxd5'], 'they', null)).toBe('they play Nxd5 and you answer Nxd5');
    expect(seatedLine(['…Qxd5'], 'they')).toBe('they play Qxd5');
  });
  it('no student: the colours, with the verb agreeing', async () => {
    const { seatedLine } = await import('./andList');
    expect(seatedLine(['e4', 'e5', 'Nf3'], 'White')).toBe('White plays e4, Black answers e5 and White plays Nf3');
  });
  it('castling is said as castling', async () => {
    const { seatedLine } = await import('./andList');
    expect(seatedLine(['Bxf7+', 'O-O'], 'you')).toBe('you play Bxf7+ and they castle kingside');
    expect(seatedLine(['O-O-O+'], 'White')).toBe('White castles queenside with check');
  });
  it('the first mover is the side to move on the board, seen from the student', async () => {
    const { lineSeatAt } = await import('./andList');
    const fen = 'rnbqkbnr/pp1ppppp/8/8/3pP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3';
    expect(lineSeatAt(fen, 'w')).toBe('you');
    expect(lineSeatAt(fen, 'b')).toBe('they');
    expect(lineSeatAt(fen, null)).toBe('White');
  });
});
