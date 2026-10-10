import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { openingEndRule, openingIsOver } from './openingEnd';
import { classifyPhase } from './gamePhaseService';
import { phaseOfFen } from './boardConcepts';

const play = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };
// Italian, both sides out and castled by move 8.
const DEVELOPED = play('e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Nbd2 Ba7');

describe('openingEnd — the one opening-end definition (David 2026-10-10)', () => {
  it('both sides developed and castled at move 9: the opening is over', () => {
    expect(openingEndRule(DEVELOPED, 9, 'either')).not.toBeNull();
    // The old classifier said "opening" for every move up to 10.
    expect(classifyPhase(DEVELOPED, { fullMove: 9 })).toBe('middlegame');
    expect(phaseOfFen(DEVELOPED)).toBe('middlegame');
  });
  it('move 4 of a quiet opening: still the opening, everywhere', () => {
    const early = play('e4 e5 Nf3 Nc6 Bc4 Bc5');
    expect(openingIsOver(early, 4, 'either')).toBe(false);
    expect(classifyPhase(early, { fullMove: 4 })).toBe('opening');
    expect(phaseOfFen(early)).toBe('opening');
  });
  it('a queen trade ends it at once (rule 3)', () => {
    const qx = play('e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 Qe2 Qe7 d3 Nf6 Qxe7+ Bxe7');
    expect(openingEndRule(qx, 7, 'either')).toBe('major-captured');
  });
});
