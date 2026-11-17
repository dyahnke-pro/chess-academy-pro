import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { flexibleMove, flexibleMoveLine, flexOptions } from './flexibleMove';
import { readBoard } from './boardComputers';
import { moveThoughtFacts } from './moveThoughtFacts';
import { NO_PREV_CAPTURE } from './captureRun';
import type { WeighRead } from './weighedMoves';

// Every board is a Danya speedrun position (public/data/voiced-teachings.json,
// note id named), the move his game played there; the reads are the Danya
// bench's engine lines from the board before it (audit-reports/.fixtures/
// danya-bench, MultiPV 5, White-POV cp; the first two moves of each line kept).
const r = (cp: number, mate: number | null, moves: string): WeighRead => ({ evaluation: cp, mate, moves: moves.split(' ') });
const after = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };

// vc-Ty0DEz4Wevw-14 (…c6, his "do not be afraid of playing c6 and developing
// the knight to d7 — flexible development"): c4 e6 Nf3 d5 g3 Nf6 cxd5 exd5 d4
// Bd6 Bg2 O-O O-O c6.
const C6 = { fen: 'rnbq1rk1/ppp2ppp/3b1n2/3p4/3P4/5NP1/PP2PPBP/RNBQ1RK1 b - - 4 7', san: 'c6',
  reads: [r(-39, null, 'f8e8 b1c3'), r(-38, null, 'c7c6 b1c3'), r(-34, null, 'b8d7 b1c3'), r(-22, null, 'h7h6 c1f4'), r(-14, null, 'd6e7 b1c3')] };
// vc-ADPy7sCbiUU-5 (e5, the Caro-Kann advance): e4 c6 Nf3 d5 e5.
const E5 = { fen: 'rnbqkbnr/pp2pppp/2p5/3p4/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', san: 'e5',
  reads: [r(27, null, 'e4e5 c8g4'), r(24, null, 'b1c3 d5e4'), r(20, null, 'd2d3 d5e4'), r(14, null, 'e4d5 c6d5'), r(-8, null, 'd1e2 d5e4')] };
// vc-NQYFSC5TCnE-5 (Nc3 against the Modern): d4 g6 e4 Bg7 Nc3 — the knight
// first, the bishop's square later.
const NC3 = { fen: 'rnbqk1nr/ppppppbp/6p1/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 1 3', san: 'Nc3',
  reads: [r(70, null, 'b1c3 d7d6'), r(66, null, 'f1e2 d7d6'), r(60, null, 'g1f3 d7d6'), r(58, null, 'h2h3 d7d6'), r(56, null, 'c2c4 d7d6')] };
// vc-4GIsh7cTsHc-11 (Nf3 in the Caro-Kann advance): e4 c6 d4 d5 e5 Bf5 f4 e6
// Bd3 Nh6 Nf3 — the knight off the c-file keeps c4.
const NF3 = { fen: 'rn1qkb1r/pp3ppp/2p1p2n/3pPb2/3P1P2/3B4/PPP3PP/RNBQK1NR w KQkq - 2 6', san: 'Nf3',
  reads: [r(-45, null, 'b1c3 c6c5'), r(-54, null, 'g1f3 c6c5'), r(-61, null, 'g1e2 c6c5'), r(-64, null, 'c2c3 c6c5'), r(-67, null, 'a2a3 c6c5')] };
// vc-6uFhzy3VnXA-5 (the bishop out before the knight): d4 d5 Nc3 Nf6 Bf4.
const BF4 = { fen: 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 3', san: 'Bf4',
  reads: [r(-6, null, 'c1f4 a7a6'), r(-6, null, 'g1f3 e7e6'), r(-15, null, 'c1g5 c7c5'), r(-15, null, 'e2e3 c7c5'), r(-33, null, 'a2a3 c7c5')] };
// vc-LYStFYLTCno-3 (his "Bc4 this early commits the bishop … not a first-rate
// move"): e4 c5 Bc4 — the engine holds it nowhere near the best.
const BC4 = { fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', san: 'Bc4',
  reads: [r(43, null, 'g1f3 b8c6'), r(42, null, 'g1e2 b8c6'), r(37, null, 'b1c3 b8c6'), r(31, null, 'c2c3 d7d5'), r(24, null, 'h2h3 g7g6')] };

describe('the options on a board', () => {
  it('the f1 bishop has three good squares, the knight one: c3 or f3, never the rim', () => {
    const o = flexOptions(NC3.fen);
    const sq = (home: string): string[] => o.filter((x) => x.kind === 'square' && x.home === home).map((x) => (x as { to: string }).to).sort();
    expect(sq('f1')).toEqual(['c4', 'd3', 'e2']);
    expect(sq('b1').some((s) => s.startsWith('a'))).toBe(false);
    expect(sq('g1').some((s) => s.startsWith('h'))).toBe(false);
  });
});

// Bc4's own read, Stockfish depth 18 (searchmoves f1c4): 0, against Nf3's +35.
const BC4_READ = r(0, null, 'f1c4 e7e6');

