import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import {
  givePawnBack, defendsBoth, missedDefendsBoth, knightJumpApart, mateThreatWinsMore, mateThreatCostsYou, queenTradeRead,
} from './practicalReads';
import { studentMoveStructure } from './structureReads';

// Naroditsky's Scotch Gambit speedrun (video Y-a6cV08zDM), Black's game.
const SCOTCH = ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Bc4', 'Be7', 'c3', 'd3', 'Qb3', 'Na5', 'Bxf7+', 'Kf8', 'Qd5', 'c6', 'Qf5', 'Nf6', 'Ng5', 'h6', 'e5', 'hxg5', 'exf6', 'Bxf6', 'Bg6', 'Qe7+', 'Be3', 'Nc4', 'O-O', 'd5', 'Qf3', 'Ne5', 'Qd1', 'Nxg6', 'Qxd3', 'Qe5', 'f4', 'Nxf4', 'Bxf4', 'gxf4', 'Nd2', 'Qe3+'];
const before = (ply: number): string => { const c = new Chess(); SCOTCH.slice(0, ply).forEach((m) => c.move(m)); return c.fen(); };

describe('the practical ideas he names out loud (Scotch speedrun)', () => {
  it('…d3: the gambit pawn given back on his terms', () => {
    const r = givePawnBack(before(9), 'd3', 'b', 0);
    expect(r?.text).toContain('extra pawn back on your own terms: on d3');
    expect(givePawnBack(before(9), 'd3', 'b', 120)).toBeNull();
    expect(givePawnBack(before(9), 'Nf6', 'b', 0)).toBeNull();
  });

  it('NEGATIVE: a pawn push that drops a pawn late in the game is not a gambit given back', () => {
    expect(givePawnBack('8/8/1Pk5/6pp/2P2p2/2K4P/2B2PP1/8 w - - 1 43', 'c5', 'w', 0)).toBeNull();
  });

  it('Qf3?? puts queen and bishop a knight\'s jump apart — the pattern, never the square', () => {
    const r = knightJumpApart(before(30), 'Qf3', 'b');
    expect(r?.text).toContain('queen on f3 and bishop on g6');
    expect(r?.text).not.toContain('e5');
    expect(r?.squares).not.toContain('e5');
  });

  it('NEGATIVE: a queen move that sets up no fork says nothing', () => {
    expect(knightJumpApart(before(30), 'Qe2', 'b')).toBeNull();
  });

  it('…Qe3+ a piece up: the queen trade is the safe road', () => {
    const r = queenTradeRead(before(41), 'Qe3+', 'b', 0);
    expect(r?.act).toBe('queen-trade-ahead');
  });

  it('a pawn up, a queen trade the engine dislikes gets his warning; a pawn ending does not', () => {
    const PAWN_UP = 'r3k3/pp1q1ppp/8/8/8/8/PPPQ1PPP/R3K3 w - - 0 1';
    expect(queenTradeRead(PAWN_UP, 'Qxd7+', 'w', 150)?.act).toBe('queen-trade-early');
    expect(queenTradeRead(PAWN_UP, 'Qxd7+', 'w', 0)).toBeNull();
    expect(queenTradeRead('4k3/pp1q1ppp/8/8/8/8/PPPQ1PPP/4K3 w - - 0 1', 'Qxd7+', 'w', 150)).toBeNull();
  });
});

describe('one threat, two jobs (a pro game, move 36)', () => {
  const FEN = '6k1/4pp1p/p2b2p1/3P4/4q3/1PN4P/P5P1/3Q3K b - - 3 36';
  it('Qe5 threatens mate on h2 and every defence drops the knight', () => {
    expect(mateThreatWinsMore(FEN, 'Qe5', 'b', 0)?.text).toContain('threatens mate on h2');
    expect(mateThreatWinsMore(FEN, 'Qe5', 'b', 120)).toBeNull();
    expect(mateThreatWinsMore(FEN, 'Qe7', 'b', 0)).toBeNull();
  });
  it('the same move warns the defender', () => {
    expect(mateThreatCostsYou(FEN, 'Qe5', 'w')?.text).toContain('stop the mate first');
  });
});

describe('one move guards both', () => {
  const D = '3q3k/8/8/4n3/1b6/8/8/4Q1K1 b - - 0 1';
  it('…Qd6 covers the knight on e5 and the bishop on b4 together', () => {
    const r = defendsBoth(D, 'Qd6', 'b', 0);
    expect(r?.text).toContain('your queen on d6 now guards them together');
  });
  it('a move that leaves one loose is caught, and Learn hears it without the move', () => {
    const r = missedDefendsBoth(D, 'Qd7', 'b', 600);
    expect(r?.text).toContain('covered both');
    expect(r?.heldForm?.text).not.toMatch(/Q[a-h][1-8]/);
    const learn = studentMoveStructure({ fenBefore: D, san: 'Qd7', student: 'b', cpLoss: 600, bestSan: null, bestUci: [], reply: null, namesBetterMove: false });
    const said = learn.find((x) => x.act === 'missed-defends-both');
    expect(said?.text).not.toMatch(/Q[a-h][1-8]/);
  });
  it('NEGATIVE: a check that "covers" both is no guard', () => {
    expect(missedDefendsBoth(D, 'Qd7', 'b', 600)?.text).not.toContain('Qg8+');
  });
});
