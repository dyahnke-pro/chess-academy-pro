import { describe, expect, it } from 'vitest';
import { drawnEnding, lockedPawns, LOCKED_TEXT } from './drawnEnding';
import { endgameVerdict } from './endgameVerdict';

const level = (moves: string[]) => [{ moves, cp: 0, mate: null }];

// Boards from his refuted tries (the board the try's line reaches), each with
// the engine's own level line on it.
describe('drawnEnding', () => {
  // the-importance-of-solving-studies#0, Kf1 (Danya: "is obviously a draw"):
  // White two pawns up, the bishops on opposite colours.
  it('opposite-coloured bishops two pawns up hold', () => {
    const r = drawnEnding('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2', 'b6c7'], cp: 6, mate: null }], 'w');
    expect(r?.reason).toBe('oppositeBishops');
    expect(r?.side).toBe('b');
    expect(r?.text).toBe('The bishops are of opposite colours, so your two extra pawns are not enough: their bishop and king hold the dark squares in front of them, and your bishop can never touch those.');
  });

  // modern-chess-technique#2, Ng7 (Danya: "is a draw!"): once the f-pawn goes
  // White is left with a lone knight.
  it('a lone knight cannot mate', () => {
    const r = drawnEnding('8/8/8/5k2/K7/8/8/6N1 w - - 0 80', level(['a4b5', 'f5g4']), 'w');
    expect(r?.reason).toBe('cannotMate');
    expect(r?.text).toBe('Your last pawn is gone, and a lone knight cannot force mate: you cannot win this.');
  });

  // the-importance-of-solving-studies#0 (Danya: "a corner pawn of the right
  // colour" is the win; the wrong one is the draw).
  it('the wrong bishop for the rook pawn, their king in the corner', () => {
    const r = drawnEnding('7k/8/7P/8/8/3B4/8/6K1 w - - 0 1', level(['g1g2', 'h8g8']), 'w');
    expect(r?.reason).toBe('wrongBishop');
    expect(r?.text).toContain('it can never cover h8');
    // The right bishop is no draw.
    expect(drawnEnding('7k/8/7P/8/8/4B3/8/6K1 w - - 0 1', level(['g1g2', 'h8g8']), 'w')).toBeNull();
  });

  it('a rook pawn and the king in front', () => {
    expect(drawnEnding('k7/8/K7/P7/8/8/8/8 b - - 0 1', level(['a8b8', 'a6b6']), 'b')?.reason).toBe('rookPawn');
  });

  it('one pawn, their king in front of it', () => {
    const r = drawnEnding('4k3/8/8/4P3/4K3/8/8/8 b - - 0 1', level(['e8e7', 'e4f5']), 'w');
    expect(r?.reason).toBe('kingInFront');
    expect(r?.text).toBe('Their king stands in front of the e-pawn: with the king blocking it, one pawn is not enough to win.');
  });

  it('a rook each, one pawn up, every pawn on one wing', () => {
    expect(drawnEnding('6k1/5pp1/7p/8/8/6PP/5PK1/r6R w - - 0 1', level(['h1h2', 'a1a2']), 'w')).toBeNull(); // level material
    const r = drawnEnding('6k1/5p2/6p1/8/8/6PP/5PK1/r6R w - - 0 1', level(['h1h2', 'a1a2']), 'b');
    expect(r?.reason).toBe('oneWing');
    expect(r?.side).toBe('b');
  });

  it('says nothing when the engine line is not level', () => {
    expect(drawnEnding('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2'], cp: 250, mate: null }], 'w')).toBeNull();
  });

  it('endgameVerdict carries the draw, held by the side behind', () => {
    const v = endgameVerdict('8/1B6/1k6/2b5/8/6PP/8/5K2 w - - 1 9', [{ moves: ['f1g2', 'b6c7'], cp: 6, mate: null }], 'w');
    expect(v?.kind).toBe('drawn');
    expect(v?.draw).toBe('oppositeBishops');
    expect(v?.side).toBe('b');
  });

  // a-guide-to-underpromotion#0, Kc5: the rook checks a king away from a pawn
  // on c7. That is no "maneuvering on a dead board".
  it('no "nothing can be forced" over checks and a pawn on the seventh', () => {
    const L = [{ moves: ['c5c6', 'd2c2', 'c6b7', 'a1b1', 'b7b8', 'c2c3', 'c7c8q', 'c3c8'], cp: 0, mate: null }];
    expect(endgameVerdict('8/2P5/8/2K5/8/8/3r4/k7 w - - 3 3', L, 'w')).toBeNull();
  });
});

