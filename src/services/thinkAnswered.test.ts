import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { thinkCredit } from './thinkAnswered';
import { thinkLine, thinkCheckOf, splitThink, stripThink } from '../utils/thinkPause';

/** The student's move from `fen`, as the Learn page hands it over. */
function play(fen: string, san: string): { from: string; to: string; fenAfter: string } {
  const c = new Chess(fen);
  const m = c.move(san);
  return { from: m.from, to: m.to, fenAfter: c.fen() };
}

describe('thinkLine carries its check', () => {
  it('round-trips every kind, and the check never shows', () => {
    const line = thinkLine('Why not Nxe5?', 'It grabs the pawn on e5, but Qd4 refutes it.', { kind: 'avoid', uci: ['f3e5'] });
    expect(thinkCheckOf(line)).toEqual({ kind: 'avoid', uci: ['f3e5'] });
    expect(splitThink(line)).toEqual(['Why not Nxe5?', 'It grabs the pawn on e5, but Qd4 refutes it.']);
    expect(stripThink(line)).toBe('Why not Nxe5? It grabs the pawn on e5, but Qd4 refutes it.');
    expect(stripThink(`${line} That line gives up a pawn.`)).toBe('Why not Nxe5? It grabs the pawn on e5, but Qd4 refutes it. That line gives up a pawn.');
    expect(thinkCheckOf(thinkLine('q?', 'a.', { kind: 'parry', best: 'e2e4', squares: ['c3', 'd4'] })))
      .toEqual({ kind: 'parry', best: 'e2e4', squares: ['c3', 'd4'] });
  });
  it('a line without a check reads as always — the answer is said', () => {
    expect(thinkCheckOf('Just a sentence.')).toEqual({ kind: 'always' });
  });
});

describe('thinkCredit — right gets a credit, wrong gets the answer', () => {
  // Italian: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 — White to move.
  const italian = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2P2N2/PP1P1PPP/RNBQK2R w KQkq - 1 5';

  it('always: never credited', () => {
    expect(thinkCredit({ kind: 'always' }, play(italian, 'd4'))).toBeNull();
  });

  it('avoid: credited when the tempting move was left alone, not when it was played', () => {
    const check = { kind: 'avoid', uci: ['f3e5'] } as const;
    expect(thinkCredit(check, play(italian, 'd3'))).not.toBeNull();
    expect(thinkCredit(check, play(italian, 'Nxe5'))).toBeNull();
  });

  it('from: credited only when that piece moved', () => {
    const check = { kind: 'from', square: 'c4' } as const;
    expect(thinkCredit(check, play(italian, 'Bb3'))).toMatch(/c4/);
    expect(thinkCredit(check, play(italian, 'd3'))).toBeNull();
  });

  it('hit: a move that attacks the target safely is credited; one that hangs the attacker is not', () => {
    // Target their bishop on c5: d4 and b4 attack it, each guarded by c3.
    const check = { kind: 'hit', square: 'c5' } as const;
    expect(thinkCredit(check, play(italian, 'd4'))).toMatch(/c5/);
    expect(thinkCredit(check, play(italian, 'b4'))).toMatch(/c5/);
    expect(thinkCredit(check, play(italian, 'h3'))).toBeNull();
    // The target itself is taken: credited.
    expect(thinkCredit({ kind: 'hit', square: 'e5' }, play(italian, 'Nxe5'))).toMatch(/e5/);
    // An attacker that simply hangs is not credited: Ne3 eyes d5 and the f4
    // pawn takes it; Nxf4 eyes d5 from a square nothing attacks.
    const hang = '4k3/8/8/3p4/5p2/8/6N1/4K3 w - - 0 1';
    expect(thinkCredit({ kind: 'hit', square: 'd5' }, play(hang, 'Ne3'))).toBeNull();
    expect(thinkCredit({ kind: 'hit', square: 'd5' }, play(hang, 'Nxf4'))).toMatch(/d5/);
  });

  it('parry: the engine move is credited; a move that leaves the hit piece hanging is not', () => {
    // 1.e4 e5 2.Nf3 d6 3.Bc4 Bg4 4.Nc3 Nc6 5.h3 — Black's bishop on g4 is hit.
    const fen = 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N1P/PPPP1PP1/R1BQK2R b KQkq - 0 5';
    const check = { kind: 'parry', best: 'g4h5', squares: ['g4'] } as const;
    expect(thinkCredit(check, play(fen, 'Bh5'))).toMatch(/Threat met/);
    expect(thinkCredit(check, play(fen, 'Be6'))).toMatch(/Threat met/);   // another safe square
    expect(thinkCredit(check, play(fen, 'a6'))).toBeNull();                // the bishop still hangs
  });

  it('parry on a line threat credits only the engine move', () => {
    const fen = 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N1P/PPPP1PP1/R1BQK2R b KQkq - 0 5';
    const check = { kind: 'parry', best: 'g4h5', squares: [] } as const;
    expect(thinkCredit(check, play(fen, 'Bh5'))).not.toBeNull();
    expect(thinkCredit(check, play(fen, 'Be6'))).toBeNull();
  });
});
