// OS-1 root cause 1 (Smith-Morra, after 7…Bg7, White to move): two computers
// said "their wanted …Bg4 pin" — obviousStopFlaw with its own diagonal scan
// and no proof ("The obvious stop is h3 … find another way"), prophylaxis as
// a bare string ("One move stops it"). They contradicted each other on the
// same h3 (−0.31 at depth 20, level with the 2nd–4th best), and the claim
// carried no board, so it was graded where the pin does not exist yet.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { findProphylaxis, prophylaxisIdea } from './prophylaxis';
import { depthClauses } from './thinkAloud';
import { readBoard } from './boardComputers';
import { detectTactics } from './tacticsDetector';

const FEN = 'r1bqk1nr/pp2ppbp/2np2p1/8/2B1P3/2N2N2/PP3PPP/R1BQ1RK1 w kq - 2 8';
// Stockfish depth 20 on this board (White's view): h3 is not among them.
const D20 = [
  { moves: ['e4e5'], evaluation: -17, mate: null },
  { moves: ['c3d5', 'c8g4'], evaluation: -28, mate: null },
  { moves: ['c4d5'], evaluation: -30, mate: null },
  { moves: ['f3g5'], evaluation: -41, mate: null },
];

describe('their wanted …Bg4 pin, owned by one computer (OS-1 root cause 1)', () => {
  it('the threat is a fact on the board it is about: line, squares [g4, f3, d1], exact proof', () => {
    const p = findProphylaxis(FEN)!;
    expect(p.intent.san).toBe('Bg4');
    expect(p.prevention.san).toBe('h3');
    expect(p.threat.squares).toEqual(['g4', 'f3', 'd1']);
    expect(p.threat.motif).toBe('pin');
    const after = new Chess(p.threat.line.fen);
    after.move(p.threat.line.sans[0]);
    expect(detectTactics(after.fen()).tactics.some((t) => t.type === 'pin' && ['g4', 'f3', 'd1'].every((q) => t.involvedSquares.includes(q)))).toBe(true);
  });

  it('the held idea keeps that proof, squares and line — never the stopping square', () => {
    const r = readBoard('prophylaxis', { fen: FEN, engineFirstMoves: ['h2h3', 'e4e5'] })!;
    expect(r.heldForm?.text).toMatch(/^Watch Bg4 — it would pin your knight on f3/);
    expect(r.heldForm?.proof).toMatchObject({ kind: 'line', exact: true });
    expect(r.heldForm?.squares).toEqual(['g4', 'f3', 'd1']);
    expect(r.heldForm?.lines?.[0].sans).toEqual(['Bg4']);
    expect(r.heldForm?.squares).not.toContain('h3');
    expect(prophylaxisIdea(findProphylaxis(FEN)!).text).toBe(r.heldForm?.text);
  });

  it('the engine does not refute h3 here, so "find another way" is never said beside "one move stops it"', () => {
    const clauses = depthClauses({ fen: FEN, history: [], topLines: D20, studentColor: 'w', nameMove: false });
    expect(clauses.find((c) => c.kind === 'stop-flaw')).toBeUndefined();
  });

  it('where the engine does rank h3 a notable step down, the flaw is one clause carrying the threat and its proof', () => {
    const lines = [{ moves: ['e4e5'], evaluation: -17, mate: null }, { moves: ['h2h3'], evaluation: -140, mate: null }];
    const f = depthClauses({ fen: FEN, history: [], topLines: lines, studentColor: 'w', nameMove: false }).find((c) => c.kind === "stop-flaw")!;
    expect(f).toBeDefined();
    expect(f.text).toMatch(/They want the bishop to g4, pinning your knight on f3\. The obvious stop is the pawn to h3/);
    expect(f.proof).toMatchObject({ kind: 'line', exact: true });
    expect(f.squares).toEqual(['g4', 'f3', 'd1']);
    expect(f.lines?.[0].sans).toEqual(['Bg4']);
  });
});
