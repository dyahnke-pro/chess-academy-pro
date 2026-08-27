import { describe, it, expect } from 'vitest';
import { detectLatentDanger, latentDangerClause, detectTradeCreatesPin, tradeDangerClause } from './latentDanger';

describe('detectLatentDanger — the pin-in-waiting (David\'s heartbreak case)', () => {
  it('flags a bishop lined up in front of its own king on a rook file', () => {
    // White: Kd1... no. Black rook e8, white bishop e5, white KING e1 — the
    // bishop is pinned to the king down the e-file (line already open).
    const d = detectLatentDanger('4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 1', 'w');
    expect(d).not.toBeNull();
    expect(d).toMatchObject({ frontPiece: 'b', frontSquare: 'e5', backPiece: 'k', backSquare: 'e1', enemyPiece: 'r', line: 'file' });
    expect(d!.latent).toBe(false); // line is open → live-ish
  });

  it('flags the LATENT case — a shield between the rook and the bishop', () => {
    // Black rook e8, black pawn e6 (the shield), white bishop e5, white king e1.
    // If the e6 pawn ever leaves/trades, the pin lands — latent.
    const d = detectLatentDanger('4r1k1/8/4p3/4B3/8/8/8/4K3 w - - 0 1', 'w');
    expect(d).not.toBeNull();
    expect(d).toMatchObject({ frontPiece: 'b', backPiece: 'k', line: 'file' });
    expect(d!.latent).toBe(true);
  });

  it('flags a queen behind a minor on a diagonal (bishop skewer geometry)', () => {
    // Black bishop a1 on the long diagonal, white knight d4 (front), white queen
    // h8 (behind) — wait, use: black Bb2, white Nd4, white Qg7? build a clean one.
    // Black bishop on h8, white knight on e5 (front), white queen on b2 (behind),
    // all on the a1-h8 diagonal.
    const d = detectLatentDanger('7b/8/8/4N3/8/8/1Q6/6K1 w - - 0 1', 'w');
    expect(d).not.toBeNull();
    expect(d).toMatchObject({ frontPiece: 'n', backPiece: 'q', line: 'diagonal' });
  });

  it('does NOT flag when the back piece is not more valuable', () => {
    // Rook behind a rook — no pin geometry worth warning (equal value, not k/q).
    expect(detectLatentDanger('4r1k1/8/8/4R3/8/8/8/4R1K1 w - - 0 1', 'w')).toBeNull();
  });

  it('does NOT flag a clean position', () => {
    expect(detectLatentDanger('6k1/8/8/8/8/8/8/6K1 w - - 0 1', 'w')).toBeNull();
  });

  it('does NOT flag when two shields sit between the enemy and the front piece', () => {
    // Rook e8, two black pawns e6+e5, white bishop e4, king e1 — too remote.
    expect(detectLatentDanger('4r1k1/8/4p3/4p3/4B3/8/8/4K3 w - - 0 1', 'w')).toBeNull();
  });

  it('renders a guide-don\'t-tell warning naming the alignment, never a move', () => {
    const d = detectLatentDanger('4r1k1/8/8/4B3/8/8/8/4K3 w - - 0 1', 'w')!;
    const line = latentDangerClause(d);
    expect(line).toMatch(/bishop on e5/);
    expect(line).toMatch(/king/);
    expect(line).toMatch(/file/);
    // Names the square (lead-the-eye) but NEVER a move to play (no capture / no
    // piece-to-square SAN) — guide-don't-tell.
    expect(line).not.toMatch(/[NBRQK]x?[a-h][1-8]|x[a-h][1-8]/);
  });
});

describe('detectTradeCreatesPin — v2, the trade that CREATES the pin (David\'s loss)', () => {
  // White Ke1, Bd4, Black Re8 + Ne5 (the trade bait), Kg8. Before: no alignment
  // (the knight shields the file). Bxe5 puts the bishop in front of its own king
  // on the open e-file with the rook behind — a pin the TRADE creates.
  const FEN = '4r1k1/8/8/4n3/3B4/8/8/4K3 w - - 0 1';

  it('flags the capturing trade that newly lines up king + bishop for a pin', () => {
    expect(detectLatentDanger(FEN, 'w')).toBeNull(); // no standing danger before
    const t = detectTradeCreatesPin(FEN, 'w')!;
    expect(t).not.toBeNull();
    expect(t).toMatchObject({ tradeFrom: 'd4', tradeTo: 'e5', frontPiece: 'b', backPiece: 'k', line: 'file' });
  });

  it('renders a warning that names the trade square + alignment, never "don\'t trade"', () => {
    const t = detectTradeCreatesPin(FEN, 'w')!;
    const line = tradeDangerClause(t);
    expect(line).toMatch(/before you trade on e5/);
    expect(line).toMatch(/bishop on e5.*king.*file/);
    expect(line).not.toMatch(/don't trade/i);
  });

  it('returns null when no capture creates a pin', () => {
    // A quiet position with a capture available that does not align the king.
    expect(detectTradeCreatesPin('6k1/8/8/3n4/3B4/8/8/6K1 w - - 0 1', 'w')).toBeNull();
  });

  it('returns null when it is not the student\'s move', () => {
    expect(detectTradeCreatesPin(FEN, 'b')).toBeNull();
  });
});