// His "White cannot make progress" / "totally locked up": the pawn chain
// frozen, and no king can ever reach a pawn it could take.
describe('the locked pawn ending', () => {
  // A textbook wall: four rams, every square between the chains covered.
  const wall = '8/8/2k5/p1p1p1p1/P1P1P1P1/8/8/4K3 w - - 0 1';
  it('a chain across the board walls both kings out: a draw', () => {
    const lock = lockedPawns(wall);
    expect(lock?.rams.length).toBe(8);
    expect(lock?.reach.w.every((s) => Number(s[1]) <= 3)).toBe(true);
    expect(lock?.reach.b.every((s) => Number(s[1]) >= 6)).toBe(true);
    // The engine reads it level (depth 24: Kf1 Kd7 Kf2 …, 0.00).
    const r = drawnEnding(wall, level(['e1f1', 'c6d7', 'f1f2', 'd7c7']), 'w');
    expect(r?.reason).toBe('locked');
    expect(r?.text).toBe(LOCKED_TEXT);
    expect(endgameVerdict(wall, level(['e1f1', 'c6d7']), 'w')?.draw).toBe('locked');
  });

  it('a gap in the wall lets a king in: no lock', () => {
    // No g-pawns: the white king walks g4, f5 and takes the unguarded e5.
    expect(lockedPawns('8/8/2k5/p1p1p3/P1P1P3/8/8/4K3 w - - 0 1')).toBeNull();
  });

  it('a pawn that can still move or take is no lock', () => {
    expect(lockedPawns('8/6p1/2k5/p1p1p3/P1P1P1P1/8/8/4K3 w - - 0 1')).toBeNull(); // g4 free
    expect(lockedPawns('4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1')).toBeNull(); // exd5 is on
    expect(lockedPawns('4k3/8/8/3p4/3PR3/8/8/4K3 w - - 0 1')).toBeNull(); // a rook on the board
  });

  // never-resign-prematurely#0 (h6??; "and once again, White cannot make
  // progress"): the draw there is the kings, not a frozen chain: h4-h5 and
  // …h6 are still on. No board of the best line (Kg8 Ke8 Kg7 …) is locked.
  it('his Timman board is a king draw, not a lock', () => {
    expect(lockedPawns('8/4K1kp/6p1/6P1/7P/8/8/8 b - - 3 65')).toBeNull();
    expect(lockedPawns('6k1/4K2p/6p1/6P1/7P/8/8/8 w - - 4 66')).toBeNull();
  });

  // pawn-endgames-a-practical-guide#1 (e4?): the e-pawn and the f3 pawn are
  // still free.
  it('his Kashlinskaya board is no lock', () => {
    expect(lockedPawns('8/8/8/1k4p1/6P1/4Pp2/3K4/8 w - - 0 63')).toBeNull();
  });
});

// ROOK ENDINGS THAT NOBODY CAN WIN: the textbook holds, each with the engine's
// level line (the proof), and a board off the shape that says nothing.
describe('drawnEnding: the rook-ending holds', () => {
  it('Philidor: the king in front, the rook on the third rank', () => {
    const r = drawnEnding('4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1', level(['a6b6', 'h7h8']), 'w');
    expect(r?.reason).toBe('philidor');
    expect(r?.side).toBe('b');
    expect(r?.text).toContain('third rank on a6');
    // The rook off the third rank (and the king not in front): not this shape.
    expect(drawnEnding('4k3/7R/8/3KP3/8/8/8/r7 b - - 0 1', level(['a1a6']), 'w')?.reason).not.toBe('philidor');
  });

  it('the back-rank defence against a knight pawn', () => {
    const r = drawnEnding('r5k1/1R6/5KP1/8/8/8/8/8 b - - 0 1', level(['a8a6', 'f6f5']), 'b');
    expect(r?.reason).toBe('backRank');
    expect(r?.text).toMatch(/^Your king sits on g8, the queening square of the g-pawn/);
  });

  it('the a-pawn: their rook stuck in front, ours behind, the king on g7', () => {
    const r = drawnEnding('R7/P5k1/8/8/8/8/5K2/r7 w - - 0 1', level(['f2e3', 'a1a3']), 'w');
    expect(r?.reason).toBe('rookPawnBehind');
    expect(r?.text).toContain('stuck in front of the a-pawn on a8');
    // The king on f7, not the far wing's seventh: not this shape.
    expect(drawnEnding('R7/P4k2/8/8/8/8/5K2/r7 w - - 0 1', level(['f2e3']), 'w')?.reason).not.toBe('rookPawnBehind');
  });

  it('the king in front of the pawn and the rook behind it', () => {
    const r = drawnEnding('8/7R/8/3k4/3P4/5K2/8/3r4 w - - 0 1', level(['h7h5', 'd5d6']), 'w');
    expect(r?.reason).toBe('rookBehind');
    expect(r?.text).toContain('watches it from behind on d1');
  });

  it('the king in front of the pawn, a rook each', () => {
    const r = drawnEnding('6r1/8/2k5/8/2P5/4K3/8/7R w - - 0 1', level(['h1h6', 'c6c5']), 'w');
    expect(r?.reason).toBe('rookKingInFront');
    expect(r?.text).toBe('Their king stands in front of the c-pawn on c6: with a rook each and the king blocking it, one pawn is not enough to win.');
  });

  it('a rook each, four pawns each, all on one wing: level and drawn', () => {
    const r = drawnEnding('6k1/4ppp1/7p/8/8/6PP/4PPK1/r6R w - - 0 1', level(['h1h2', 'a1a2']), 'w');
    expect(r?.reason).toBe('oneWing');
    expect(r?.text).toContain('pawns level, every one of them on the kingside');
    // Pawns on both wings: no shape.
    expect(drawnEnding('6k1/p3pp2/7p/8/8/6PP/P3PPK1/r6R w - - 0 1', level(['h1h2']), 'w')).toBeNull();
  });

  it('negative controls: a lost rook ending (Lucena) and a non-level line say nothing', () => {
    // Lucena, the engine winning: no draw.
    expect(drawnEnding('1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', [{ moves: ['c1d1'], cp: 900, mate: null }], 'w')).toBeNull();
    // The Philidor board with the engine line far from level: nothing.
    expect(drawnEnding('4k3/7R/r7/3KP3/8/8/8/8 b - - 0 1', [{ moves: ['a6b6'], cp: 300, mate: null }], 'w')).toBeNull();
    // The defending king to the side, the rook on the fourth rank: no shape.
    expect(drawnEnding('8/5k2/8/3KP3/r7/8/8/7R w - - 0 1', level(['h1h7']), 'w')).toBeNull();
  });
});
