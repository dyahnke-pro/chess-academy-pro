import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bothSaved, bothSavedLine } from './bothSaved';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import { writerFor } from './writerRegister';

// Danya speedrun FozbGMUOOjs, 27.Ne7 (his White): "Rook and knight both hang:
// find a knight move that also defends the rook — Ne7." The engine's lines
// after Ne7 (depth 14, White-POV): …h5 518, …Bxe7 559 (Rxh8), …fxg4 567.
const FEN = '2R2b1r/r2k1p1p/1p1qpP2/3N1p2/p2P2P1/4BQ1P/P4R2/6K1 w - - 1 27';
const REPLIES = [
  { cp: 518, mate: null, moves: ['h7h5', 'c8c6', 'd6b4', 'c6c1'] },
  { cp: 559, mate: null, moves: ['f8e7', 'c8h8', 'e7f6', 'h8h7'] },
  { cp: 567, mate: null, moves: ['f5g4', 'h3g4', 'b6b5', 'e7c6'] },
];
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

describe('bothSaved: two hanging, one move saves both', () => {
  it('Ne7 steps the knight out and guards the rook on c8', () => {
    const b = bothSaved(FEN, 'Ne7', REPLIES);
    expect(b).toMatchObject({ moved: { piece: 'n', from: 'd5', to: 'e7' }, other: { piece: 'r', square: 'c8' } });
    expect(bothSavedLine(b!, 'your', after(FEN, 'Ne7'))).toMatch(/the knight on d5 and the rook on c8/);
  });
  it('his two refuted tries say nothing: Rc2 saves the rook but drops d5, Nb6+ is a check', () => {
    expect(bothSaved(FEN, 'Rc2', REPLIES)).toBeNull();
    expect(bothSaved(FEN, 'Nxb6+', REPLIES)).toBeNull();
  });
  it('the knight still loses a pawn by the count, so without the engine to vouch it stays quiet', () => {
    expect(bothSaved(FEN, 'Ne7', [])).toBeNull();
    // The engine read no capture of the knight: nothing to vouch with.
    expect(bothSaved(FEN, 'Ne7', [REPLIES[0], REPLIES[2]])).toBeNull();
  });
  it('comes out of the one registry', () => {
    const f = readBoard('bothSaved', { fenBefore: FEN, san: 'Ne7', student: 'w', replies: REPLIES });
    expect(f?.computer).toBe('bothSaved');
    expect(f?.seat).toBe('student');
  });
});

describe('the one composer says them', () => {
  it('a lesson or Review move from the hanging board carries the save', () => {
    const facts = moveThoughtFacts({ register: 'review', soundPlies: null, unpricedCredit: 'refused', moveReads: writerFor('review').moveReads, namesPlayedMove: true,
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: FEN, san: 'Ne7', moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0,
      reads: { before: [{ rank: 1, evaluation: 541, moves: ['d5e7'], mate: null }], after: REPLIES.map((l, k) => ({ rank: k + 1, evaluation: l.cp, moves: [...l.moves], mate: null })), passBefore: [], passAfter: [] } as never,
    });
    expect(facts.some((f) => f.computer === 'bothSaved' && /the rook on c8/.test(f.text))).toBe(true);
  });
});
