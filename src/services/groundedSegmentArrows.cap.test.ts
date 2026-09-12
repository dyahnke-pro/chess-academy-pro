import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { groundedSegmentArrows, MAX_GREEN_ARROWS_PER_PLY } from './openingGenerator';

// ── FOUR ARROWS IS THE CEILING (David 2026-09-12) ────────────────────────────
//
// "If spoken sequences are 4 moves or longer play them out and snap back. 3 or
// less can get arrows? Or maybe 4 or less? And bump walkthrough to 5."
//
// Teaching the deriver the spoken register (so "the queen to f3" draws) had a
// cost nobody asked for: 74 nodes crossed five green arrows and one Alapin node
// drew SEVENTEEN, laying a whole calculation over a single position. Green
// arrows accumulate as a beat's sentences are spoken, so the student ends up
// looking at the variation as a diagram. Above the ceiling we draw nothing and
// leave the line for the walk-out.

const at = (sans: readonly string[]): { fen: string; from: string; to: string } => {
  const c = new Chess();
  let last = { from: 'e2', to: 'e4' };
  for (const s of sans) { const m = c.move(s); last = { from: m.from, to: m.to }; }
  return { fen: c.fen(), ...last };
};

describe('green-arrow ceiling', () => {
  it('draws a short sequence normally', () => {
    const mv = at(['e4', 'c5', 'Nf3', 'Nc6', 'd4', 'cxd4', 'Nxd4', 'g6']);
    const r = groundedSegmentArrows(
      "Through the early moves — the knight to c3, White's bishop to e3, our knight to f6 —",
      '', mv,
    );
    const green = r.arrows.filter((a) => a.color === 'green');
    expect(green.length).toBe(3);
    expect(green.length).toBeLessThanOrEqual(MAX_GREEN_ARROWS_PER_PLY);
  });

  it('draws NOTHING green when a ply recites a whole line', () => {
    const mv = at(['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nc6', 'Nf3', 'Bg4', 'Nbd2', 'Nf6', 'Bc4', 'Bxf3']);
    const text =
      'The bishop takes f3, and now a decision. The queen takes f3 allows a queen trade, ' +
      'so the pawn to f3 is risky; the knight to a5 hits the bishop, the queen to b5 offers ' +
      'the trade, the queen to d7 keeps it on, the queen to c6 eyes the long diagonal, and ' +
      'the knight to e5 lands in the middle.';
    const green = groundedSegmentArrows(text, '', mv).arrows.filter((a) => a.color === 'green');
    expect(green).toEqual([]);
  });

  it('keeps the orange trail even when the green arrows are withheld', () => {
    // The move being played is never in doubt — only the recited line waits.
    const mv = at(['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nc6', 'Nf3', 'Bg4', 'Nbd2', 'Nf6', 'Bc4', 'Bxf3']);
    const text =
      'The queen takes f3, the pawn to f3, the knight to a5, the queen to b5, the queen to d7, ' +
      'the queen to c6, the knight to e5.';
    const arrows = groundedSegmentArrows(text, '', mv).arrows;
    expect(arrows.filter((a) => a.color === 'orange')).toHaveLength(1);
    expect(arrows.filter((a) => a.color === 'green')).toEqual([]);
  });

  it('exposes no spans for a withheld line, so no sentence claims one', () => {
    const mv = at(['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nc6', 'Nf3', 'Bg4', 'Nbd2', 'Nf6', 'Bc4', 'Bxf3']);
    const text =
      'The queen takes f3, the pawn to f3, the knight to a5, the queen to b5, the queen to d7, ' +
      'the queen to c6, the knight to e5.';
    expect(groundedSegmentArrows(text, '', mv).spans).toEqual([]);
  });
});
