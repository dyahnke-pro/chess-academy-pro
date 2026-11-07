/**
 * HOW TO SPOT IT NEXT TIME (David 2026-11-07: "a sentence as to how to spot it
 * in the future … something specific, not just 'look for hanging pieces'").
 * Each line names the board's own trigger — the move that made the chance,
 * the piece it hit, the guard that left — and the habit for that piece.
 */
import { describe, it, expect } from 'vitest';
import { spotLine } from './focusLines';
import type { FocusChance } from './focusChances';
import { SPOT_CUES } from '../../data/spotCues';
import { pickSpotCue } from '../../services/spotCue';

const chance = (c: Partial<FocusChance> & Pick<FocusChance, 'kind' | 'seat'>): FocusChance => ({
  tag: 'hung-material', key: 'k', squares: [], answerUci: null, difficulty: 0, ...c,
} as FocusChance);

describe('spotLine — the board\'s own trigger, then the habit for that piece', () => {
  it('their pawn moved up and hit your bishop: the pawn\'s new reach, and a guard does not help against a cheaper piece', () => {
    const prevFen = '4k3/5p2/8/6B1/8/8/8/4K3 b - - 0 1';
    const fen = '4k3/8/5p2/6B1/8/8/8/4K3 w - - 0 2';
    const line = spotLine(chance({ kind: 'save', seat: 'defend', piece: { type: 'b', square: 'g5' }, attacker: { type: 'p', square: 'f6' }, counts: { attackers: 1, defenders: 1, pinned: [] } }), { prevFen, fen });
    expect(line).toBe('Their pawn came to f6 and hit your bishop on g5, and a guard does not save a piece from a cheaper attacker. Next time, after every pawn move of theirs, look at the two squares it now attacks.');
  });

  it('their knight stepped off the rank and opened their rook onto your knight: a discovered attack', () => {
    const prevFen = '4k3/8/8/r2n3N/8/8/8/4K3 b - - 0 1';
    const fen = '4k3/8/1n6/r6N/8/8/8/4K3 w - - 1 2';
    const line = spotLine(chance({ kind: 'save', seat: 'defend', piece: { type: 'n', square: 'h5' }, attacker: { type: 'r', square: 'a5' } }), { prevFen, fen });
    expect(line).toBe('Their knight moved off the line and opened their rook on a5 onto your knight on h5. Next time, when a piece of theirs moves, look down the line it opens behind it.');
  });

  it('your knight left the square it guarded from: before a piece moves, what is it guarding?', () => {
    const fenBefore = '4k3/8/8/4P3/8/5N2/8/4K3 w - - 0 1';
    const line = spotLine(chance({ kind: 'leave', seat: 'defend', piece: { type: 'p', square: 'e5' } }), { prevFen: null, fen: fenBefore, move: { fenBefore, san: 'Ng1' } });
    expect(line).toBe('Your knight left f3, and it was the guard of your pawn on e5. Next time, before a piece moves, check what it is guarding.');
  });

  it('their knight landed with nothing guarding it', () => {
    const prevFen = '4k3/8/5n2/8/3P4/8/8/4K3 b - - 0 1';
    const fen = '4k3/8/8/8/3Pn3/8/8/4K3 w - - 1 2';
    const line = spotLine(chance({ kind: 'take', seat: 'exploit', piece: { type: 'n', square: 'e4' } }), { prevFen, fen });
    expect(line).toBe('Their knight came to e4 with nothing guarding it. Next time, when a piece of theirs lands, ask what guards it.');
  });

  it('a shot says the way to spot it that its own board shows: a knight forking king and rook', () => {
    const fen = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';
    const line = spotLine(chance({ kind: 'shot', seat: 'exploit', tag: 'missed-your-fork', answerUci: 'd5c7' }), { prevFen: null, fen });
    expect(line).toBe(SPOT_CUES.fork.find((c) => c.when === 'knight-king-rook')!.line);
  });

  it('their fork, missed: the defender\'s cue, never the attacker\'s', () => {
    const line = spotLine(chance({ kind: 'motif', seat: 'defend', tag: 'missed-their-fork' }), { prevFen: null, fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1' });
    expect(line).toBe(SPOT_CUES.fork.find((c) => c.when === 'defend')!.line);
  });

  it('twin: nothing specific to say is silence; a shot with no line gets one of its habits', () => {
    expect(spotLine(chance({ kind: 'save', seat: 'defend' }), { prevFen: null, fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1' })).toBeNull();
    expect(spotLine(chance({ kind: 'shot', seat: 'exploit', tag: 'hung-material' as FocusChance['tag'] }), { prevFen: null, fen: '4k3/8/8/8/8/8/8/4K3 w - - 0 1' })).toBe(pickSpotCue('free-piece', 'yours', null)!.line);
  });
});
