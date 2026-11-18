// The position read's verdict comes from the ONE eval ladder, and the
// material sentence beside it agrees with that verdict (Danya's article
// boards, 2026-11-18 — FENs only, never his words).
import { describe, it, expect } from 'vitest';
import { assemblePositionAssessment } from './groundedAnswer';

const read = (fen: string, evalCp: number | null, studentColor: 'white' | 'black'): string =>
  assemblePositionAssessment({ line: null, tempting: null, evalCp, mateIn: null, tactics: null, studentColor, fen, bestUci: null })?.facts ?? '';

// a-guide-to-underpromotion #0: White's c-pawn queens against the rook; the
// engine has White clearly better (+2.6) with four points less on the board.
const UNDERPROMO = '8/8/1KP5/3r4/8/8/8/k7 w - - 0 1';

describe('the position read speaks the one eval ladder', () => {
  it('+263 is clearly better, never "decisive", and down material is not "holding your own"', () => {
    const t = read(UNDERPROMO, 263, 'white');
    expect(t).not.toMatch(/Decisive|This is won|You're winning|Well ahead/);
    expect(t).toMatch(/clearly better|A real advantage now|kind of edge that wins games|Clearly your position/);
    expect(t).not.toMatch(/holding your own/);
    expect(t).toMatch(/4 points down in material \(1 to 5\), but you're the better side/);
  });

  it('positive control: down material at a level eval still holds its own', () => {
    expect(read(UNDERPROMO, 20, 'white')).toMatch(/4 points down in material \(1 to 5\) and still holding your own/);
  });

  it('the same board read from Black at White +263: Black is up material and worse', () => {
    const t = read('8/8/1KP5/3r4/8/8/8/k7 b - - 0 1', 263, 'black');
    expect(t).toMatch(/clearly worse|Clearly against you|clearly the worse side|Clearly worse/);
    expect(t).toMatch(/4 points up in material \(5 to 1\), but the position is against you/);
    expect(t).not.toMatch(/gives it back/);
  });

  it('+300 and over is the winning band', () => {
    expect(read(UNDERPROMO, 320, 'white')).toMatch(/You're winning|This is won|Well ahead|Decisive/);
  });
});

describe('no engine read: the count, never a verdict', () => {
  // the-art-of-maneuvering #0: level material, a board the engine does not
  // call level (the read had no engine number on it).
  const MANEUVER = '4rr2/pb1qnpbk/1p1p2pp/2p1n3/4PNP1/P1NPB2P/1PP1QRB1/5R1K w - - 0 21';
  it('even material says the count and nothing about who stands better', () => {
    const t = read(MANEUVER, null, 'white');
    expect(t).toMatch(/^Material is even\./);
    expect(t).not.toMatch(/nothing is decided/);
  });
  it('positive control: with the engine number the verdict is the engine\'s', () => {
    expect(read(MANEUVER, 180, 'white')).toMatch(/clearly better|A real advantage now|kind of edge that wins games|Clearly your position/);
  });
});
