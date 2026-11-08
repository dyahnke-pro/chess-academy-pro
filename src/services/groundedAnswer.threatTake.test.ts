import { describe, it, expect } from 'vitest';
import { assembleThreatAnswer } from './groundedAnswer';

describe('chat threat answer — the same take-the-attacker check Learn runs', () => {
  it('a pawn hitting a bishop, nothing guarding the pawn: take it', () => {
    // h3 hits the g4 bishop and nothing guards h3, so …Bxh3 answers it.
    const fen = '4k3/8/8/8/6b1/7P/8/4K3 b - - 0 1';
    const a = assembleThreatAnswer(fen, null, 'black', 'opponent');
    expect(a?.facts).toMatch(/bishop on g4/);
    expect(a?.facts).toMatch(/you can take their pawn on h3, and that answers it/);
  });

  it('…Bxh3 gxh3 gives a bishop for a pawn — no answer, the warning stands', () => {
    const fen = '4k3/8/8/8/6b1/7P/6P1/4K3 b - - 0 1';
    const a = assembleThreatAnswer(fen, null, 'black', 'opponent');
    expect(a?.facts).toMatch(/bishop on g4/);
    expect(a?.facts).not.toMatch(/that answers it/);
  });
});

describe('a threat answer carries its proof (David 2026-11-08: "Do the narrations say this?")', () => {
  // Lichess 0GomC, White to move: their knight on f4 and queen on g3 hit the
  // bishop on d3 (no guard), the pawn on h3 (the g2 pawn guards it but the
  // queen pins it to the king) and the pawn on g2 (only the king guards it).
  const GOMC = '6k1/p1p4p/1p2n1p1/3pQ3/3P1nN1/2PB2qP/PP4P1/6K1 w - - 18 33';
  it('names what hits each target and what guards it', () => {
    const a = assembleThreatAnswer(GOMC, null, 'white', 'opponent')!.facts;
    expect(a).toMatch(/Their knight on f4 and queen on g3 hit all three/);
    expect(a).toMatch(/nothing guards the bishop/);
    expect(a).toMatch(/your pawn on g2 cannot take back on h3 \(their queen on g3 pins it to your king\)/);
    expect(a).toMatch(/only your king guards the pawn on g2/);
    expect(a).not.toMatch(/which is not defended enough/);
  });
  it('one target is said once', () => {
    const fen = '5n1r/3q4/ppp1b1k1/4PpN1/1PPP1Pp1/1PB1Q3/6K1/7R b - - 2 46';
    expect(assembleThreatAnswer(fen, null, 'black', 'opponent')!.facts)
      .toMatch(/^They're eyeing the rook on h8: their rook on h1 hits it, and nothing guards it — but you can take their rook on h1/);
  });
  it('your side says what you hit and what guards it', () => {
    // White's bishop on b5 hits the loose knight on c6.
    const fen = '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1';
    expect(assembleThreatAnswer(fen, null, 'white', 'me')!.facts).toMatch(/you can win the knight on c6: your bishop on b5 hits it, and nothing guards it/i);
  });
});

