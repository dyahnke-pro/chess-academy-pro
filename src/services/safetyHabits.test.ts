import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { blunderCheck, autopilotGuard } from './safetyHabits';

const at = (m: string[]): string => { const c = new Chess(); for (const x of m) c.move(x); return c.fen(); };

describe('blunder check (P3 method beat)', () => {
  it('fires when the reply simply takes the piece the move left hanging', () => {
    // 2…Qh4?? 3.Nxh4 — the queen simply hangs to the knight.
    const fen = at(['e4', 'e5', 'Nf3']);
    expect(blunderCheck(fen, 'Qh4', 'Nxh4', 900)).toBe('Blunder check before you let go of a piece: what can they take now? Here the answer was your queen on h4.');
  });
  it('silent on a trade, a cheap slip, or no capture', () => {
    const fen = at(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
    expect(blunderCheck(fen, 'Bxc6', 'dxc6', 200)).toBeNull();
    expect(blunderCheck(at(['e4', 'e5', 'Nf3']), 'Qh4', 'Nxh4', 100)).toBeNull();
    expect(blunderCheck(at(['e4', 'e5', 'Nf3']), 'Qh4', 'd3', 900)).toBeNull();
  });
});

describe('autopilot guard (P3 method beat)', () => {
  it('fires on the popular move that costs', () => {
    expect(autopilotGuard('Bc4', 120, 'Bc4')).toMatch(/^That is the move most players make here/);
  });
  it('silent when cheap, unpopular, or no popularity data', () => {
    expect(autopilotGuard('Bc4', 50, 'Bc4')).toBeNull();
    expect(autopilotGuard('Bc4', 200, 'Bb5')).toBeNull();
    expect(autopilotGuard('Bc4', 200, null)).toBeNull();
  });
});

describe('keepPressing — winning, and a slow move gave them time', () => {
  const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('speaks when the forcing best move was passed over while still winning', async () => {
    const { keepPressing } = await import('./safetyHabits');
    expect(keepPressing(fen, 'a3', 'Nxe5', 150, 400)).toMatch(/keep asking questions/);
  });
  it('silent when not winning, when the played move forces, or when the best was quiet', async () => {
    const { keepPressing } = await import('./safetyHabits');
    expect(keepPressing(fen, 'a3', 'Nxe5', 150, 200)).toBeNull();
    expect(keepPressing(fen, 'a3', 'Nf3', 150, 400)).toBeNull();
    expect(keepPressing(fen, 'a3', 'Nxe5', 60, 400)).toBeNull();
    expect(keepPressing(fen, 'a3', null, 150, 400)).toBeNull();
  });
});
