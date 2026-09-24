import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { threatStoppedBy } from './opponentMovePurpose';

function fens(moves: string[]): string[] {
  const c = new Chess();
  const out = [c.fen()];
  for (const m of moves) { c.move(m); out.push(c.fen()); }
  return out;
}

describe('threatStoppedBy — why did they play that?', () => {
  // 1.e4 e5 2.Bc4 Nc6 3.Qh5 — White threatens Qxf7#; 3…g6 stops it.
  const f = fens(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5']);
  it('names the threat the reply stopped', () => {
    const r = threatStoppedBy(f[4], f[5], 'g6', 'w');
    expect(r).not.toBeNull();
    expect(r!.threat.san).toMatch(/^Qxf7#?$/);
    expect(r!.text).toMatch(/^g6 has a point: it stops your Qxf7/);
  });

  it('NEGATIVE CONTROL: a reply that leaves the threat on stops nothing', () => {
    expect(threatStoppedBy(f[4], f[5], 'a6', 'w')).toBeNull();
  });

  it('NEGATIVE CONTROL: a pawn grab below the detector bar is no threat, so nothing was stopped', () => {
    const g = fens(['e4', 'e5', 'Nf3']);
    expect(threatStoppedBy(g[2], g[3], 'Nc6', 'w')).toBeNull();
  });
});
