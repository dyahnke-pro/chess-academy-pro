import { describe, expect, it } from 'vitest';
import { breakDueNow, breakPrep, breakPrepLine, breakStopped, breakStoppedLine } from './breakTiming';
import { readBoardAll } from './boardComputers';

// Danya's article boards (reference only, never quoted); every line below is
// Stockfish 18's, depth 18.
// "Positional combinations": Ne1 clears f3, and the engine's line plays f3
// against the g4 pawn two moves later.
const NE1 = '6k1/2Rn1r2/pp3p2/3p3p/3P2pP/5N2/PP3PP1/5K2 w - - 0 30';
const NE1_AFTER = 'f6f5 e1d3 f5f4 f2f3 g4f3 g2f3 d7f8 c7c6'.split(' ');
// "Never trust your opponent": a4 fixes the queenside — …b5 then loses
// (engine: −4.64 for Black after …b5).
const A4 = '6rr/1k3p2/1pb1p1np/p1p1P2R/2P3R1/2P1B3/P1B2PP1/2K5 w - - 0 26';
// "Rooks on the seventh revisited": Bf7 — …g6 now runs into mate.
const BF7 = '5r1k/R2R2p1/7p/p4prP/2B5/5K2/8/8 w - - 0 36';
// "Queen, the supporting actress": h5 is the engine's best, a break at g6.
const H5 = 'r2q1r1k/1pp1p1bp/pn4p1/3nPbN1/3P3P/Q1N1B3/PP2BP2/2KR3R w - - 0 20';

describe('breakPrep', () => {
  it('Ne1 clears f3 for the f3 break the engine plays next', () => {
    const p = breakPrep(NE1, 'Ne1', NE1_AFTER);
    expect(p?.reason).toBe('clears-square');
    expect(p?.brk.san).toBe('f3');
    expect(p?.between).toBe(1);
    expect(breakPrepLine(p!, NE1, 'your')).toMatch(/The knight stood on f3, the square the pawn needs\./);
  });

  it('says nothing without the engine line that plays the break', () => {
    expect(breakPrep(NE1, 'Ne1', [])).toBeNull();
    expect(breakPrep(NE1, 'Ne1', ['f6f5', 'e1d3'])).toBeNull();
  });

  it('the registry holds it for a move the engine refutes', () => {
    expect(readBoardAll('breakPrep', { fenBefore: NE1, san: 'Ne1', student: 'w', lineAfter: NE1_AFTER, costCp: 0 })).toHaveLength(1);
    expect(readBoardAll('breakPrep', { fenBefore: NE1, san: 'Ne1', student: 'w', lineAfter: NE1_AFTER, costCp: 200 })).toHaveLength(0);
  });
});

describe('breakStopped', () => {
  it('a4 takes …b5 away: the pawn would just drop', () => {
    const s = breakStopped(A4, 'a4');
    expect(s?.brk.san).toBe('b5');
    expect(s?.how).toBe('drops-pawn');
    expect(breakStoppedLine(s!, A4, 'your')).toMatch(/…b5 break.*The pawn would just be lost there now\./);
  });

  it('Bf7 takes …g6 away', () => {
    expect(breakStopped(BF7, 'Bf7')?.brk.san).toBe('g6');
  });

  it('a king step on the other wing stops nothing', () => {
    expect(breakStopped(A4, 'Kd1')).toBeNull();
  });
});

describe('breakDueNow', () => {
  it('h5 is the engine\'s best and a break with a reason', () => {
    const d = breakDueNow(H5, 'w', 'h4h5');
    expect(d?.text).toMatch(/h5 attacks their pawn on g6/);
  });

  it('a best move that is no break says nothing', () => {
    expect(breakDueNow(H5, 'w', 'a3a4')).toBeNull();
    expect(breakDueNow(H5, 'w', null)).toBeNull();
  });
});
