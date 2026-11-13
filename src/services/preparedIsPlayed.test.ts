// A PREPARED MOVE IS ONE THE MOVE ENABLES AND THE ENGINE THEN PLAYS (task 172,
// 2026-11-11). Writers reading the fact sheets found "prepares X" / "so that X
// can …" said of moves in no line of the engine's, of moves the piece could
// already do, and of take-backs. Each case is a logged fact on its exact
// board; each fails on the code before the fix.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { moveIntent, whatItDoes, type IntentReads } from './moveIntent';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { AnalysisLine } from '../types';

const L = (moves: string[], evaluation = 0): AnalysisLine => ({ rank: 1, evaluation, mate: null, moves });
const uci = (fen: string, sans: readonly string[]): string[] => {
  const c = new Chess(fen);
  return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
};

const BENKO_NFD7 = 'rn1qk2r/4ppbp/3p1np1/2pP4/4P3/2N2PP1/PP5P/R1BQ1KNR b kq - 0 10';
const BENKO_E4 = 'rn1qkb1r/4pppp/b2p1n2/2pP4/8/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 7';
const QID_EXD5 = 'rn1q1rk1/pbp1bppp/1p2pn2/3P4/3P4/2NBPN2/PP3PPP/R1BQ1RK1 b - - 0 8';
const SCHLIEMANN_AFTER_DXC6 = 'r1b1kbnr/ppp1q1pp/2p5/5P2/4p3/5N2/PPPPQPPP/RNB1K2R w KQkq - 0 7';
const BENKO_D6 = 'rn1qkb1r/3ppppp/b4n2/2pP4/8/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 6';

describe('what a move prepares is in the engine’s own lines after it', () => {
  it('…Nfd7 prepares no …f6: the pawn push is only what the side would play with a free move (Benko)', () => {
    const reads: IntentReads = {
      before: [L(uci(BENKO_NFD7, ['Nfd7']), -20)],
      passBefore: [L(['g1e2'], -20)],
      // The real line after the move goes on without …f6.
      after: [L(['g1e2', 'e8g8', 'f1g2', 'b8a6'], -20)],
      // …and …f6 is the move after a pass.
      passAfter: [L(['f7f6'], -20)],
    };
    expect(moveIntent(BENKO_NFD7, 'Nfd7', reads, 'student')?.prepares ?? null).toBeNull();
  });

  it('e4 frees no bishop "to come out with Be2": every line goes …Bxf1 (Benko)', () => {
    const reads: IntentReads = {
      before: [L(['e2e4', 'a6f1', 'e1f1'], 60)],
      passBefore: [L(['g7g6'], 40)],
      after: [L(['a6f1', 'e1f1', 'g7g6', 'g2g3'], 60)],
      passAfter: [L(['f1e2'], 80)],
    };
    expect(moveIntent(BENKO_E4, 'e4', reads, 'opponent')?.prepares ?? null).toBeNull();
  });

  it('a move the engine’s line does play for this side is still prepared (c3, then d4)', () => {
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) c.move(m);
    const fen = c.fen();
    const reads: IntentReads = {
      before: [L(['c2c3', 'g8f6', 'd2d4'], 30)],
      passBefore: [L(['g8f6'], 0)],
      after: [L(['g8f6', 'd2d4', 'e5d4', 'c3d4'], 30)],
      passAfter: [],
    };
    expect(moveIntent(fen, 'c3', reads, 'student')?.prepares?.san).toBe('d4');
  });
});

describe('a take-back is about the trade, never what it "prepares"', () => {
  it('…exd5 frees no knight "for …Nc6": it takes back the pawn (Queen’s Indian)', () => {
    const reads: IntentReads = {
      before: [L(['e6d5', 'f3e5', 'b8c6'], 10)],
      passBefore: [L(['d5e6'], 100)],
      after: [L(['f3e5', 'b8c6', 'e5c6', 'b7c6'], 10)],
      passAfter: [],
    };
    expect(moveIntent(QID_EXD5, 'exd5', reads, 'student')?.prepares ?? null).toBeNull();
  });
});

describe('what the prepared move does is new to that move', () => {
  it('…Bd7 hits no pawn on f5 that the bishop on c8 did not already hit (Schliemann)', () => {
    expect(whatItDoes(SCHLIEMANN_AFTER_DXC6, 'c8d7', 'b')?.verb ?? '').not.toMatch(/hit the pawn on f5/);
  });

  it('a new hit is still a reason: Qb3 against a loose b7', () => {
    expect(whatItDoes('rn1qkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1', 'd1b3', 'w')?.verb).toBe('hit the pawn on b7');
  });
});

describe('a move the line goes on to play was not stopped', () => {
  it('d4 stops no …e5 in a line that plays …e5 a move later (the Albin)', () => {
    const start = new Chess().fen();
    const base: IntentReads = {
      before: [L(['d2d4', 'd7d5'], 30)],
      // After a pass, …e5 is their move, worth a real swing.
      passBefore: [L(['e7e5'], -80)],
      after: [L(['d7d5', 'c2c4'], 30), L(['e7e5', 'd4e5'], 150)],
      passAfter: [],
    };
    // With no line shown, the board says …e5 now loses a pawn: stopped.
    expect(moveIntent(start, 'd4', base, 'opponent')?.prevents?.san).toBe('e5');
    // The lesson's line plays it on the next move: not stopped.
    const shown = { ...base, lineAfter: ['d7d5', 'c2c4', 'e7e5'] };
    expect(moveIntent(start, 'd4', shown, 'opponent')?.prevents ?? null).toBeNull();
  });
});

describe('the fundamentals’ "prepares e5" is said only when a line plays it', () => {
  const facts = (line: readonly string[] | null, after: string[] | null) => moveThoughtFacts({ story: false,
    fenBefore: BENKO_D6, san: 'd6', tense: 'now', moverIsStudent: true, prev: NO_PREV_CAPTURE, line, theirLast: null, history: [],
    phrases: null, costCp: null, theory: true,
    reads: after ? { before: [L(['d7d6'], -40)], passBefore: [], after: [L(after, -40)], passAfter: [] } : null,
  }).filter((f) => f.computer === 'computeMoveFundamentals').map((f) => f.text);

  it('…d6 prepares no e5 in the Benko: neither the engine’s line nor the lesson’s plays it', () => {
    const said = facts(['e4', 'Bxf1', 'Kxf1', 'g6'], ['e2e4', 'a6f1', 'e1f1', 'g7g6']);
    expect(said.join(' ')).not.toMatch(/prepares e5/);
  });

  it('with no line known the board is all there is, and it says the square is guarded', () => {
    expect(facts(null, null).join(' ')).toMatch(/prepares e5/);
  });

  it('…and it is said when the line does play the push', () => {
    const said = facts(['e4', 'e5'], ['e2e4', 'e7e5']);
    expect(said.join(' ')).toMatch(/prepares e5/);
  });
});
