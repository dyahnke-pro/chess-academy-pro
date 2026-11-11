import { describe, it, expect } from 'vitest';
import { analyzeOpening, classifyGame, createVariationClassifier } from './modelGameVariation.shared.mjs';

// The rule of the ONE model-game variation classifier, on lines copied from the
// openings whose games exposed each case (so the cases hold even if the data
// moves). The data gate is modelGameVariation.test.ts.

const VIENNA = {
  id: 'vienna',
  pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1 Qd7 Bb5 O-O-O O-O Be7 d4 c4',
  variations: [
    { name: 'Gambit Main Line', pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nxc3 bxc3 c5 Qg3 Nc6 Nf3 Be6 Rb1' },
    { name: 'Quiet (Bc4 + d3)', pgn: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3 Bg4 Na4' },
    { name: 'with …Nc6 + …Bc5', pgn: 'e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3' },
    { name: 'Quiet vs …Na5', pgn: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Na5 Bb3 Nxb3 axb3 d5 Nf3 d4 Ne2 Bd6 Ng3 a5 O-O Ra6 Bd2' },
  ],
};
const vienna = analyzeOpening(VIENNA);
const fileIn = (pgn: string, analysis = vienna): string | undefined => classifyGame(pgn, analysis)?.name;

describe('model-game variation classifier: position as well as move order', () => {
  it('a game that transposes into a tab files under that tab, not the tab sharing its first moves', () => {
    // The Kovalev game: 2…Nc6 3.Bc4 Nf6 is the Na5 tab's move order, but the
    // board is the Quiet tab's from move 3 and stays on it through 7.Na4.
    const kovalev = 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 Na4 Nd4 Nxc5 dxc5 O-O O-O';
    expect(classifyGame(kovalev, vienna)).toEqual({ name: 'Quiet (Bc4 + d3)', tier: 'reached' });
  });

  it('the identifying move of a tab still files a game under it', () => {
    expect(fileIn('e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Na5 Bb3 Nxb3 axb3 d5')).toBe('Quiet vs …Na5');
    // A game that stops short of the Quiet tab's …Bg4 is the shorter tab's.
    expect(fileIn('e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bc5 f4 d6 Nf3 O-O')).toBe('with …Nc6 + …Bc5');
  });

  it('a tab that is the start of the main line keeps the games that play on past it', () => {
    expect(fileIn(`${VIENNA.pgn} Be2 Kb8`)).toBe('Gambit Main Line');
  });

  it('a game that shares only the common start stays on the main line', () => {
    expect(fileIn('e4 e5 Nc3 Bc5 Bc4 d6 d3 Nf6')).toBeUndefined();
  });

  it('a transit through a tab\'s move order does not file a game that leaves it', () => {
    // Slav: 3.Nc3 is the Winawer tab's identifying move, but the game plays
    // 3…Nf6 4.Nf3 and is the a4 Bf5 main line by position.
    const slav = analyzeOpening({
      id: 'slav',
      pgn: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bg5 h6',
      variations: [
        { name: 'Main Line (a4 Bf5)', pgn: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6' },
        { name: 'Winawer Countergambit', pgn: 'd4 d5 c4 c6 Nc3 e5 dxe5 d4 Ne4 Qa5+' },
      ],
    });
    expect(fileIn('d4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7 Qe2 Bg6 e4 O-O Bd3', slav))
      .toBe('Main Line (a4 Bf5)');
  });

  it('a short tab ending on a shared position does not beat a deeper line through it', () => {
    // Dutch: the e5 Break tab stops on the 7.Nc3 Leningrad position; the game
    // reaches it by another order and goes on down the g6 Main Line tab.
    const dutch = analyzeOpening({
      id: 'dutch',
      pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4 c6',
      variations: [
        { name: 'g6 Main Line', pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Nc5 b3' },
        { name: 'e5 Break', pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3' },
      ],
    });
    expect(classifyGame('d4 d6 Nf3 g6 c4 f5 Nc3 Nf6 g3 Bg7 Bg2 O-O O-O Qe8 d5 Na6 Be3 Bd7', dutch))
      .toEqual({ name: 'g6 Main Line', tier: 'only-deep' });
  });

  it('a transit through a tab\'s own position, then back onto the shared trunk, stays on the main line', () => {
    // Old Indian: 3.Nf3 Nbd7 4.Nc3 e5 passes the Ukrainian tab's position after
    // 4…Nbd7, then 5.e4 joins the trunk every other line shares.
    const oldIndian = analyzeOpening({
      id: 'old-indian',
      pgn: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 d5 Nc5',
      variations: [
        { name: 'Czech', pgn: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Re1 a6' },
        { name: 'Be2 Development', pgn: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6 Qc2 a6' },
        { name: 'Ukrainian', pgn: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 g3 Be7 Bg2 O-O O-O c6 e4 a5' },
      ],
    });
    expect(fileIn('d4 Nf6 c4 d6 Nf3 Nbd7 Nc3 e5 e4 Be7 Be2 O-O O-O Re8 Re1 Bf8', oldIndian)).toBeUndefined();
  });

  it('with the main line deepest, playing a tab\'s identifying moves in order still files it there', () => {
    // QGD: 3.Nc3 Nf6 is the Exchange tab's order; 4.Nf3 transposes onto the
    // main line for a ply, then 6.cxd5 exd5 is the Exchange structure.
    const qgd = analyzeOpening({
      id: 'qgd',
      pgn: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O',
      variations: [
        { name: 'Classical 5.Bf4', pgn: 'd4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bf4 O-O' },
        { name: 'Exchange', pgn: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7' },
      ],
    });
    expect(classifyGame('d4 d5 c4 e6 Nc3 Nf6 Nf3 a6 Bg5 Nbd7 cxd5 exd5', qgd))
      .toEqual({ name: 'Exchange', tier: 'under-main' });
  });

  it('a tab that is the start of the main line is filed the same by either move order', () => {
    // The e5 Break tab is the main line's first 13 plies. A game that plays on
    // down the main line past two longer tabs keeps that tab whether it came by
    // the main line's own order or by transposition.
    const dutch = analyzeOpening({
      id: 'dutch',
      pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4 c6',
      variations: [
        { name: 'g6 Main Line', pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Nc5 b3' },
        { name: 'Rb1 c5', pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 c5' },
        { name: 'e5 Break', pgn: 'd4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3' },
      ],
    });
    expect(classifyGame('d4 f5 g3 Nf6 Bg2 g6 Nf3 Bg7 O-O O-O c4 d6 Nc3 Qe8 d5 Na6 Rb1 Bd7 b4', dutch))
      .toEqual({ name: 'e5 Break', tier: 'under-main' });
    expect(classifyGame('d4 d6 Nf3 g6 c4 f5 Nc3 Nf6 g3 Bg7 Bg2 O-O O-O Qe8 d5 Na6 Rb1 Bd7 b4', dutch))
      .toEqual({ name: 'e5 Break', tier: 'under-main' });
  });

  it('two tabs that reach the same position: the one the game follows by move order wins', () => {
    // KIA: the Fischer Attack (1.e4 e6 order) and the QGD-style tab (1.Nf3 d5
    // order) meet after 8.Re1; the game came by the Nf3 order.
    const kia = analyzeOpening({
      id: 'kia',
      pgn: 'Nf3 d5 g3 Nf6 Bg2 c6 O-O Bg4',
      variations: [
        { name: 'Fischer Attack', pgn: 'e4 e6 d3 d5 Nd2 Nf6 Ngf3 c5 g3 Nc6 Bg2 Be7 O-O O-O Re1 b5 e5 Nd7' },
        { name: 'QGD-Style', pgn: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O Nf6 d3 e6 Nbd2 Be7 e4 O-O Re1 b6 e5 Nd7' },
      ],
    });
    expect(fileIn('Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1 Qc7', kia)).toBe('QGD-Style');
  });

  it('createVariationClassifier reads each opening once and leaves unknown openings on the main line', () => {
    const classify = createVariationClassifier([VIENNA]);
    expect(classify({ openingId: 'vienna', pgn: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 Na4' })?.name)
      .toBe('Quiet (Bc4 + d3)');
    expect(classify({ openingId: 'no-such-opening', pgn: 'e4 e5' })).toBeNull();
  });
});
