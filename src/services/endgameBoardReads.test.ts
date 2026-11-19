// The three endgame board reads (key squares, the shoulder and the rook's
// wall, connected passers a lone piece cannot stop), on the boards Danya's
// tries reach (noreason rows: the try played, then his line) and on the app's
// own lesson boards, each with a negative control.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { keySquaresOn, keySquareLine, pawnKeySquares } from './keySquareRead';
import { shoulderOn, shoulderLine } from './shoulderRead';
import { connectedPassersOn, connectedPassersLine } from './connectedPassers';
import { readBoardAll } from './boardComputers';
import { BUNDLE_ADAPTERS } from './boardBundle';
import { registryPosedFacts } from './moveInsight';

function after(fen: string, sans: readonly string[]): string {
  const c = new Chess(fen);
  for (const s of sans) c.move(s);
  return c.fen();
}

describe('keySquareRead', () => {
  it('the geometry: three squares two ahead, six from the 5th, a rook pawn its two by the corner', () => {
    expect(pawnKeySquares('e4', 'w')).toEqual(['d6', 'e6', 'f6']);
    expect(pawnKeySquares('d5', 'w')).toEqual(['c6', 'd6', 'e6', 'c7', 'd7', 'e7']);
    expect(pawnKeySquares('c7', 'b')).toEqual(['b5', 'c5', 'd5']);
    expect(pawnKeySquares('a5', 'w')).toEqual(['b7', 'b8']);
    expect(pawnKeySquares('e7', 'w')).toEqual([]);
  });

  it('never-resign-prematurely#0 (gxf5, then his h5 Kd5): their king stands on a key square of the c-pawn', () => {
    const fen = after('8/2p4p/2k3p1/5PP1/7P/8/6K1/8 b - - 0 51', ['gxf5', 'h5', 'Kd5']);
    const r = keySquaresOn(fen, 'w');
    expect(r).toMatchObject({ kind: 'holds', side: 'b', king: 'd5', pawn: 'c7', keys: ['b5', 'c5', 'd5'], queens: false });
    const text = keySquareLine(r!, 'w');
    expect(text).toMatch(/^Their king (on d5 stands on|has reached d5,) a key square of the c-pawn\./);
    expect(text).toContain('key squares are b5, c5 and d5');
    expect(keySquareLine(r!, 'b')).toMatch(/^Your king/);
  });

  it('a lesson board: the opposition hands the king a key square, and the lone pawn queens', () => {
    const r = keySquaresOn('8/3k4/8/3K4/3P4/8/8/8 b - - 0 1', 'w');
    expect(r).toMatchObject({ kind: 'opposition', side: 'w', to: ['c6', 'd6', 'e6'], queens: true });
    const text = keySquareLine(r!, 'w');
    expect(text).toContain('You hold the opposition.');
    expect(text).toContain('Whichever way their king steps, yours goes to c6, d6 or e6, each a key square of the d-pawn.');
    expect(text).not.toContain('spare');
  });

  it('the step onto a key square names the student\'s move and poses the king skill to the record', () => {
    const fen = '8/3k4/8/4K3/4P3/8/8/8 w - - 0 1';
    expect(keySquaresOn(fen, 'w')).toMatchObject({ kind: 'steps', to: ['f6'], queens: true });
    const [f] = readBoardAll('keySquareRead', { fen, student: 'w' });
    expect(f).toMatchObject({ seat: 'student', namesStudentMove: true, skill: 'passive-king-endgame' });
    expect(registryPosedFacts(fen, 'w', []).some((x) => x.computer === 'keySquaresOn' && x.skill === 'passive-king-endgame')).toBe(true);
  });

  it('negative: in-pursuit-of-zugzwang#0 (Kc7, then his Kc5) — the opposition, but no key square in reach', () => {
    const fen = after('2k5/8/p1P5/P7/3K4/8/8/8 b - - 1 1', ['Kc7', 'Kc5']);
    expect(keySquaresOn(fen, 'w')).toBeNull();
    // A piece on the board: not a king-and-pawn read.
    expect(keySquaresOn('8/3k4/8/3K4/3P4/8/8/6N1 b - - 0 1', 'w')).toBeNull();
  });
});

