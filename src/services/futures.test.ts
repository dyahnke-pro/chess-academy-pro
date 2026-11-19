import { describe, it, expect } from 'vitest';
import { lineStory, futureBoards, whatChanged, changeReason, comesAlive, comesAliveText, bundleAt, fortressGained } from './futures';

describe('what the try line does (fixes 2–3)', () => {
  it('reads a perpetual check his way: the checks never stop', () => {
    // Rb1 lets the queen check from f3 and g4 forever.
    const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
    const s = lineStory(fen, ['a1b1', 'f4f3', 'h1g1', 'f3g4', 'g1h1', 'g4f3'], 'their');
    expect(s?.kind).toBe('perpetual');
    expect(s?.text).toMatch(/^…Qf3\+ starts a perpetual check/);
  });

  it('three checks the king walks out of are no perpetual', () => {
    // Same checks, but the line goes on unrepeated and ends with them winning.
    const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
    expect(lineStory(fen, ['a1b1', 'f4f3', 'h1g1', 'f3g4', 'g1f2', 'g4f4', 'f2e2'], 'their', -900)).toBeNull();
  });

  it('reads a pawn that runs through and queens', () => {
    const s = lineStory('7k/8/8/8/8/8/p7/6K1 w - - 0 1', ['g1f2', 'a2a1q'], 'their');
    expect(s?.kind).toBe('promotes');
    expect(s?.text).toBe('Their a-pawn runs through and queens on a1.');
  });

  it('says nothing when the line is quiet', () => {
    expect(lineStory('7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1', ['a1a2', 'h7h6'], 'their')).toBeNull();
  });

  it('finds the reply board and the quiet end', () => {
    const f = futureBoards('7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1', ['a1b1', 'f4f3', 'h1g1', 'f3g4']);
    expect(f.reply?.ply).toBe(2);
    expect(f.quiet?.ply).toBe(3);
  });

  it('the same line on both sides changes nothing', () => {
    const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
    const line = { moves: ['a1a2', 'h7h6', 'a2a3'], cp: -900, mate: null };
    const wc = whatChanged({ fen, student: 'w', rating: 1500, tryLine: line, bestLine: line });
    expect(wc.appeared).toEqual([]);
    expect(wc.lost).toEqual([]);
  });
});

// His refuted tries, with the engine's lines on them (depth 18, White's view).
describe('the drawing resource, the race and the defender alive (WO-PICTURE-01)', () => {
  // magnus-carlsens-best-endgame-wins#1: "Kb4 loses by a single tempo".
  it('a race lost by one move says so', () => {
    const fen = '8/8/6pp/1K1k1p2/2p5/2P4P/1P4P1/8 w - - 1 49';
    const line = ['b5b4', 'g6g5', 'b4a4', 'g5g4', 'h3g4', 'f5g4', 'b2b4', 'c4b3', 'a4b3', 'h6h5', 'c3c4', 'd5e6', 'b3c3', 'h5h4', 'c3d2', 'h4h3', 'd2e1', 'h3h2', 'e1f2', 'h2h1r', 'f2g3', 'h1c1', 'g3g4'];
    const s = lineStory(fen, line, 'their', -541);
    expect(s?.kind).toBe('promotes');
    expect(s?.text).toBe('Their h-pawn runs through and promotes on h1: your king is one move too late to catch it.');
  });

  // modern-chess-technique#2: "Ng7 is a draw!" — the knight and the f-pawn go.
  it('a line that leaves nothing to mate with is a draw', () => {
    const fen = '8/8/4N3/4kP2/p7/8/2K5/8 w - - 1 76';
    const line = ['e6g7', 'e5f6', 'c2b2', 'f6g7', 'b2a3', 'g7f6', 'a3a4', 'f6f5', 'a4b5', 'f5g4'];
    const s = lineStory(fen, line, 'their', 0);
    expect(s?.kind).toBe('bareDraw');
    expect(s?.text).toBe('After …Kxf5 only the kings are left: a draw.');
  });

  it('a stalemate in the line is a draw', () => {
    const s = lineStory('k7/P7/2K5/8/8/8/8/8 w - - 0 1', ['c6b6'], 'their');
    expect(s?.kind).toBe('stalemate');
    expect(s?.text).toBe('Kb6 leaves them no legal move: it is stalemate, a draw.');
  });

  // the-importance-of-solving-studies#0: "Kf1 is obviously a draw" — the line
  // reaches opposite-coloured bishops two pawns up.
  it('the reason is the drawn ending the try lets them reach', () => {
    const fen = 'k7/Pn6/8/2B5/3b4/6pP/6BP/6K1 w - - 1 6';
    const tryLine = { moves: ['g1f1', 'd4c5', 'g2b7', 'a8a7', 'h2g3', 'a7b6', 'f1g2', 'b6c7', 'g2f3', 'c7d7'], cp: 6, mate: null };
    const bestLine = { moves: ['c5d4', 'g3h2', 'g1f1', 'h2h1q', 'd4g1', 'h1h3', 'g2h3', 'b7a5', 'f1e2', 'a5b7'], cp: 413, mate: null };
    const why = changeReason({ fen, student: 'w', rating: 1800, other: 'their', tryLine, bestLine });
    expect(why).toBe('The bishops are of opposite colours, so your two extra pawns are not enough: their bishop and king hold the dark squares in front of them, and your bishop can never touch those.');
  });

  // modern-chess-technique#3: "b4, and suddenly Black's position is beginning
  // to show signs of life" — the king shut in on c8 walks out to b7.
  it('the defender comes alive', () => {
    const fen = '2kb4/p4p2/2b3r1/2p1PN1p/5P2/1PB4P/P2R3K/8 w - - 0 37';
    const tryLine = { moves: ['b3b4', 'c5b4', 'c3b4', 'c8b7', 'b4e7', 'd8a5', 'd2b2', 'b7a8'], cp: 102, mate: null };
    const bestLine = { moves: ['f5d6', 'c8b8', 'f4f5', 'g6g8', 'f5f6', 'd8b6', 'd6f7', 'c5c4'], cp: 322, mate: null };
    const a = comesAlive({ fen, tryLine, bestLine });
    expect(a).toMatchObject({ side: 'b', piece: 'k', square: 'b7', moves: 6, movesOnBest: 2 });
    expect(comesAliveText(a!, 'their')).toBe('Their king comes alive on b7: it has 6 squares to work with there, where the better line keeps it to 2.');
    // The same line on both sides: nothing comes alive.
    expect(comesAlive({ fen, tryLine, bestLine: tryLine })).toBeNull();
  });
});

