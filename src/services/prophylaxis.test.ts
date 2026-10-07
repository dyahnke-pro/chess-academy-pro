import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findProphylaxis, prophylaxisLine, prophylaxisProof } from './prophylaxis';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('prophylaxis — the quiet move that stops their next move', () => {
  it('h3 before …Bg4 pins the knight on f3 to the queen on d1', () => {
    // 1.e4 e5 2.Nf3 d6 3.d4 Nf6 4.Nc3 Nc6 — White to move; …Bg4 would pin the f3 knight to the queen.
    const fenW = after(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Nf6', 'Nc3', 'Nc6']);
    const p = findProphylaxis(fenW);
    expect(p).not.toBeNull();
    expect(p?.kind).toBe('pin');
    expect(p?.intent.san).toBe('Bg4');
    expect(p?.victim.square).toBe('f3');
    expect(p?.prevention.san).toBe('h3');
    const line = prophylaxisLine(p!);
    expect(line).toMatch(/^h3 first — it stops the pin with Bg4 before it lands\./);
    expect(prophylaxisProof(p!).full).toBe('Bg4 would pin your knight on f3, and after h3 the pawn covers g4');
    expect(prophylaxisProof(p!).exact).toBe(true);
  });

  it('quiet when nothing of theirs pins or kicks', () => {
    expect(findProphylaxis(new Chess().fen())).toBeNull();
  });

  it('a fork square is taken away: …Ne5 would fork both rooks, and d4 covers e5', () => {
    const fen = 'k7/5n2/8/8/2R3R1/3P4/8/7K w - - 0 1';
    const p = findProphylaxis(fen);
    expect(p?.kind).toBe('fork');
    expect(p?.intent.san).toBe('Ne5');
    expect(p?.prevention.san).toBe('d4');
    expect(prophylaxisLine(p!)).toBe('d4 first — it stops the fork with Ne5 before it lands. Ne5 would fork your rook on c4, and after d4 the pawn covers e5.');
  });
});
