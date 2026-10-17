import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decisiveReason, CLOSE_GAP_CP } from './decisiveReason';
import type { IntentReads } from './moveIntent';

// Real engine reads (native Stockfish, MultiPV 3, depth 16 / pass reads 12) of
// positions from the 100-game amateur claim corpus.
const CASES = JSON.parse(readFileSync('src/services/__fixtures__/decisiveReason.reads.json', 'utf8')) as Array<{ fen: string; san: string; reads: IntentReads }>;
const run = (san: string) => {
  const c = CASES.find((x) => x.san === san);
  if (!c) throw new Error(`no case ${san}`);
  return decisiveReason({ fenBefore: c.fen, san: c.san, reads: c.reads, seat: 'student', opponentLastSan: null });
};

describe('decisiveReason — THE reason when one accounts for the gap', () => {
  it('a forced mate is the reason', () => {
    const r = run('Qf7+');
    expect(r?.kind).toBe('the');
    expect(r?.text).toMatch(/^Qf7\+ starts a forced mate in \d/);
    expect(r?.line?.sans[0]).toBe('Qf7+');
  });
  it('the next-best walking into mate is the reason — said once, no second "anything else"', () => {
    const r = run('Kd8');
    expect(r?.kind).toBe('the');
    expect(r?.text).toMatch(/natural alternative, …Kd7, walks into a forced mate/);
    expect(r?.text).not.toMatch(/Anything else/);
  });
  it('a material win proven by the line', () => {
    const r = run('Ne5');
    expect(r?.kind).toBe('the');
    expect(r?.source).toBe('material');
    expect(r?.text).toMatch(/^Ne5 wins by force/);
  });
  it('a stopped move whose threat covers the gap', () => {
    const r = run('Qxd3+');
    expect(r?.kind).toBe('the');
    expect(r?.source).toBe('stops');
    expect(r?.stakeCp ?? 0).toBeGreaterThanOrEqual(0.6 * (r?.gapCp ?? 0));
  });
  it('when a count and a stopped move both cover the gap, the count speaks', () => {
    const r = run('Re5');
    expect(r?.kind).toBe('the');
    expect(r?.source).toBe('material');
    expect(r?.text).toMatch(/you win a pawn/);
  });
});

describe('decisiveReason — never invents THE reason', () => {
  it('a tiny gap: no single reason, the move\'s own job said as one thing it does', () => {
    const r = run('e4');
    expect(r?.gapCp).toBeLessThan(CLOSE_GAP_CP);
    expect(r?.kind).toBe('close');
    expect(r?.text).toMatch(/^There is no single reason here — d4 is about as good\. One thing it does: e4 /);
  });
  it('a real gap nothing accounts for: A reason, marked as one', () => {
    const r = run('b4');
    expect(r?.kind).toBe('a');
    expect(r?.text).toMatch(/^No single reason shows in the next few moves/);
    expect(r?.text).toMatch(/One thing your …b4 does: it /);
  });
});

describe('decisiveReason — the seat', () => {
  it('their move\'s reason is worded from the student\'s seat', () => {
    const c = CASES.find((x) => x.san === 'Ne5');
    if (!c) throw new Error('no case');
    const r = decisiveReason({ fenBefore: c.fen, san: c.san, reads: c.reads, seat: 'opponent', opponentLastSan: null });
    expect(r?.source).toBe('material');
    expect(r?.text).not.toMatch(/\byou (win|come out ahead)/);
    expect(r?.text).toMatch(/they (win|come out)|for a/);
  });
});

describe('decisiveReason — what the escalating walk caught (2026-10-17)', () => {
  // White queen d1, black knight d5 with nothing guarding it; White to move.
  const FEN = '4k3/8/8/3n4/8/8/P7/3QK3 w - - 0 1';
  const reads = (lines: Array<{ moves: string[]; evaluation: number }>): IntentReads => ({
    before: lines.map((l, i) => ({ rank: i + 1, evaluation: l.evaluation, mate: null, moves: l.moves })), after: [], passBefore: [], passAfter: [],
  });
  it('a one-move win says the move once ("Qxd5 — you win a knight", never "Qxd5 wins by force: Qxd5")', () => {
    const r = decisiveReason({ fenBefore: FEN, san: 'Qxd5', seat: 'student', opponentLastSan: null, reads: reads([{ moves: ['d1d5'], evaluation: 320 }, { moves: ['a2a3'], evaluation: 0 }]) });
    expect(r?.kind).toBe('the');
    expect(r?.text).toMatch(/^Qxd5 — you win a knight\./);
    expect(r?.text).not.toMatch(/Qxd5 wins by force: Qxd5/);
  });
  it('a move outside the engine\'s lines says so and names what it prefers', () => {
    const r = decisiveReason({ fenBefore: FEN, san: 'a3', seat: 'student', opponentLastSan: null, reads: reads([{ moves: ['d1d5'], evaluation: 320 }, { moves: ['e1e2'], evaluation: 300 }]) });
    expect(r?.kind).toBe('a');
    expect(r?.text).toBe("a3 isn't one of the engine's choices here — it prefers Qxd5.");
  });
});


