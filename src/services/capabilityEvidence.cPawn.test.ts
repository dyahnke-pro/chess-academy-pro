import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { capabilitiesPosed, capabilitiesShown } from './capabilityEvidence';

// The c-pawn block's record half (missed computers, 2026-10-08): in a d-pawn
// opening the queen's knight's square IS the answer — c3 blocks the c-pawn.
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('the queen\'s knight in a d-pawn opening', () => {
  const fen = fenAfter(['d4', 'd5', 'Nf3', 'Nf6']); // White to move, c2 unmoved, no e4
  const tag = (san: string) => capabilitiesPosed(fen, san, 'white').find((p) => p.tag === 'misplaced-piece');
  it('Nc3 blocks the c-pawn: broken', () => {
    expect(tag('Nc3')?.outcome).toBe('broken');
    expect(capabilitiesShown(fen, 'Nc3', 'white', 0).some((p) => p.tag === 'misplaced-piece')).toBe(false);
  });
  it('Nbd2 keeps it free: held', () => {
    expect(tag('Nbd2')?.outcome).toBe('held');
  });
  it('a move that is not the queen\'s knight asks nothing', () => {
    expect(tag('c4')).toBeUndefined();
  });
  it('with e4 played it is not a d-pawn opening', () => {
    const e = fenAfter(['d4', 'd5', 'e4', 'dxe4']);
    expect(capabilitiesPosed(e, 'Nc3', 'white').some((p) => p.tag === 'misplaced-piece' && p.outcome)).toBe(false);
  });
});
