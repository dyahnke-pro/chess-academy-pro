import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { blunderCheck, autopilotGuard } from './safetyHabits';

const at = (m: string[]): string => { const c = new Chess(); for (const x of m) c.move(x); return c.fen(); };

describe('blunder check (P3 method beat)', () => {
  it('fires when the reply simply takes the piece the move left hanging', () => {
    // 2…Qh4?? 3.Nxh4 — the queen simply hangs to the knight.
    const fen = at(['e4', 'e5', 'Nf3']);
    expect(blunderCheck(fen, 'Qh4', 'Nxh4', 900)).toBe('Blunder check before you let go of a piece: run CCT for them — what checks, captures and threats do they have once it lands? Here the answer was Nxh4, taking your queen on h4.');
  });
  it('the answer is their move, not a piece (Colle replay 2026-11-05, 26.Qh6 …Rxc3)', () => {
    const sans = 'd4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 O-O Be7 Nbd2 a6 e4 O-O e5 Nd7 Re1 b5 Nf1 Re8 Ng3 Nf8 Nh5 cxd4 Ng5 Bxg5 Qg4 Nxe5 Qg3 Nfg6 Bxg5 Qb6 Bxg6 Nxg6 Nf4 Nxf4 Qxf4 dxc3 bxc3 Bb7 Qg3 Rac8 Bh6 g6 Bg5 Rc7 Qh3 Rec8'.split(' ');
    const line = blunderCheck(at(sans), 'Qh6', 'Rxc3', 300) ?? '';
    expect(line).toMatch(/Here the answer was …Rxc3, taking your pawn on c3\.$/);
    expect(line).not.toMatch(/answer was your pawn/);
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

describe('the blunder check reads the check too, and is asked again (Learn audit 2026-10-15)', () => {
  // Fool's mate: 2.g4?? Qh4# — the answer is a check, not a capture.
  const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2';
  it('a costly move answered by a check earns the habit', () => {
    const line = blunderCheck(FEN, 'g4', 'Qh4#', 2000);
    expect(line).toContain('run CCT for them');
    expect(line).toContain('their check, …Qh4#');
  });
  it('after the first time, a short callback — never silence', () => {
    const line = blunderCheck(FEN, 'g4', 'Qh4#', 2000, true);
    expect(line).not.toContain('run CCT for them — what checks');
    expect(line).toContain('…Qh4#');
  });
});
