import { describe, expect, it } from 'vitest';
import { pawnCutsGuard } from './pawnLines';

describe('pawnCutsGuard', () => {
  // Danya, 4T9-0D4SnMk 13...c3: "…c3 interferes: it blocks the queen's
  // diagonal to a5".
  const FEN = 'r2q1rk1/pp3pbp/3p1np1/N3pb2/2p5/4B3/PP1QPPPP/R3KB1R b KQ - 1 13';
  it('names the queen cut off and the knight left hanging', () => {
    const r = pawnCutsGuard(FEN, 'c3', true);
    expect(r?.text).toMatch(/queen on d2/);
    expect(r?.text).toMatch(/knight on a5/);
    expect(r?.text).toMatch(/no guard/);
    expect(r?.gain).toBe(3);
  });
  // Danya, BGTBTghFQDI 9…c4: "…c4 cuts the line between the b3 queen and the
  // f7 bishop" — the bishop it cuts, never the queen the pawn itself hits.
  it('names the bishop on f7, not the queen the pawn attacks', () => {
    const r = pawnCutsGuard('rnbq1b1r/3pkBpp/p7/1pp5/3pn3/1QP2N2/PP3PPP/RNB1R1K1 b - - 2 9', 'c4', false);
    expect(r?.text).toMatch(/bishop on f7/);
    expect(r?.text).toMatch(/queen on b3/);
    expect(r?.key).toBe('guard-cut:c4:f7');
  });
  it('is quiet when another guard still holds the piece', () => {
    expect(pawnCutsGuard('r2q1rk1/pp3pbp/3p1np1/N3pb2/1Pp5/4B3/P2QPPPP/R3KB1R b KQ - 1 13', 'c3', true)).toBeNull();
  });
});
