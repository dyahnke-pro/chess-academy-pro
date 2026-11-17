import { describe, it, expect } from 'vitest';
import { captureOrder, type OrderRead } from './captureOrder';

// J4WzT 21.Nxb8+ (Danya): "order of operations — first take the rook with
// check, then collect the other one". The engine's fan before the move (depth
// 14, White's view): Nxb8+ +9.39, Nxd5 first +8.29 (…Kxc6 takes the knight).
const FEN = '1r6/p2kbpp1/2Np1n1p/3r4/8/P1N1B3/1PP2PPP/1R3RK1 w - - 0 21';
const READS: OrderRead[] = [
  { evaluation: 939, mate: null, moves: ['c6b8', 'd7c8', 'c3d5', 'f6d5', 'b8c6', 'a7a6'] },
  { evaluation: 829, mate: null, moves: ['c3d5', 'd7c6', 'd5e7', 'c6d7', 'f1e1', 'b8b5'] },
  { evaluation: 682, mate: null, moves: ['c6e7', 'd7e7', 'e3a7', 'b8a8', 'f1e1', 'e7f8'] },
];
const LINE = ['Ke6', 'Nxd5', 'Kxd5', 'Bxa7'];

describe('captureOrder — two pieces to take, the one with check first', () => {
  it('Nxb8+ first, and the rook on d5 is still there after; Nxd5 first lets the king take the knight', () => {
    const o = captureOrder(FEN, 'Nxb8+', LINE, READS, true, 'past');
    expect(o?.first.square).toBe('b8');
    expect(o?.second.square).toBe('d5');
    expect(o?.because).toMatch(/their king take your knight on c6/);
    expect(o?.text).toMatch(/b8/);
    expect(o?.text).toMatch(/d5/);
  });

  it('is said from their seat when they get the order right', () => {
    expect(captureOrder(FEN, 'Nxb8+', LINE, READS, false, 'past')?.text).toMatch(/they took with check first|got the order right/);
  });

  it('stays quiet when the reads say the order hardly matters', () => {
    const flat = READS.map((r, k) => (k === 1 ? { ...r, evaluation: 920 } : r));
    expect(captureOrder(FEN, 'Nxb8+', LINE, flat, true, 'past')).toBeNull();
  });

  it('stays quiet when the other capture first was never read', () => {
    expect(captureOrder(FEN, 'Nxb8+', LINE, [READS[0], READS[2]], true, 'past')).toBeNull();
  });
});
