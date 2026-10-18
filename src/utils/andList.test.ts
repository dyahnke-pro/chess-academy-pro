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
  it('says the first move and the last, never "the moves that follow"', async () => {
    const { lineShape } = await import('./andList');
    expect(lineShape(['Nxe5', 'dxe5', 'Qxd8+', 'Kxd8', 'Bxf7'])).toBe('Nxe5 and, two moves later, Bxf7');
    expect(lineShape(['Nxe5', 'dxe5', 'Qxd8+'])).toBe('Nxe5, dxe5 and Qxd8+');
    expect(lineShape(['a', 'b', 'c', 'd'])).toBe('a and, two moves later, d');
  });
});
