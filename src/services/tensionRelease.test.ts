import { describe, expect, it } from 'vitest';
import { tensionKept, tensionReleased, type TensionLine } from './tensionRelease';

// Real Danya boards with the engine lines from audit-reports/danya-havecheck/board-facts-2026-11-19.jsonl.
const L = (moves: string[], cp: number): TensionLine => ({ moves, cp, mate: null });

// Spassky (weak-squares-who-cares#4): the engine wants f4; axb5 axb5 hands Black's a8 rook the a-file.
const SPASSKY = 'r3rq2/1b3pbk/p2p1np1/1pnPp1Bp/P1p1P3/2P2PNP/1PBQ2PN/R4RK1 w - - 0 24';
const SPASSKY_LINES = [L(['f3f4', 'f6d7'], 219), L(['a4b5', 'a6b5'], 95), L(['f1f2', 'f6d7'], 81)];
// His own game (the-art-of-setting-traps#0): "31.Nxe7+ Rxe7 ... promise no relief" — the piece trade he rejects.
const TRAPS = '1r2r3/2p1b3/p1k5/2PN1p1p/6pP/PPR1BnK1/5P2/7R w - - 0 31';
const TRAPS_LINES = [L(['d5b4', 'c6b7'], 0), L(['c3d3', 'f3e5'], -121), L(['d5e7', 'e8e7'], -122)];
// Negative controls where taking IS right: Anand's gxh5 (how-to-ruin-your-pawn-structure#1)
// and 21.Nxa6, his "change the material balance" (how-to-win-equal-positions#0).
const ANAND = '1r2k2r/4bp2/p2pbp2/1p2p2p/4P1P1/P3BP2/1PPR3P/1K3B1R w k - 0 18';
const ANAND_LINES = [L(['g4h5', 'h8h5'], -23), L(['f1e2', 'h5g4'], -49), L(['f3f4', 'h5g4'], -74)];
const NXA6 = '5rk1/2p1q1p1/brn1p2p/p1Np1p2/P2P1P2/Q1P3P1/4P1BP/R4RK1 w - - 0 21';
const NXA6_LINES = [L(['c5a6', 'b6a6'], 11), L(['a3c1', 'a6c4'], 2), L(['f1b1', 'a6c4'], -30)];

describe('tensionKept', () => {
  it('pawn tension: axb5 axb5 opens the a-file for the a8 rook', () => {
    const r = tensionKept(SPASSKY, SPASSKY_LINES);
    expect(r?.capture).toBe('axb5');
    expect(r?.recapture).toBe('axb5');
    expect(r?.gapCp).toBe(124);
    expect(r?.gains.map((g) => g.kind)).toContain('opens-file');
    expect(r?.text).toContain('opens the a-file for their rook on a8');
  });
  it('piece tension: the knight trade on e7 the engine rates 122cp worse', () => {
    const r = tensionKept(TRAPS, TRAPS_LINES);
    expect(r?.capture).toBe('Nxe7+');
    expect(r?.recapture).toBe('Rxe7');
    expect(r?.gapCp).toBe(122);
  });
  it('stays silent where the engine\'s best is the capture', () => {
    expect(tensionKept(ANAND, ANAND_LINES)).toBeNull();
    expect(tensionKept(NXA6, NXA6_LINES)).toBeNull();
  });
  it('never claims a capture the engine lines do not hold', () => {
    expect(tensionKept(SPASSKY, [SPASSKY_LINES[0], SPASSKY_LINES[2]])).toBeNull();
  });
});

describe('tensionReleased', () => {
  it('says what releasing gave them after the student took', () => {
    const r = tensionReleased(SPASSKY, 'axb5', SPASSKY_LINES, null, 'axb5');
    expect(r?.gapCp).toBe(124);
    expect(r?.text).toContain('Taking on b5 released the tension too early');
    expect(r?.text).toContain('f4 kept it');
  });
  it('uses the caller\'s own value for the played move', () => {
    expect(tensionReleased(SPASSKY, 'axb5', SPASSKY_LINES, 190, 'axb5')).toBeNull();
  });
  it('stays silent on a quiet move and where the capture was best', () => {
    expect(tensionReleased(SPASSKY, 'Rf2', SPASSKY_LINES, null, null)).toBeNull();
    expect(tensionReleased(ANAND, 'gxh5', ANAND_LINES, null, 'Rxh5')).toBeNull();
  });
});
