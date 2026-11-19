import { describe, expect, it } from 'vitest';
import { kingBox, kingBoxMove } from './kingBox';

const moverOf = (fen: string): 'w' | 'b' => (fen.split(' ')[1] === 'b' ? 'b' : 'w');

// Danya, "The Art of Time Management" (the-art-of-time-management#3): K+R v K, the box method.
const KRK = '8/8/8/4k3/8/4K3/5R2/8 w - - 0 1';

describe('kingBox', () => {
  it('counts the box the rook on f2 draws around the king on e5', () => {
    expect(kingBox(KRK)).toMatchObject({ files: 5, ranks: 6, area: 30, piece: 'f2' });
  });
  it('Rd2, the engine\'s move, shrinks the box from 30 to 24 squares', () => {
    const r = kingBoxMove(KRK, 'Rd2', moverOf(KRK));
    expect(r?.after).toMatchObject({ files: 4, ranks: 6, area: 24 });
    expect(r?.text).toContain('shrinks their king\'s box from 30 squares to 24');
  });
  it('stays silent on a move that grows the box or hangs the rook', () => {
    expect(kingBoxMove(KRK, 'Rf1', moverOf(KRK))).toBeNull();
    expect(kingBoxMove('8/8/8/4k3/8/8/1K3R2/8 w - - 0 1', 'Rf5+', moverOf('8/8/8/4k3/8/8/1K3R2/8 w - - 0 1'))).toBeNull();
  });
  it('is not this ending with pawns on the board', () => {
    expect(kingBox('8/8/8/4k3/8/4K3/P4R2/8 w - - 0 1')).toBeNull();
  });
  it('their box from the student\'s seat: your king boxed, their rook', () => {
    const r = kingBoxMove(KRK, 'Rd2', 'b');
    expect(r?.text).toMatch(/^Their Rd2 shrinks your king's box/);
    expect(r?.text).toMatch(/their rook/);
    expect(r?.text).not.toMatch(/\byour rook\b/);
  });
});
