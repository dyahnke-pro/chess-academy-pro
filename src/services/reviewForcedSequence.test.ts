import { describe, it, expect } from 'vitest';
import { detectForcedMatingSequence, explainMatingSacMechanism } from './reviewForcedSequence';

const OPERA_SANS = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];

describe('detectForcedMatingSequence (David 2026-07-20 — teach the forced finish)', () => {
  it('finds the Opera Game forced run (Bxd7+ … Rd8#)', () => {
    const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5', 'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'];
    const run = detectForcedMatingSequence(OPERA);
    expect(run).not.toBeNull();
    expect(run?.startPly).toBe(29); // 15.Bxd7+
    expect(run?.length).toBe(5);    // Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#
  });

  it('returns null when the game does not end in mate', () => {
    expect(detectForcedMatingSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'])).toBeNull();
  });

  it('returns null for a one-move mate (not a sequence to frame)', () => {
    // Scholar's mate: only the final move is forcing → run length < 3.
    const scholars = ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'];
    expect(detectForcedMatingSequence(scholars)).toBeNull();
  });

  it('does not crash on an illegal SAN (returns null)', () => {
    expect(detectForcedMatingSequence(['e4', 'NOPE#'])).toBeNull();
  });
});

describe('explainMatingSacMechanism (David 2026-07-20 — the WHY behind the sac)', () => {
  it('explains the Opera queen sac clearing the d-file (Qb8+ deflects the d7 knight)', () => {
    // 16.Qb8+ is index 30 (0-based); Nxb8 recaptures off d7, Rd8# crashes down the d-file.
    const clause = explainMatingSacMechanism(OPERA_SANS, 30);
    expect(clause).not.toBeNull();
    expect(clause).toMatch(/knight off d7/i);
    expect(clause).toMatch(/d-file/i);
    expect(clause).toMatch(/rook crashes down to d8/i);
    expect(clause).toMatch(/mate/i);
  });

  it('returns null when the sac is not followed by a mate within a few plies', () => {
    // 13.Rxd7 (index 24) is an exchange sac, but mate is 8 plies away → no direct mechanism.
    expect(explainMatingSacMechanism(OPERA_SANS, 24)).toBeNull();
  });

  it('returns null for a non-clearance move', () => {
    expect(explainMatingSacMechanism(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'], 5)).toBeNull();
  });
});
