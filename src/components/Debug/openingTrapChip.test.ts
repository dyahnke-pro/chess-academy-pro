import { describe, it, expect } from 'vitest';
import { chipFor } from './openingTrapChip';

// Hand walk 2026-10-04 (D12): an Opening Traps puzzle showed "CRUSHING" — a
// Lichess eval bucket, not a motif. The chip speaks the motif vocabulary.
describe('chipFor', () => {
  it('never shows a grading tag', () => {
    expect(chipFor(['crushing', 'opening', 'short'])).toBeNull();
    expect(chipFor(['advantage', 'middlegame'])).toBeNull();
  });

  it('names the motif when a grading tag rides along', () => {
    expect(chipFor(['crushing', 'fork', 'opening'])?.label).toBe('Fork');
    expect(chipFor(['advantage', 'hangingPiece'])?.label).toBe('Hanging Piece');
  });

  it('names mates by their length, not the bare "mate" tag', () => {
    expect(chipFor(['mate', 'mateIn2', 'crushing'])?.label).toBe('Mate in 2');
  });

  it('falls back to any labelled motif with the neutral style', () => {
    const chip = chipFor(['crushing', 'discoveredAttack']);
    expect(chip?.label).toBe('Discovered Attack');
    expect(chip?.text).toBe('text-amber-400');
  });

  it('never returns a raw DB tag as a label', () => {
    for (const themes of [['crushing'], ['mate'], ['fork'], ['pin', 'advantage'], ['deflection']]) {
      const label = chipFor(themes)?.label;
      if (label) expect(themes).not.toContain(label);
    }
  });
});
