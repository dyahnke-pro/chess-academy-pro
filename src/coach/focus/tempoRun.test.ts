import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { NO_RUN, stepRun, stoodMove, tempoMove, type TempoMoveInput } from './tempoRun';
import type { ReadLine } from './focusChances';

const play = (fen: string, san: string): string => { const c = new Chess(fen); c.move(san); return c.fen(); };
const line = (uci: string, evaluation: number): ReadLine => ({ moves: [uci], evaluation, mate: null });
const at = (fen: string, san: string, lines: ReadLine[] | null): TempoMoveInput => ({ fenBefore: fen, san, student: 'w', lines });

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

describe('the move that stood is read off the boards', () => {
  it('the one legal move that leads there', () => {
    expect(stoodMove(CHECK, play(CHECK, 'Ra8+'))).toBe('Ra8+');
    expect(stoodMove(CHECK, play(KICK, 'Nc3'))).toBeNull();
  });
});
