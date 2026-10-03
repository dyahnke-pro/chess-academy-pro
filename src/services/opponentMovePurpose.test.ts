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
    expect(r!.text).toMatch(/^Their …g6 has a point: it stops the mate with Qxf7\.$/);
  });

  it('NEGATIVE CONTROL: a reply that leaves the threat on stops nothing', () => {
    expect(threatStoppedBy(f[4], f[5], 'a6', 'w')).toBeNull();
  });

  it('NEGATIVE CONTROL: a pawn grab below the detector bar is no threat, so nothing was stopped', () => {
    const g = fens(['e4', 'e5', 'Nf3']);
    expect(threatStoppedBy(g[2], g[3], 'Nc6', 'w')).toBeNull();
  });
});

describe('a take-back has no other point (Learn walk 2026-10-01, game 2 ply 45)', () => {
  it('Qxc7 Rxc7 is never "it stops your Qxd8 fork"', () => {
    const before = '3r2k1/2q1rpp1/p1p1pn1p/1p2Q3/3P4/P4N1P/1PP2PP1/3RR1K1 w - - 3 23';
    const after = '3r2k1/2Q1rpp1/p1p1pn1p/1p6/3P4/P4N1P/1PP2PP1/3RR1K1 b - - 0 23';
    expect(threatStoppedBy(before, after, 'Rxc7', 'w')).toBeNull();
  });
});

describe('a fork whose capture still wins was not stopped (review walk oct3b g1 ply 30)', () => {
  // 15.d6 O-O: Qxe7 no longer checks the king, but Qxe7 Qxe7 dxe7 still wins
  // the bishop — "it stops your Qxe7 fork" told the student their threat was gone.
  const before = 'r3k2r/pq2bppp/1p3n2/2pPQ3/8/2P3P1/PP3P1P/RNB1R1K1 w kq c6 0 15';
  const after = 'r3k2r/pq2bppp/1p1P1n2/2p1Q3/8/2P3P1/PP3P1P/RNB1R1K1 b kq - 0 15';
  it('…O-O is not "it stops your Qxe7 fork"', () => {
    expect(threatStoppedBy(before, after, 'O-O', 'w')).toBeNull();
  });
  it('POSITIVE CONTROL: a capturing fork whose capture stops paying is stopped', () => {
    // Nb5 threatens Nxc7+ (king and rook); …Kd8 guards c7, so the knight
    // would just be taken — that reply DID take the sting out.
    const b = 'r3k3/2p5/8/8/8/2N5/8/6K1 w - - 0 1';
    const a = 'r3k3/2p5/8/1N6/8/8/8/6K1 b - - 1 1';
    expect(threatStoppedBy(b, a, 'Kd8', 'w')?.text).toMatch(/stops your Nxc7 fork/);
  });
});
