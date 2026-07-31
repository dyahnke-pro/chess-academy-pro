import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { narrateContinuationMove } from './continuationMoveNarration';

// David 2026-07-31: "The middle game plans were devoid of narration and
// arrows." Every move of the play-out must now say something TRUE and draw
// its trail — and, per his 2026-07-19 note, must not overstate the why with
// reasons that don't apply.

const play = (sans: string[]): { before: string; after: string; san: string; from: string; to: string } => {
  const c = new Chess();
  for (const s of sans.slice(0, -1)) c.move(s);
  const before = c.fen();
  const mv = c.move(sans[sans.length - 1]);
  return { before, after: c.fen(), san: mv.san, from: mv.from, to: mv.to };
};

const narrate = (sans: string[]) => {
  const p = play(sans);
  return narrateContinuationMove(p.before, p.after, p.san, p.from, p.to);
};

describe('narrateContinuationMove', () => {
  it('never returns an empty line — the silent play-out was the bug', () => {
    for (const line of [
      ['e4'], ['e4', 'e5'], ['e4', 'e5', 'Nf3'], ['e4', 'e5', 'Nf3', 'Nc6'],
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ['d4', 'd5', 'c4', 'e6', 'Nc3'],
    ]) {
      const n = narrate(line);
      expect(n.say.trim().length, `empty narration for ${line.join(' ')}`).toBeGreaterThan(10);
      expect(n.short.trim().length).toBeGreaterThan(0);
    }
  });

  it('always draws the move trail', () => {
    const n = narrate(['e4']);
    expect(n.arrows[0]).toEqual({ from: 'e2', to: 'e4', color: 'orange' });
  });

  it('names the captured piece on a capture', () => {
    const n = narrate(['e4', 'd5', 'exd5']);
    expect(n.say).toMatch(/taking the pawn on d5/i);
  });

  it('says check when the move gives check', () => {
    // 1.f4 e5 2.fxe5 Qh4+ — f2 is vacated, so the queen checks along h4-e1.
    const n = narrate(['f4', 'e5', 'fxe5', 'Qh4+']);
    expect(n.say).toMatch(/check/i);
  });

  it('announces mate and stops there', () => {
    const n = narrate(['f3', 'e5', 'g4', 'Qh4']);
    expect(n.say).toMatch(/mate/i);
    expect(n.short).toBe('Checkmate.');
  });

  it('draws a green arrow at a piece it now attacks', () => {
    // 3.Bb5 eyes the c6-knight.
    const n = narrate(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    const green = n.arrows.filter((a) => a.color === 'green');
    expect(green.some((a) => a.from === 'b5' && a.to === 'c6')).toBe(true);
    expect(n.say).toMatch(/knight on c6/i);
  });

  it('keeps a quiet move short and honest rather than padded', () => {
    const n = narrate(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3']);
    // One or two clauses, not a paragraph of speculative reasons.
    expect(n.say.split(',').length).toBeLessThanOrEqual(4);
    expect(n.say.trim().length).toBeGreaterThan(10);
  });

  it('caps the arrows so the board stays readable', () => {
    for (const line of [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3']]) {
      expect(narrate(line).arrows.length).toBeLessThanOrEqual(4);
    }
  });

  it('every arrow starts on a square that holds a piece', () => {
    for (const line of [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ['d4', 'd5', 'c4', 'dxc4', 'e3']]) {
      const p = play(line);
      const n = narrateContinuationMove(p.before, p.after, p.san, p.from, p.to);
      const board = new Chess(p.after);
      for (const a of n.arrows) {
        // The trail arrow's origin is empty by definition (the piece left it).
        if (a.from === p.from && a.to === p.to) continue;
        expect(board.get(a.from as never), `arrow from empty ${a.from}`).toBeTruthy();
      }
    }
  });
});