describe('shoulderRead', () => {
  it('pawn-endgames-a-practical-guide#1 (e4, then his Kc5 Ke3): the king on e3 keeps theirs from the f-pawn', () => {
    const fen = after('8/8/8/1k4p1/6P1/4Pp2/3K4/8 w - - 0 63', ['e4', 'Kc5', 'Ke3']);
    const r = shoulderOn(fen, 'w');
    expect(r).toMatchObject({ mode: 'guard', side: 'w', by: 'k', bySquare: 'e3', king: 'c5', pawn: 'f3', steps: 7, free: 2 });
    const text = shoulderLine(r!, 'w');
    expect(text).toMatch(/^Your king on e3 /);
    expect(text).toContain('their f-pawn');
    expect(text).toContain('From c5 it needs seven moves to get beside the pawn. Without your king there, it would take two moves.');
  });

  it('in-pursuit-of-zugzwang#1 (Rxd5, then his Rc8 Rd3 Rf8): the rook walls the f-file between their king and their d-pawn', () => {
    const fen = after('8/2R3p1/3p2k1/3P1p1p/3r1P1K/6PP/8/8 b - - 0 46', ['Rxd5', 'Rc8', 'Rd3', 'Rf8']);
    const r = shoulderOn(fen, 'w');
    expect(r).toMatchObject({ side: 'w', by: 'r', bySquare: 'f8', king: 'g6', pawn: 'd6', steps: null, free: 2 });
    expect(shoulderLine(r!, 'w')).toMatch(/f-file/);
    expect(shoulderLine(r!, 'b')).toMatch(/^Their rook/);
  });

  it('a lesson board: the rook cuts the king off along the third rank', () => {
    const r = shoulderOn('8/R7/8/pP4p1/7k/7r/5K2/8 w - - 0 53', 'w');
    expect(r).toMatchObject({ side: 'b', by: 'r', bySquare: 'h3', king: 'f2', pawn: 'b5', steps: null });
    expect(shoulderLine(r!, 'w')).toContain('the third rank');
  });

  it('negative: the defending king already in front of the pawn, and a rook standing in front of its own pawn', () => {
    expect(shoulderOn('8/3k4/8/3K4/3P4/8/8/8 b - - 0 1', 'w')).toBeNull();
    expect(shoulderOn('8/3R4/8/3P4/8/8/6k1/K7 w - - 0 1', 'w')).toBeNull();
  });
});

describe('connectedPassers', () => {
  it('two connected passers on the sixth that a bishop or a knight cannot stop, proven by the search', () => {
    const b = connectedPassersOn('8/8/2b2PP1/8/8/8/k6K/8 b - - 0 1');
    expect(b).toMatchObject({ side: 'w', pawns: ['f6', 'g6'], piece: 'b', moves: 3 });
    expect(connectedPassersLine(b!, 'w')).toMatch(/^Your connected pawns on f6 and g6 (can't both be stopped by their bishop|are too much for their bishop)/);
    expect(connectedPassersLine(b!, 'b')).toMatch(/^Their connected pawns on f6 and g6/);
    expect(connectedPassersOn('8/8/5PP1/8/8/8/k6K/1n6 b - - 0 1')).toMatchObject({ piece: 'n', moves: 3 });
    // A rook with the move gone: the pawn on the seventh queens at once.
    expect(connectedPassersOn('8/5P2/6P1/8/8/8/k6K/1r6 w - - 0 1')).toMatchObject({ piece: 'r', moves: 1 });
  });

  it('negative: the defending king beside the pawns, and the rook with checks to give (no proof within four moves)', () => {
    expect(connectedPassersOn('6k1/8/5PP1/8/8/8/1r5K/8 b - - 0 1')).toBeNull();
    expect(connectedPassersOn('7K/5PP1/8/8/8/8/k7/1r6 b - - 0 1')).toBeNull();
    // Danya's own rows reach no such board: the rook-ending line of
    // in-pursuit-of-zugzwang#1 keeps both rooks on.
    expect(connectedPassersOn(after('8/2R3p1/3p2k1/3P1p1p/3r1P1K/6PP/8/8 b - - 0 46', ['Rxd5', 'Rc8', 'Rd3', 'Rf8', 'd5', 'g4']))).toBeNull();
  });

  it('the registry: the student\'s pawns to push pose the passer skill, the bundle reads it', () => {
    const fen = '8/8/2b2PP1/8/8/8/k6K/8 w - - 0 1';
    const facts = readBoardAll('connectedPassers', { fen, student: 'w' });
    expect(facts[0]).toMatchObject({ seat: 'student', skill: 'passed-pawn-neglected' });
    expect(typeof BUNDLE_ADAPTERS.connectedPassers).toBe('function');
  });
});
