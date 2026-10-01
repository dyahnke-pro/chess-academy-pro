import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findMissedChain } from './causalChain';
import { detectConcept } from './reviewConcepts';
import { toStudentSeat } from './inaccuracyCall';
import { computeMoveFundamentals } from './moveFundamentals';

/** Review walk 2026-10-01, game 0ipLPOAN_m8 (English → KID, student Black). */
const G2 = '1. c4 Nf6 2. d4 g6 3. Nf3 Bg7 4. g3 d6 5. Bg2 O-O 6. O-O Nbd7 7. Bg5 h6 8. Bxf6 Nxf6 9. Nc3 c5 10. d5 Bf5 11. Nd2 a6 12. e4 Bd7 13. Nf3 Ng4 14. h3 Ne5 15. Nxe5 Bxe5 16. g4 b5 17. cxb5 axb5 18. Qd2 b4 19. Ne2 Bb5 20. Rfe1 Bg7 21. Nf4 Qa5 22. h4 c4 23. h5 c3 24. bxc3 bxc3 25. Qc2 g5 26. Nd3 Qa4 27. Qxa4 Rxa4 28. Nc1 c2 29. Nb3 Bxa1 30. Rxa1 Rfa8 31. Rc1 Rxa2 32. Kh2 R8a3';
const sans = (() => { const c = new Chess(); c.loadPgn(G2); return c.history(); })();
const fenAt = (n: number): string => { const c = new Chess(); for (const s of sans.slice(0, n)) c.move(s); return c.fen(); };

describe('Review walk 2026-10-01', () => {
  it('a recaptured queen is never a "missed" loose knight (ply 54 Rxa4, not Bxd3)', () => {
    expect(sans[53]).toBe('Rxa4');
    expect(findMissedChain(sans, 54, 'b')).toBeNull();
  });

  it('a rook sliding down a file it already stood on did not "swing onto" it (ply 64 R8a3)', () => {
    expect(sans[63]).toBe('R8a3');
    const beat = detectConcept({ fenBefore: fenAt(63), fenAfter: fenAt(64), san: 'R8a3', moverColor: 'b', evalBefore: -500, evalAfter: -500, studentColor: 'b' });
    expect(beat?.concept).not.toBe('rook-open-file');
  });

  it('the opponent\'s idea is said in the student\'s seat ("toward your king")', () => {
    expect(toStudentSeat('swing pieces toward their king')).toBe('swing pieces toward your king');
    expect(toStudentSeat('trade off your bishop for their knight')).toBe('trade off their bishop for your knight');
  });

  it('…c4 in a queenside chain makes no central claim (ply 44)', () => {
    expect(sans[43]).toBe('c4');
    const funds = computeMoveFundamentals(fenAt(43), 'c4', 'black');
    expect(funds.map((f) => f.led).join(' | ')).not.toMatch(/stakes out the center/);
  });
});
