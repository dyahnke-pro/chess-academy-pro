// The tempting move's hope and why its refutation is easy to miss (Danya's
// read, steps 3 and 4). Both fail on the old build: the read had neither.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { countingOn, easyToMiss } from './temptingHope';
import { renderEasyToMiss } from './teachingSentence';

const fenOf = (line: string[]): string => { const b = new Chess(); for (const m of line) b.move(m); return b.fen(); };
const LEGAL = fenOf(['e4', 'e5', 'Nf3', 'd6', 'Bc4', 'Bg4', 'Nc3', 'g6', 'Nxe5']);
const SHILLING = fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4']);
const ELEPHANT = fenOf(['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5']);

describe('what the tempting move is counting on', () => {
  it("Legal's mate: …Bxd1 counts on the queen being taken back", () => {
    expect(countingOn(LEGAL, 'g4d1', 'c4f7', 1500)).toMatch(/^(Kxd1|Nxd1)$/);
  });
  it('a recapture that IS the refutation is no hope (the Elephant Trap: Nxd5? Nxd5)', () => {
    expect(countingOn(ELEPHANT, 'c3d5', 'f6d5', 1500)).toBeNull();
  });
  it('a try that takes nothing counts on nothing said', () => {
    expect(countingOn(LEGAL, 'g8f6', 'e5g4', 1500)).toBeNull();
  });
  it('a trade that loses material is no hope (Bxf7+ Kxf7: a bishop for a pawn)', () => {
    expect(countingOn(SHILLING, 'c4f7', 'd8e7', 1500)).toBeNull();
  });
});

describe('why the refutation is easy to miss', () => {
  it('the Shilling: …Qg5 is a quiet move few players look at', () => {
    expect(easyToMiss(SHILLING, 'f3e5', 'd8g5', 1500)).toBe('quiet');
    expect(renderEasyToMiss('quiet', '…Qg5', 0)).toMatch(/…Qg5 is/);
  });
  it('a capture or a check is never "easy to miss"', () => {
    expect(easyToMiss(LEGAL, 'g4d1', 'c4f7', 1500)).toBeNull();
    expect(easyToMiss(ELEPHANT, 'c3d5', 'f6d5', 1500)).toBeNull();
  });
});

describe('a recapture written the same as the try is never the hope (prod Review 2026-11-21: "With gxf5 they hoped for gxf5")', () => {
  it('gxf5 hoping for …gxf5 says nothing', async () => {
    const { countingOn } = await import('./temptingHope');
    expect(countingOn('4k3/8/6p1/5p2/6P1/8/8/4K3 w - - 0 1', 'g4f5', 'e1d2', 1500)).toBeNull();
  });
});
