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
    expect(lineShape(['Nxe5', 'dxe5', 'Qxd8+', 'Kxd8', 'Bxf7'], 'you')).toBe('you play Nxe5 and, two moves later, you play Bxf7');
    expect(lineShape(['a', 'b', 'c', 'd'], 'you')).toBe('you play a and, two moves later, they play d');
  });
});

describe('every move of a spoken line says whose it is (OS-8 gap 7, Smith-Morra replay 2026-10-19)', () => {
  it('"Nxd5, Nxd5 and Bxd5" becomes yours and theirs', async () => {
    const { lineShape, seatedLine } = await import('./andList');
    expect(lineShape(['Nxd5', 'Nxd5', 'Bxd5'], 'you')).toBe('you play Nxd5, they answer Nxd5 and you play Bxd5');
    expect(lineShape(['Nxd5', 'Nxd5'], 'they')).toBe('they play Nxd5 and you answer Nxd5');
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
