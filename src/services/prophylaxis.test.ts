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
});
