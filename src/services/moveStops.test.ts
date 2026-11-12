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
    expect(pin?.would).toBe('would pin your knight on f3 against your queen on d1');
  });
  it("a move that stops nothing says nothing", () => {
    expect(moveStops(new Chess().fen(), 'e4', true)).toEqual([]);
  });
  it("the opponent's stop is said in their seat", () => {
    const stops = moveStops(fenAfter('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 Nf6 O-O d6 c3'), 'h6', false);
    expect(stops.find((s) => s.san === 'Bg5')?.would ?? '').toMatch(/their knight on f6 against their queen on d8/);
  });
});