describe('flexibleMove: an inaccuracy by committing (David 2026-11-17)', () => {
  it('Bc4 costs a little and commits the bishop; Nf3 was the better move and kept it home', () => {
    const f = flexibleMove(BC4.fen, BC4.san, [...BC4.reads, BC4_READ]);
    expect(f).toMatchObject({ verdict: 'committed', inaccuracy: true });
    const line = flexibleMoveLine(f!, 'your', after(BC4.fen, BC4.san));
    expect(line).toMatch(/was the better move/);
    expect(line).not.toMatch(/just as good/);
  });
  it('an inaccuracy is never praised as keeping options', () => {
    const f = flexibleMove(BC4.fen, BC4.san, [...BC4.reads, BC4_READ]);
    expect(f?.verdict).not.toBe('kept');
  });
  it('a move further off than an inaccuracy says nothing here (its cost has its own reason)', () => {
    expect(flexibleMove(BC4.fen, BC4.san, [...BC4.reads, r(-80, null, 'f1c4 e7e6')])).toBeNull();
  });
});

describe('flexibleMove: kept', () => {
  it('Nc3 leaves the bishop its choice; Be2, as good, would have settled it', () => {
    const f = flexibleMove(NC3.fen, NC3.san, NC3.reads);
    expect(f).toMatchObject({ verdict: 'kept', rival: { san: 'Be2' } });
    expect([...f!.choice].sort()).toEqual(['c4', 'd3', 'e2']);
    expect(flexibleMoveLine(f!, 'your', after(NC3.fen, NC3.san))).toMatch(/settled your (dark|light)-squared bishop before you know where it belongs/);
  });
  it('…c6 keeps the c8 bishop\'s squares that …Nbd7 would take', () => {
    const f = flexibleMove(C6.fen, C6.san, C6.reads);
    expect(f).toMatchObject({ verdict: 'kept', rival: { san: 'Nbd7' } });
    expect(flexibleMoveLine(f!, 'their', after(C6.fen, C6.san))).toMatch(/their light-squared bishop/);
  });
  it('Nf3 keeps the c4 break that Nc3 would block', () => {
    const f = flexibleMove(NF3.fen, NF3.san, NF3.reads);
    expect(f).toMatchObject({ verdict: 'kept', rival: { san: 'Nc3' }, differ: [{ kind: 'break', to: 'c4' }] });
    expect(flexibleMoveLine(f!, 'your', after(NF3.fen, NF3.san))).toMatch(/c4 break/);
  });
});

describe('flexibleMove: committed', () => {
  it('e5 fixes the pawns: the d5 break is gone, d3 kept it', () => {
    const f = flexibleMove(E5.fen, E5.san, E5.reads);
    expect(f).toMatchObject({ verdict: 'committed', rival: { san: 'd3' }, differ: [{ kind: 'break', to: 'd5' }] });
    expect(flexibleMoveLine(f!, 'your', after(E5.fen, E5.san))).toMatch(/d5 break/);
  });
  it('Bf4 settles the bishop where Nf3, as good, kept its choice', () => {
    const f = flexibleMove(BF4.fen, BF4.san, BF4.reads);
    expect(f).toMatchObject({ verdict: 'committed', rival: { san: 'Nf3' } });
    expect(flexibleMoveLine(f!, 'their', after(BF4.fen, BF4.san))).toMatch(/their (dark|light)-squared bishop|its square/);
  });
});

describe('flexibleMove: silent', () => {
  it('without Bc4\'s own read there is nothing to compare', () => {
    expect(flexibleMove(BC4.fen, BC4.san, BC4.reads)).toBeNull();
  });
  it('without reads, or without the played move\'s read, it says nothing', () => {
    expect(flexibleMove(NC3.fen, NC3.san, null)).toBeNull();
    expect(flexibleMove(NC3.fen, NC3.san, NC3.reads.slice(1))).toBeNull();
  });
  it('the same piece to another square is the square choice, not the order', () => {
    // Be2 against Bd3 only: one bishop, two squares (`squareChoice`'s question).
    const reads = [r(70, null, 'f1e2 d7d6'), r(66, null, 'f1d3 d7d6')];
    expect(flexibleMove(NC3.fen, 'Be2', reads)).toBeNull();
  });
});

describe('the one registry and the one composer', () => {
  it('comes out of the registry from both seats', () => {
    const mine = readBoard('flexibleMove', { fenBefore: NC3.fen, san: NC3.san, student: 'w', reads: NC3.reads });
    expect(mine?.computer).toBe('flexibleMove');
    expect(mine?.seat).toBe('student');
    expect(mine?.text).toMatch(/^Your knight to c3|your (dark|light)-squared bishop/);
    const theirs = readBoard('flexibleMove', { fenBefore: NC3.fen, san: NC3.san, student: 'b', reads: NC3.reads });
    expect(theirs?.seat).toBe('opponent');
    expect(theirs?.text).toMatch(/their/i);
    expect(theirs?.text).not.toMatch(/\b(we|our|us)\b/i);
  });
  it('a lesson or Review move carries it', () => {
    const facts = moveThoughtFacts({
      plainThreatsSeen: false, story: false, theory: false, tense: 'past', fenBefore: NC3.fen, san: NC3.san, moverIsStudent: true,
      prev: NO_PREV_CAPTURE, line: null, history: [], theirLast: null, phrases: null, costCp: 0,
      reads: { before: NC3.reads.map((l, k) => ({ rank: k + 1, evaluation: l.evaluation, moves: [...l.moves], mate: null })), after: [], passBefore: [], passAfter: [] } as never,
    });
    expect(facts.some((f) => f.computer === 'flexibleMove' && /bishop/.test(f.text))).toBe(true);
  });
});
