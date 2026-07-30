import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { mentionedMoveArrows } from './mentionedMoveArrows';

const fenAfter = (sans: string): string => {
  const c = new Chess();
  for (const s of sans.split(' ')) c.move(s);
  return c.fen();
};

// The Glek tabiya — the position whose narration names Na4 and the
// traditional h3/Kh2/Nd2/f4 road with no arrows (David's complaint).
const TABIYA = fenAfter('e4 e5 Nf3 Nc6 Nc3 Nf6 g3 Bc5 Bg2 d6 d3 a6 O-O O-O');

describe('mentionedMoveArrows', () => {
  it('arrows a single mentioned move from the live position', () => {
    const arrows = mentionedMoveArrows('Without a6, White plays Na4 and wins the bishop pair.', TABIYA);
    expect(arrows).toContainEqual(expect.objectContaining({ from: 'c3', to: 'a4' }));
  });

  it('arrows a whole SEQUENTIAL road, each step on the evolving position', () => {
    const arrows = mentionedMoveArrows('The traditional plan runs h3, then Kh2, Nd2 and finally f4.', TABIYA);
    const pairs = arrows.map((a) => `${a.from}-${a.to}`);
    expect(pairs).toContain('h2-h3'); // legal now
    expect(pairs).toContain('g1-h2'); // only legal AFTER h3 — the probe played it
    expect(pairs).toContain('f3-d2'); // after Kh2
    expect(pairs).toContain('f2-f4'); // after Nd2 clears the pawn's path
  });

  it('skips tokens that ground nowhere and never invents an arrow', () => {
    const arrows = mentionedMoveArrows('One day Qh5 mates, but Rxa8 is impossible here.', TABIYA);
    for (const a of arrows) {
      const legal = new Chess(TABIYA).moves({ verbose: true });
      // every arrow's from-square holds a piece that can reach its to-square
      // in the live position (parallel-mention path)
      expect(legal.some((m) => m.from === a.from && m.to === a.to)).toBe(true);
    }
    expect(arrows.map((a) => `${a.from}-${a.to}`)).not.toContain('a8-a8');
  });

  it('excludes duplicates of authored arrows', () => {
    const arrows = mentionedMoveArrows('White plays Na4 next.', TABIYA, [{ from: 'c3', to: 'a4' }]);
    expect(arrows).toHaveLength(0);
  });

  it('caps the arrow count so a move-list paragraph cannot flood the board', () => {
    const text = 'Candidate roads: h3 Kh2 Nd2 f4 Be3 Qd2 Re1 b4 a4 d4.';
    expect(mentionedMoveArrows(text, TABIYA).length).toBeLessThanOrEqual(6);
  });
});
