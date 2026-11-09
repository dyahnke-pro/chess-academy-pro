// LEARN NEVER NAMES THE MOVE YOU JUST PLAYED (David 2026-11-09: "We also don't
// need to hear the phrase 'your f pawn takes on e6' — the user knows that, they
// see it play out"). The prod focus audit the same night still heard "Your f7
// stops king to e8: your pawn on f7 covers e8": the reason a move was good is
// worded by `moveIntent` and `decisiveReason`, and last night's fix covered the
// verdict lines one by one but not these two computers. Now one required flag,
// `namesStudentMoves`, decides it at both; Learn passes false for its own seat.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decisiveReason } from './decisiveReason';
import { moveIntent, type IntentReads } from './moveIntent';
import { intentWithFallback } from './movePurpose';
import type { AnalysisLine } from '../types';

const R = JSON.parse(readFileSync('src/services/__fixtures__/decisiveReason.walk.reads.json', 'utf8')) as Record<string, IntentReads>;
const L = (cp: number, pv: string[], rank = 1): AnalysisLine => ({ rank, evaluation: cp, moves: pv, mate: null });

describe('Learn says "your move", never the move you just played', () => {
  it('a move that stops a mate: "Your move stops Re8, which was mate" (twin: Review names …h6)', () => {
    const args = { fenBefore: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1', san: 'h6', seat: 'student' as const, prevCapture: null, reads: R.backRankH6 };
    expect(decisiveReason({ ...args, namesStudentMoves: false })?.text).toBe('Your move stops Re8, which was mate. …h5 is about as good.');
    expect(decisiveReason({ ...args, namesStudentMoves: true })?.text).toBe('Your …h6 stops Re8, which was mate. …h5 is about as good.');
  });
  it('a move that stops their idea says what it stopped, with no name for your own move', () => {
    const r = decisiveReason({ namesStudentMoves: false, fenBefore: 'rn1qkb1r/1p1b1ppp/p2p1n2/1Bp2N2/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 8', san: 'Bxd7+', seat: 'student', prevCapture: null, reads: R.q4Bxd7 });
    expect(r?.text).toMatch(/^Your move stops …g6, which would hit your knight on f5\./);
    expect(r?.text).not.toMatch(/Bxd7/);
  });
  it('a move that wins material: "You win a rook", never "You play Qxf5 — you win a rook"', () => {
    const fen = '2Q5/p4kp1/1p3n2/5r1p/4p3/NP5P/P1P2PP1/R2R2K1 w - - 1 28';
    const reads: IntentReads = {
      before: [{ rank: 1, evaluation: 0, mate: 14, moves: 'c8f5 f7e7 a3c4 g7g6 f5g6 f6e8 g6e4 e7f6 e4e8 a7a6'.split(' ') }, { rank: 2, evaluation: 1194, mate: null, moves: 'b3b4 f7g6 c8e6 a7a5 a3c4 f5g5 d1d8 b6b5'.split(' ') }],
      after: [], passBefore: [], passAfter: [],
    };
    const r = decisiveReason({ namesStudentMoves: false, fenBefore: fen, san: 'Qxf5', seat: 'student', prevCapture: null, reads });
    expect(r?.text).toMatch(/^You win a rook\./);
    expect(r?.text).not.toMatch(/Qxf5/);
  });
  it('the intent computer, through the Learn door: "Your move stops …Re8" (twin: Review says "Your Re1")', () => {
    const fen = 'r6k/pb1p3p/1p1p2p1/8/5P2/2NB1N1P/PPPK2P1/7R w - - 2 20';
    const reads: IntentReads = {
      before: [L(200, ['h1e1', 'h7h5'])],
      passBefore: [L(50, ['a8e8', 'h1e1'])],
      after: [L(200, ['h7h5', 'f3g5'])],
      passAfter: [L(260, ['f3g5', 'h7h6'])],
    };
    expect(intentWithFallback(fen, 'Re1', reads, 'student', false, false)?.text).toBe('Your move stops …Re8: the rook would just be taken on e8.');
    expect(intentWithFallback(fen, 'Re1', reads, 'student', false, true)?.text).toBe('Your Re1 stops …Re8: the rook would just be taken on e8.');
    expect(moveIntent(fen, 'Re1', reads, 'student')?.text, 'the default names it (Review, lessons)').toBe('Your Re1 stops …Re8: the rook would just be taken on e8.');
  });
  it('their moves are always named: the flag is about your moves', () => {
    const fen = 'rn1qkb1r/1p1b1ppp/p2p1n2/1Bp2N2/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 8';
    const theirs = decisiveReason({ namesStudentMoves: false, fenBefore: fen, san: 'Bxd7+', seat: 'opponent', prevCapture: null, reads: R.q4Bxd7 });
    const named = decisiveReason({ namesStudentMoves: true, fenBefore: fen, san: 'Bxd7+', seat: 'opponent', prevCapture: null, reads: R.q4Bxd7 });
    expect(theirs?.text).toBe(named?.text);
  });
});
