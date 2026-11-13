// Gap B2 — what a move stops, on real opening boards.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveStops } from './moveStops';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };

describe('moveStops', () => {
  it('h3 in the Italian stops …Bg4 pinning the knight to the queen', () => {
    const stops = moveStops(fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 d6'), 'h3', true);
    const pin = stops.find((s) => s.san === '…Bg4');
    expect(pin?.kind).toBe('pin');
    expect(pin?.would).toBe('would pin your knight on f3 against your queen');
  });
  it("a move that stops nothing says nothing", () => {
    expect(moveStops(new Chess().fen(), 'e4', true)).toEqual([]);
  });
  it("the opponent's stop is said in their seat", () => {
    const stops = moveStops(fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3'), 'h6', false);
    expect(stops.find((s) => s.san === 'Bg5')?.would ?? '').toMatch(/their knight on f6 against their queen/);
  });
});

describe('a stopped check is said only when the check wins something', () => {
  it('Nc3 against …Qd5: …Qe4+ only checks, so it is not a stop', () => {
    const stops = moveStops(fenAfter('e4 d5 exd5 Qxd5'), 'Nc3', true);
    expect(stops.some((s) => s.kind === 'check')).toBe(false);
  });
});

describe('the new stops (prevention, 2026-11-12)', () => {
  it("…d6 in the King's Indian: e5 no longer kicks the knight for free", () => {
    const stops = moveStops('rnbqk2r/ppppppbp/5np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR b KQkq - 0 4', 'd6', true);
    expect(stops.map((s) => s.clause)).toContain('means …dxe5 now answers e5, which would kick your knight on f6');
  });
  it('2.e5 against the Sicilian takes f6 away from their knight', () => {
    const stops = moveStops('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', 'e5', true);
    expect(stops.map((s) => s.clause)).toContain('takes f6 away from their knight on g8');
  });
  it('a quiet developing move takes no square for good', () => {
    expect(moveStops(fenAfter('e4 e5'), 'Nf3', true).filter((s) => s.kind === 'square')).toEqual([]);
  });
});

describe('stopsBreak', () => {
  it('a pawn break that now loses a pawn is stopped; one that still works is not', async () => {
    const { stopsBreak } = await import('./moveStops');
    // After 1.d4 d5, …c5 is Black's break; 2.e3 does not stop it.
    expect(stopsBreak(fenAfter('d4 d5'), 'e3', 'c5', true)).toBeNull();
    // After 1.e4 e5 2.Nf3 Nc6, Black's …d5: 3.Bc4 hits d5 a second time.
    const s = stopsBreak(fenAfter('e4 e5 Nf3 Nc6'), 'Bc4', 'd5', true);
    expect(s?.clause).toBe('stops …d5, their break in master games from here: it would now lose a pawn');
  });
});

describe('a square is taken only by a pawn that stays', () => {
  it('…dxe4 in the Caro-Kann takes nothing from the knight on g1: Nxe4 wins the pawn back', () => {
    expect(moveStops(fenAfter('e4 c6 d4 d5 Nc3'), 'dxe4', false).filter((s) => s.kind === 'square')).toEqual([]);
  });
});

