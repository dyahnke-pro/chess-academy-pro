import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { NO_RUN, stepRun, tempoMove, type TempoMoveInput } from './tempoRun';
import type { ReadLine } from './focusChances';

const line = (uci: string, evaluation: number): ReadLine => ({ moves: [uci], evaluation, mate: null });
const at = (fen: string, san: string, lines: ReadLine[] | null, seen: ReadonlySet<string> = new Set()): TempoMoveInput => ({ fenBefore: fen, san, student: 'w', lines, seen });
const key = (fen: string): string => fen.split(' ').slice(0, 4).join(' ');

/** A rook to check along the eighth rank. */
const CHECK = '7k/8/8/8/8/8/8/R3K3 w - - 0 1';
/** Nc3 hits the d5 rook, which cannot take it back. */
const KICK = '4k3/8/8/3r4/8/8/8/1N2K3 w - - 0 1';
/** Nxd5 takes the rook: a capture, never a tempo move. */
const TAKE = '4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1';

describe('a tempo move makes them react, and the engine vouches for it', () => {
  it('a check the read lists within a pawn of its best', () => {
    expect(tempoMove(at(CHECK, 'Ra8+', [line('a1a8', 20), line('e1e2', 0)]))).toBe(true);
  });
  it('a quiet move that attacks a piece they must move', () => {
    expect(tempoMove(at(KICK, 'Nc3', [line('b1c3', 50), line('e1e2', 0)]))).toBe(true);
  });
  it('a discovered attack counts: 13.Nd5 uncovers the d2 bishop on the h6 queen (hand walk 2026-10-23)', () => {
    const c = new Chess();
    for (const m of ['e4', 'c6', 'Nc3', 'Nf6', 'e5', 'Nd5', 'd4', 'Nxc3', 'bxc3', 'e6', 'Nf3', 'Qa5', 'Bd3', 'd6', 'Bd2', 'dxe5',
      'Nxe5', 'Nd7', 'Nc4', 'Qd5', 'Ne3', 'Qg5', 'a4', 'Qh6']) c.move(m);
    expect(tempoMove(at(c.fen(), 'Nd5', [line('e3d5', 600), line('d1f3', 80)]))).toBe(true);
  });
  it('a check that brings back a position already on the board is no tempo move — a perpetual is a draw, not a run (prod record 2026-10-23: Qg6+ Ke7 Qg5+ Ke8 Qg6+…)', () => {
    const after = new Chess(CHECK); after.move('Ra8+');
    expect(tempoMove(at(CHECK, 'Ra8+', [line('a1a8', 20)], new Set([key(after.fen())])))).toBe(false);
    expect(tempoMove(at(CHECK, 'Ra8+', [line('a1a8', 20)], new Set([key(CHECK)]))), 'the board it came FROM is no repeat').toBe(true);
  });
  it('twin: a quiet move adding a second attacker to a piece already en prise is no new threat', () => {
    // The d5 rook already hangs to the c3 knight; Ke2 changes nothing.
    expect(tempoMove(at('4k3/8/8/3r4/8/2N5/8/4K3 w - - 0 1', 'Ke2', [line('e1e2', 0)]))).toBe(false);
    expect(tempoMove(at('4k3/8/8/3r4/8/2N1B3/8/4K3 w - - 0 1', 'Bf4', [line('e3f4', 0)])), 'the rook hung to Nc3 already').toBe(false);
  });
  it('twins: a capture; a check the read does not list; a check a pawn worse than the best; no read', () => {
    expect(tempoMove(at(TAKE, 'Nxd5', [line('c3d5', 500)]))).toBe(false);
    expect(tempoMove(at(CHECK, 'Ra8+', [line('e1e2', 0), line('e1d2', -10)]))).toBe(false);
    expect(tempoMove(at(CHECK, 'Ra8+', [line('e1e2', 150), line('a1a8', 30)]))).toBe(false);
    expect(tempoMove(at(CHECK, 'Ra8+', null))).toBe(false);
  });
});

describe('the run, and how it ends', () => {
  const two = (): ReturnType<typeof stepRun>['run'] => {
    let run = stepRun(NO_RUN, at(CHECK, 'Ra8+', [line('a1a8', 20)])).run;
    run = stepRun(run, at(KICK, 'Nc3', [line('b1c3', 50)])).run;
    return run;
  };
  it('two in a row, then a quiet move: the run of two ended — "had"', () => {
    const run = two();
    expect(run).toEqual({ length: 2, longest: 2 });
    const end = stepRun(run, at(KICK, 'Ke2', [line('e1e2', 0), line('b1c3', 10)]));
    expect(end.ended).toEqual({ length: 2, letOff: false });
    expect(end.run).toEqual({ length: 0, longest: 2 });
  });
  it('ended while a forcing move was still on and the quiet move cost half a pawn: let off', () => {
    const end = stepRun(two(), at(KICK, 'Ke2', [line('b1c3', 80), line('e1e2', 0)]));
    expect(end.ended).toEqual({ length: 2, letOff: true });
  });
  it('twin: the forcing move was best but the quiet one cost little — had', () => {
    const end = stepRun(two(), at(KICK, 'Ke2', [line('b1c3', 30), line('e1e2', 0)]));
    expect(end.ended?.letOff).toBe(false);
  });
  it('a single tempo move is no run — nothing ends', () => {
    const one = stepRun(NO_RUN, at(CHECK, 'Ra8+', [line('a1a8', 20)])).run;
    expect(stepRun(one, at(CHECK, 'Ke2', [line('e1e2', 0)])).ended).toBeNull();
  });
});