describe('decisiveReason — their move is said as theirs (David 2026-10-17: computer narrations give the best reason too)', () => {
  // Black knight e4 takes the unguarded white queen on d2? Simpler: Black to move, queen d5 takes a loose rook a2.
  const FEN = '4k3/8/8/3q4/8/8/R7/4K3 b - - 0 1';
  it('a material reason for their move opens "Their …"', () => {
    const r = decisiveReason({ fenBefore: FEN, san: 'Qxa2', seat: 'opponent', opponentLastSan: null, reads: {
      before: [{ rank: 1, evaluation: -500, mate: null, moves: ['d5a2'] }, { rank: 2, evaluation: 0, mate: null, moves: ['e8d7'] }], after: [], passBefore: [], passAfter: [],
    } });
    expect(r?.kind).toBe('the');
    expect(r?.text).toMatch(/^Their …Qxa2/);
  });
});

describe('decisiveReason — escalating walk boards (2026-10-17)', () => {
  it('Q6: a forced line is said result first and names where it lands, never the move twice', () => {
    const fen = 'r1b2b1r/pp2k1p1/5nBp/2p1p3/1B2P1q1/8/PPP2PPP/RN1Q1RK1 w - - 0 12';
    const r = decisiveReason({ fenBefore: fen, san: 'Bxc5+', seat: 'student', opponentLastSan: 'c5', reads: {
      before: [{ rank: 1, evaluation: 592, mate: null, moves: 'b4c5 e7e6 g6f5 e6f7 f5g4 c8g4 d1d3 f8c5 d3c4 g4e6 c4c5'.split(' ') }, { rank: 2, evaluation: 331, mate: null, moves: 'd1g4 f6g4 b4c5 e7f6 c5f8 h8f8 g6h5 g7g6 h5g4 c8g4'.split(' ') }], after: [], passBefore: [], passAfter: [] } });
    expect(r?.kind).toBe('the');
    expect(r?.text).toMatch(/^Bxc5\+ wins by force: you come out ahead on material, a queen/);
    expect(r?.text).toMatch(/lands two moves later with Bxg4\./);
    expect(r?.text).not.toMatch(/…Bxg4/);
  });
  it('Q14: a long mate gives way to the free rook, and the mate is said after it', () => {
    const fen = '2Q5/p4kp1/1p3n2/5r1p/4p3/NP5P/P1P2PP1/R2R2K1 w - - 1 28';
    const r = decisiveReason({ fenBefore: fen, san: 'Qxf5', seat: 'student', opponentLastSan: 'Kf7', reads: {
      before: [{ rank: 1, evaluation: 0, mate: 14, moves: 'c8f5 f7e7 a3c4 g7g6 f5g6 f6e8 g6e4 e7f6 e4e8 a7a6'.split(' ') }, { rank: 2, evaluation: 1194, mate: null, moves: 'b3b4 f7g6 c8e6 a7a5 a3c4 f5g5 d1d8 b6b5'.split(' ') }], after: [], passBefore: [], passAfter: [] } });
    expect(r?.text).toMatch(/^Qxf5 — you win a rook\./);
    expect(r?.text).toMatch(/forced mate in 14 moves after it/);
  });
});

describe('decisiveReason — a forced mate is a visualization test for a proven calculator (David 2026-10-17)', () => {
  const fen = '2Q5/p4kp1/1p3n2/5r1p/4p3/NP5P/P1P2PP1/R2R2K1 w - - 1 28';
  const reads = { before: [{ rank: 1, evaluation: 0, mate: 14, moves: 'c8f5 f7e7 a3c4 g7g6 f5g6 f6e8 g6e4 e7f6 e4e8 a7a6'.split(' ') }, { rank: 2, evaluation: 1194, mate: null, moves: 'b3b4 f7g6 c8e6 a7a5 a3c4 f5g5 d1d8 b6b5'.split(' ') }], after: [], passBefore: [], passAfter: [] };
  it('proven: the mate is asked, never answered in the voice', () => {
    const r = decisiveReason({ fenBefore: fen, san: 'Qxf5', seat: 'student', opponentLastSan: 'Kf7', reads, asksToSee: true });
    expect(r?.text).toMatch(/^Qxf5 — you win a rook\. And there's a forced mate in 14 moves after it — can you see it\?/);
  });
  it('grey or red: the mate is stated (grey teaches)', () => {
    const r = decisiveReason({ fenBefore: fen, san: 'Qxf5', seat: 'student', opponentLastSan: 'Kf7', reads });
    expect(r?.text).toMatch(/engine sees a forced mate in 14 moves after it\.$/);
    expect(r?.text).not.toMatch(/can you see/);
  });
});
