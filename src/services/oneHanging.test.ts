import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findHangingPieces } from './tacticClassifier';
import { findHangingBySee } from './positionReadingService';

// ONE HANGING COMPUTER (one-coach P2, census group 2) — both on real corpus
// boards where the two old reads disagreed.
describe('hanging is read one way', () => {
  it('an x-ray guard is a guard: …Bh4 is not hanging to Qh3 with the queen on h1 behind', () => {
    const fen = 'r4rk1/2p2ppp/p7/1p6/3P2Pb/1BP4Q/PP1BK1P1/RN5q b - - 3 22';
    expect(findHangingPieces(new Chess(fen)).map((h) => h.square)).not.toContain('h4');
    expect(findHangingBySee(fen).map((h) => h.square)).not.toContain('h4');
  });
  it('in check is not pinned: the loose pawns fall once the check is answered', () => {
    const fen = 'r4k2/2R2R2/p2r2p1/3n1p2/1P1p1P1p/3B4/P2K2PP/8 b - - 5 32';
    expect(findHangingPieces(new Chess(fen)).map((h) => h.square).sort()).toEqual(['b4', 'f4']);
  });
  it('a loose piece the SEE read sees is the same piece both reads name', () => {
    const fen = '4k3/8/8/4n3/8/8/8/4K2R w - - 0 1'.replace('4K2R', '4KQ2');
    const scan = findHangingPieces(new Chess(fen)).map((h) => h.square);
    const see = findHangingBySee(fen).filter((h) => scan.includes(h.square)).map((h) => h.square);
    expect(see).toEqual(scan);
  });
});
