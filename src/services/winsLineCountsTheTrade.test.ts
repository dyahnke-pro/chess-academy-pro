import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { winningLine, priorFromHistory } from './learnBoardTeaching';

// Clean-pass walk 2026-10-04, G2 (lichess VRUh4Qgh) 31.Nxh4 Qxh4+: Learn said
// "That wins two knights: …Qxh4+ Kg1 …Qxh5." Qxh4+ only takes back the knight
// that had just taken the bishop on h4 — two knights FOR A BISHOP.
const PGN = readFileSync('src/services/__fixtures__/VRUh4Qgh.pgn', 'utf8');
const g = new Chess(); g.loadPgn(PGN);
const history = g.history().slice(0, 62); // …through 31…Qxh4+
const FEN = '2r1r1k1/pp4pp/2b1P3/4Pp1N/6qN/1B1Q4/PP4P1/R6K b - - 0 31';
const LINE = ['g4h4', 'h1g1', 'h4h5'];

describe('a winning line that opens by taking back counts the trade it completes', () => {
  it('the opponent move is read off the history', () => {
    expect(priorFromHistory(history, FEN)?.san).toBe('Nxh4');
  });
  it('the defect is real without it: "two knights"', () => {
    expect(winningLine(FEN, 'Qxh4+', LINE, 'b', null)?.what).toBe('two knights');
  });
  it('with it: the bishop given on h4 is in the count', () => {
    const w = winningLine(FEN, 'Qxh4+', LINE, 'b', priorFromHistory(history, FEN));
    expect(w?.what).toBe('two knights for a bishop');
  });
});