describe('a future board carries the move that reached it (WO-PICTURE-01 gap 1)', () => {
  const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
  const line = { moves: ['a1b1', 'f4f3', 'h1g1', 'f3g4'], cp: -900, mate: null };
  it('the reply board is reached by the reply, its line the engine\'s from before it', () => {
    const f = futureBoards(fen, line.moves).reply!;
    const b = bundleAt(f, line, 'w', 1800);
    expect(b.priorMove).toEqual({ fenBefore: '7k/6pp/8/8/5q2/8/7P/1R5K b - - 1 1', san: 'Qf3+' });
    expect(b.priorMoveSeat).toBe('b');
    expect(b.priorLines?.[0].moves).toEqual(['f4f3', 'h1g1', 'f3g4']);
    expect(b.lines[0].moves).toEqual(['h1g1', 'f3g4']);
  });
  it('the try is never given a made-up line: a board the try reached has none', () => {
    const g = { fen: '7k/6pp/8/8/5q2/8/7P/1R5K b - - 1 1', ply: 1, rest: ['f4f3'], reached: { fenBefore: fen, san: 'Rb1', seat: 'w' as const, line: ['a1b1', 'f4f3'] } };
    const b = bundleAt(g, line, 'w', 1800);
    expect(b.priorMove?.san).toBe('Rb1');
    expect(b.priorLines).toBeNull();
  });
});

describe('the fortress the try lets them build (WO-PICTURE-01 gap 2)', () => {
  // Puzzle 05jP1: Bxg6 (the try) leaves the light bishop against a pawn on h6,
  // a draw; hxg6 (the best) wins. Engine lines Stockfish 16 depth 20.
  const fen = '7k/8/3K2pp/7P/4B3/8/8/8 w - - 0 71';
  const tryLine = { moves: ['e4g6', 'h8g8', 'd6e6', 'g8g7', 'g6b1', 'g7g8', 'e6f6'], cp: 6, mate: null };
  const bestLine = { moves: ['h5g6', 'h6h5', 'd6e6', 'h8g7', 'e6f5', 'g7f8', 'f5f6'], cp: 3507, mate: null };
  it('reads the fortress on the try\'s board, absent on the best\'s', () => {
    const g = fortressGained({ fen, tryLine, bestLine });
    expect(g?.at).toBe('reply');
    expect(g?.fortress).toMatchObject({ defender: 'b', reason: { kind: 'bishop-colour', pawns: ['h6'] } });
  });
  it('says it as the reason the try falls short', () => {
    const why = changeReason({ fen, student: 'w', rating: 1800, other: 'their', tryLine, bestLine });
    expect(why).toMatch(/their pawn on h6 stands on a dark square, where your light-squared bishop can never attack it\.$/);
  });
  it('the same line both ways: no fortress gained', () => {
    expect(fortressGained({ fen, tryLine, bestLine: tryLine })).toBeNull();
  });
});
