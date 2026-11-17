// Real boards from his speedruns (S4): the move that took castling away.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { castlingTakenAway } from './castlingTakenAway';
import { readBoardAll } from './boardComputers';

const before = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('castlingTakenAway', () => {
  it('Ytkf3 6.f3: White opens the c5 bishop\'s road to g1 and loses short castling', () => {
    const fen = before(['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Nxc6', 'Qf6']);
    const r = castlingTakenAway(fen, 'f3', 'b');
    expect(r?.denied).toBe('w');
    expect(r?.ownGoal).toBe(true);
    expect(r?.squares).toEqual(['c5', 'g1']);
    expect(r?.text).toMatch(/bishop on c5/);
    expect(r?.text).toMatch(/can't castle short/);
    // From White's seat it is the student's own move, said without naming it.
    const w = castlingTakenAway(fen, 'f3', 'w');
    expect(w?.text).toMatch(/you can't castle short|You can't castle short/);
    expect(w?.text).not.toMatch(/\bf3\b/);
  });

  it('hv0P9 10.Bxb4: the bishop on b4 covers f8, so Black cannot castle short', () => {
    const fen = before(['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Nc3', 'Bb4', 'Rb1', 'Qa3', 'Nd5', 'Qa5', 'Nxb4', 'Nxb4']);
    const r = castlingTakenAway(fen, 'Bxb4', 'w');
    expect(r?.text).toMatch(/Your bishop on b4/);
    expect(r?.text).toMatch(/they can't castle short|They can't castle short/);
    // Through the registry, seated by the mover.
    const f = readBoardAll('castlingTaken', { fenBefore: fen, san: 'Bxb4', student: 'w' }).at(0);
    expect(f?.seat).toBe('student');
    expect(f?.kind).toBe('king-read');
  });

  it('negative control: the same game a move earlier — Nxb4 covers nothing the king crosses', () => {
    const fen = before(['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Nc3', 'Bb4', 'Rb1', 'Qa3', 'Nd5', 'Qa5']);
    expect(castlingTakenAway(fen, 'Nxb4', 'w')).toBeNull();
  });

  it('negative control: a covered square with a piece on it is an attack on that piece, not a castling claim', () => {
    // aEKSPF 6.Bg4: the bishop hits c8, where Black's own bishop stands.
    const fen = before(['e3', 'e5', 'Nc3', 'd5', 'd4', 'e4', 'Bb5+', 'c6', 'Be2', 'Bd6']);
    expect(castlingTakenAway(fen, 'Bg4', 'b')).toBeNull();
  });
});
