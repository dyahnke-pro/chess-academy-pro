// kpSolver — the exact value of a kings-and-pawns board, and why a proven draw
// holds. Textbook positions with known values, negative controls (a won board
// is never called a draw), and Daniel Naroditsky's boards where the try's
// pawn ending is solved.
import { describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { kpDrawReason, kpMoveValues, kpVerdict } from './kpSolver';
import { changeReason, kpResultChange } from './futures';

const v = (fen: string): string | undefined => kpVerdict(fen)?.value;

describe('kpVerdict: textbook values', () => {
  it('K+P v K: the king on the sixth in front of the pawn wins, whoever is to move', () => {
    expect(v('4k3/8/4K3/4P3/8/8/8/8 w - - 0 1')).toBe('white');
    expect(v('4k3/8/4K3/4P3/8/8/8/8 b - - 0 1')).toBe('white');
  });
  it('K+P v K: the pawn on its second rank wins when the king reaches a key square first', () => {
    expect(v('4k3/8/8/4K3/4P3/8/8/8 w - - 0 1')).toBe('white');
    expect(v('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1')).toBe('white');
  });
  it('K+P v K: the defender with the opposition draws', () => {
    // Ke5 and e4 against Ke8, Black to move: …Ke7 takes the opposition.
    expect(v('4k3/8/8/4K3/4P3/8/8/8 b - - 0 1')).toBe('draw');
    // The king two squares in front, both to move.
    expect(v('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1')).toBe('draw');
    expect(v('8/8/8/4k3/8/8/4P3/4K3 b - - 0 1')).toBe('draw');
    // The pawn on the sixth, the attacking king behind it: stalemate tricks.
    expect(v('4k3/8/4P3/4K3/8/8/8/8 w - - 0 1')).toBe('draw');
  });
  it('the rook pawn with the king in the corner is a draw', () => {
    expect(v('k7/8/8/8/8/8/P7/K7 w - - 0 1')).toBe('draw');
  });
  it('stalemate on the board is a draw; a lone far pawn queens', () => {
    expect(v('7k/5K2/6P1/8/8/8/8/8 b - - 0 1')).toBe('draw');
    expect(v('8/8/8/8/8/8/1P6/K6k w - - 0 1')).toBe('white');
  });
  it('triangulation: the zugzwang board is a win for the side that can lose a tempo', () => {
    expect(v('2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1')).toBe('white');
  });
  it('en passant on the board is a move: without it Black is stalemated, with it the game goes on', () => {
    expect(v('7k/5K2/6P1/8/5Pp1/6P1/8/8 b - - 0 1')).toBe('draw');
    expect(v('7k/5K2/6P1/8/5Pp1/6P1/8/8 b - f3 0 1')).not.toBe('draw');
  });
  it('is not for boards with pieces or too many men', () => {
    expect(kpVerdict('4k3/8/4K3/4P3/8/8/8/7R w - - 0 1')).toBeNull();
    expect(kpVerdict('8/8/6pp/1K1k1p2/2p5/2P4P/1P4P1/8 w - - 1 49')).toBeNull();
  });
  it('answers unknown when the proof does not close, never a guess', () => {
    // A queen against a pawn one step from queening is beyond the rules it
    // searches: the race is unknown with too small a budget, or as a whole.
    expect(kpVerdict('8/8/8/1k4p1/6P1/4Pp2/3K4/8 w - - 0 63')?.value).toBe('unknown');
    expect(kpVerdict('8/4K1kp/6p1/6P1/7P/8/8/8 b - - 3 65', 3)?.value).toBe('unknown');
  });
});

describe('kpVerdict: negative controls', () => {
  it('a won board is never called a draw, nor a drawn board won', () => {
    for (const won of ['4k3/8/4K3/4P3/8/8/8/8 b - - 0 1', '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', '2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1']) {
      expect(v(won)).toBe('white');
      expect(kpDrawReason(won, 'w')).toBeNull();
    }
    expect(v('k7/8/8/8/8/8/P7/K7 w - - 0 1')).not.toBe('white');
  });
  it('the moves after a won board: at least one keeps the win, and only lost moves are called lost', () => {
    const mv = kpMoveValues('4k3/8/8/4K3/4P3/8/8/8 w - - 0 1') ?? [];
    expect(mv.some((m) => m.value === 'white')).toBe(true);
    expect(mv.find((m) => m.san === 'Kd6')?.value).toBe('white');
  });
});

describe('kpDrawReason: why the draw holds', () => {
  it('the defending king in front of the pawn first', () => {
    const r = kpDrawReason('4k3/8/8/4K3/4P3/8/8/8 b - - 0 1', 'w');
    expect(r?.kind).toBe('front');
    expect(r?.answer?.san).toBe('Ke7');
    expect(r?.answer?.only).toBe(true);
    expect(r?.text).toContain('e7');
    expect(r?.text).toContain('the only move that holds');
  });
  it('the attacker to move: the most testing try and the answer that holds', () => {
    const r = kpDrawReason('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1', 'w');
    expect(r?.tryMove).not.toBeNull();
    expect(r?.answer).not.toBeNull();
    expect(r?.text).toMatch(/Every try is met|Even the best try/);
    // The answer really holds: the board after the try and the answer is a draw.
    const c = new Chess('8/8/8/4k3/8/8/4P3/4K3 w - - 0 1');
    c.move(r!.tryMove!.san); c.move(r!.answer!.san);
    expect(kpVerdict(c.fen())?.value).toBe('draw');
  });
  it('said from either seat, and the same board always words it the same', () => {
    const fen = '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1';
    expect(kpDrawReason(fen, 'w')?.text).toMatch(/^Their king/);
    expect(kpDrawReason(fen, 'b')?.text).toMatch(/^Your king/);
    expect(kpDrawReason(fen, 'w')?.text).toBe(kpDrawReason(fen, 'w')?.text);
  });
  it('a key square, not the file, is said as a key square', () => {
    // Black to move: …Kd4 or …Ke4; the answer chosen stands in front.
    const r = kpDrawReason('8/8/8/4k3/8/8/4P3/4K3 b - - 0 1', 'w');
    expect(r?.holdSquare).toBe('e4');
    expect(r?.kind).toBe('front');
  });
});

// Daniel Naroditsky's boards (noreason.json), each try played with chess.js.
describe('his boards: the try\'s pawn ending, solved', () => {
  const uci = (fen: string, sans: string[]): string[] => {
    const c = new Chess(fen); return sans.map((s) => { const m = c.move(s); return `${m.from}${m.to}${m.promotion ?? ''}`; });
  };
  it('never-resign-prematurely: h6 loses the pawn ending, Kg8 holds the draw', async () => {
    const fen = '8/4K1kp/6p1/6P1/7P/8/8/8 b - - 3 65';
    const args = { fen, student: 'b' as const, other: 'your' as const,
      tryLine: { moves: uci(fen, ['h6', 'Ke6', 'hxg5', 'hxg5', 'Kh8', 'Kf6']), cp: 900, mate: null },
      bestLine: { moves: uci(fen, ['Kg8']), cp: 0, mate: null } };
    // Cold, the board after Kg8 (four pawns, ~350 pawn slices) does not close
    // inside the fast budget: no claim, never a guess.
    // A fresh module is a cold cache (no other test's slices).
    vi.resetModules();
    const cold = await import('./kpSolver');
    const { kpResultChange: coldChange } = await import('./futures');
    expect(coldChange(args)).toBeNull();
    // Once the board has been read in full (the cache a game keeps), it does.
    const best = new Chess(fen); best.move('Kg8');
    expect(cold.kpVerdict(best.fen())?.value).toBe('draw');
    const r = coldChange(args);
    expect(r?.kind).toBe('lost');
    expect(r?.text).toBe('That loses the pawn ending by force. …Kg8 would have held the draw.');
  }, 60000);
  it('pawn-endgames-a-practical-guide: e4 lets Black hold the draw', () => {
    const fen = '8/8/8/1k4p1/6P1/4Pp2/3K4/8 w - - 0 63';
    const after = new Chess(fen); after.move('e4');
    expect(kpVerdict(after.fen())?.value).toBe('draw');
  }, 60000);
  it('in-pursuit-of-zugzwang: Kc7 and Kd8 both lose — the try does not change the result', () => {
    const fen = '2k5/8/p1P5/P7/3K4/8/8/8 b - - 1 1';
    const r = kpResultChange({ fen, student: 'b', other: 'your',
      tryLine: { moves: uci(fen, ['Kc7', 'Kc5']), cp: 900, mate: null },
      bestLine: { moves: uci(fen, ['Kd8']), cp: 400, mate: null } });
    expect(r).toBeNull();
  });
  it('a try that throws a proven win into a proven draw says why the draw holds', () => {
    // Ke1-d2 with e2 against Ke5: Kd3 is not the try here; build the case from
    // the K+P v K textbook — the best line keeps the win, the try lets the king in front.
    const fen = '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1';
    const r = kpResultChange({ fen, student: 'w', other: 'your',
      tryLine: { moves: uci(fen, ['e4', 'Ke7', 'Ke2', 'Ke6', 'Ke3', 'Ke5']), cp: 0, mate: null },
      bestLine: { moves: uci(fen, ['Kd2', 'Ke7', 'Kd3', 'Kd6', 'Ke4']), cp: 600, mate: null } });
    expect(r?.kind).toBe('drawn');
    expect(r?.text).toMatch(/^That throws the win away\. /);
    // And it is the reason the try falls short.
    expect(changeReason({ fen, student: 'w', rating: 1500, other: 'your',
      tryLine: { moves: uci(fen, ['e4', 'Ke7', 'Ke2', 'Ke6', 'Ke3', 'Ke5']), cp: 0, mate: null },
      bestLine: { moves: uci(fen, ['Kd2', 'Ke7', 'Kd3', 'Kd6', 'Ke4']), cp: 600, mate: null } })).toBe(r?.text);
  }, 60000);
});
