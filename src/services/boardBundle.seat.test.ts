// THE SEAT SWEEP (WO-PICTURE-01 bundle reach, 2026-11-19): the bundle hands a
// computer the move that reached the board, played by EITHER side. A computer
// whose words assume the student made the move ("their knight", "Your pawn got
// there first", "Look what you get for it") said them about the opponent's
// move. Each case here is a real board where the OPPONENT made the move; each
// failed on the old code (the wrong-seat sentence) and has a positive control
// on the student's own move.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { readBoard, readBoardAll } from './boardComputers';
import { BUNDLE_ADAPTERS, readEveryComputer, type BoardBundle } from './boardBundle';
import { theirMoveStructure } from './structureReads';

const fenOf = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('a student-seat computer never reads the opponent\'s move as the student\'s', () => {
  it('captureChoice: Black\'s …dxe5 is not "no pawn of yours" to a White student', () => {
    const fen = 'rnbqkb1r/pp3ppp/3pp3/3PP3/8/2P2N2/PP3PPP/RNBQKB1R b KQkq - 0 1';
    expect(readBoard('captureChoice', { fenBefore: fen, san: 'dxe5', bestSan: 'dxe5', cpLoss: 0, student: 'b' })?.text).toMatch(/pawn of yours/);
    expect(readBoard('captureChoice', { fenBefore: fen, san: 'dxe5', bestSan: 'dxe5', cpLoss: 0, student: 'w' })).toBeNull();
  });

  it('heldResource: Black\'s …Nf6 is not "once their knight comes to c3" to a White student', () => {
    const fen = fenOf('c4 e6 Nf3 d5 d4');
    expect(readBoard('heldResource', { fenBefore: fen, san: 'Nf6', bestSan: 'Nf6', cpLoss: 0, student: 'b' })?.text).toMatch(/their knight/);
    expect(readBoard('heldResource', { fenBefore: fen, san: 'Nf6', bestSan: 'Nf6', cpLoss: 0, student: 'w' })).toBeNull();
  });

  it('kickAfterRecapture: White\'s dxe5 is not "Their knight took back" to a Black student', () => {
    const fen = fenOf('e4 Nc6 d4 e5');
    const ctx = { fenBefore: fen, san: 'dxe5', reply: 'Nxe5', bestUci: ['d4e5', 'c6e5', 'f2f4'] };
    expect(readBoard('kickAfterRecapture', { ...ctx, student: 'w' })?.text).toMatch(/knight/);
    expect(readBoard('kickAfterRecapture', { ...ctx, student: 'b' })).toBeNull();
  });

  it('pawnSquareTaken: White\'s e5 is not "Your pawn got there first" to a Black student', () => {
    const fen = fenOf('Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O');
    expect(readBoard('pawnSquareTaken', { fenBefore: fen, san: 'e5', cpLoss: 0, student: 'w' })?.text).toMatch(/Your pawn got there first/);
    expect(readBoard('pawnSquareTaken', { fenBefore: fen, san: 'e5', cpLoss: 0, student: 'b' })).toBeNull();
  });

  it('quietMovePoint: Black\'s …Be7 is not "unpins your knight" to a White student', () => {
    const fen = fenOf('d4 d5 c4 e6 Nc3 Nf6 Bg5');
    expect(readBoard('quietMovePoint', { fenBefore: fen, san: 'Be7', prevCapture: null, student: 'b' })?.text).toMatch(/[Uu]npins your knight/);
    expect(readBoard('quietMovePoint', { fenBefore: fen, san: 'Be7', prevCapture: null, student: 'w' })).toBeNull();
  });

  it('sacPayoff: White\'s Nxb5 is "what they get" to a Black student, never "what you get"', () => {
    const before = fenOf('e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5');
    const fenAfter = after(before, 'Nxb5');
    const ctx = { fenAfter, mover: 'w' as const, moverPovEvalCp: 60, moverPovBeforeCp: null, kingCentreTaught: false };
    expect(readBoard('sacPayoff', { ...ctx, student: 'w' })?.text).toMatch(/^Look what you get for it/);
    const theirs = readBoard('sacPayoff', { ...ctx, student: 'b' });
    expect(theirs?.text).toMatch(/^Look what they get for it/);
    expect(theirs?.text).not.toMatch(/\byou('re)?\b/i);
    expect(theirs?.seat).toBe('opponent');
  });

  it('kingFromCentre: Black\'s …Kg8 makes the corner hard for YOUR pieces, said to a White student', () => {
    // Black's king walks off the centre with White's queen on: f8 → g8.
    const fen = 'rnbq1k1r/ppp2ppp/5n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQ - 0 6';
    const mine = readBoard('kingFromCentre', { fenBefore: fen, san: 'Kg8', student: 'b' });
    const theirs = readBoard('kingFromCentre', { fenBefore: fen, san: 'Kg8', student: 'w' });
    expect(mine?.text).toMatch(/harder for their pieces to reach/);
    expect(theirs?.text).toMatch(/harder for your pieces to reach/);
  });

  it('kingReadsBestLine: the king read the best line posed is said only on the student\'s move', () => {
    const fen = '6k1/5ppp/8/8/3r4/5N2/5PPP/4R1K1 w - - 0 30';
    expect(readBoardAll('kingReadsBestLine', { fenBefore: fen, student: 'w', bestUci: ['e1e8'] }).length).toBeGreaterThan(0);
    expect(readBoardAll('kingReadsBestLine', { fenBefore: fen, student: 'b', bestUci: ['e1e8'] })).toEqual([]);
    // Off the bundle: the line is the one from BEFORE the move, only on the
    // student's move, and never when the move played was that best line.
    const adapter = BUNDLE_ADAPTERS.kingReadsBestLine;
    if (typeof adapter !== 'function') throw new Error('kingReadsBestLine has an adapter');
    const bundle = (student: 'w' | 'b', san: string): BoardBundle => ({
      fen: after(fen, san), student, lines: [{ moves: ['g8h8'], cp: 0, mate: null }], rating: 1500, history: [],
      priorMove: { fenBefore: fen, san }, priorMoveSeat: 'w', priorLines: [{ moves: ['e1e8'], cp: null, mate: 1 }],
    });
    expect(adapter(bundle('w', 'h3'))?.bestUci).toEqual(['e1e8']);
    expect(adapter(bundle('b', 'h3'))).toBeNull();
    expect(adapter(bundle('w', 'Re8#'))).toBeNull();
  });

  it('theirMoveStructure: the student\'s own move is never read as "their move"', () => {
    // Black has castled; White's king is in the centre. White (the student) plays a3:
    // the old read said "Their king went kingside …" as if their move had just done it.
    const fen = fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5 Ke2 Nf6 Ke1 O-O');
    expect(theirMoveStructure(fen, 'a3', 'w')).toEqual([]);
  });
});

describe('the bundle hands each computer the right move and the right line', () => {
  const bundleAfter = (fenBefore: string, san: string, student: 'w' | 'b', lines: BoardBundle['lines'], priorLines: BoardBundle['priorLines']): BoardBundle => ({
    fen: after(fenBefore, san), student, lines, rating: 1500, history: [], priorMove: { fenBefore, san }, priorMoveSeat: new Chess(fenBefore).turn(), priorLines,
  });

  it('kickAfterRecapture reads the line from BEFORE the capture (it starts with the capture)', () => {
    const fen = fenOf('e4 Nc6 d4 e5');
    const b = bundleAfter(fen, 'dxe5', 'w', [{ moves: ['c6e5', 'f2f4'], cp: 30, mate: null }], [{ moves: ['d4e5', 'c6e5', 'f2f4'], cp: 30, mate: null }]);
    const adapter = BUNDLE_ADAPTERS.kickAfterRecapture;
    if (typeof adapter !== 'function') throw new Error('kickAfterRecapture has an adapter');
    const ctx = adapter(b);
    expect(ctx?.bestUci).toEqual(['d4e5', 'c6e5', 'f2f4']);
    expect(readBoard('kickAfterRecapture', ctx!)?.text).toMatch(/knight/);
    // Their capture: no kick said as the student's.
    const theirs = bundleAfter(fen, 'dxe5', 'b', b.lines, b.priorLines);
    expect(adapter(theirs)).toBeNull();
  });

  it('no student-seat sentence comes off the bundle for the opponent\'s capture choice', () => {
    const fen = 'rnbqkb1r/pp3ppp/3pp3/3PP3/8/2P2N2/PP3PPP/RNBQKB1R b KQkq - 0 1';
    const b = bundleAfter(fen, 'dxe5', 'w', [{ moves: ['d1d8', 'e8d8'], cp: 0, mate: null }], [{ moves: ['d6e5'], cp: 0, mate: null }]);
    const said = readEveryComputer(b).filter((f) => f.computer === 'captureChoice' || f.computer === 'heldResource');
    expect(said).toEqual([]);
  });
});
