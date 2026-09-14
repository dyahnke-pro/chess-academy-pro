import { describe, it, expect } from 'vitest';
import { detectOpposition } from './endgameTechnique';

describe('endgameTechnique — opposition detector', () => {
  it('direct opposition: kings a file apart with one square between, mover gives way', () => {
    // White Ke4, Black Ke6 (e-file, one square gap on e5), White to move → Black
    // holds the opposition.
    const r = detectOpposition('8/8/4k3/8/4K3/8/8/8 w - - 0 1');
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('direct');
    expect(r!.holder).toBe('black');
  });

  it('holder flips with side to move', () => {
    const r = detectOpposition('8/8/4k3/8/4K3/8/8/8 b - - 0 1');
    expect(r!.holder).toBe('white');
  });

  it('direct opposition on a rank', () => {
    // Kings on rank 4, c4 and e4, one square (d4) between.
    const r = detectOpposition('8/8/8/8/2K1k3/8/8/8 w - - 0 1');
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('direct');
  });

  it('distant opposition: three squares between on a file', () => {
    // White Ke1, Black Ke5 → gap of 3 (e2,e3,e4). Odd gap → distant opposition.
    const r = detectOpposition('8/8/8/4k3/8/8/8/4K3 w - - 0 1');
    expect(r).not.toBeNull();
    expect(r!.kind).toBe('distant');
  });

  it('no opposition when kings are not aligned', () => {
    expect(detectOpposition('8/8/5k2/8/4K3/8/8/8 w - - 0 1')).toBeNull();
  });

  it('no opposition on an even gap (kings aligned but 2 squares between)', () => {
    // Ke2 and Ke5 → gap of 2 (e3,e4). Even → not the opposition.
    expect(detectOpposition('8/8/8/4k3/8/8/4K3/8 w - - 0 1')).toBeNull();
  });
});
