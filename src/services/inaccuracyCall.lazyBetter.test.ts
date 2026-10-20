// THE BETTER MOVE'S REASONS ARE READ ONLY WHERE THEY ARE SAID (OS-18, 14.Rd5 on
// David's record, 2026-10-20). Learn names no better move unasked, yet every
// verdict worked out why the better move was better — twice — and dropped it:
// ~0.6 s of main thread in front of the verdict.
import { describe, it, expect, vi } from 'vitest';

const planReads: Array<readonly string[]> = [];
vi.mock('./lookaheadPlan', async (importOriginal) => {
  const orig = await importOriginal<typeof import('./lookaheadPlan')>();
  return {
    ...orig,
    planFromUci: (...a: Parameters<typeof orig.planFromUci>) => { planReads.push(a[1]); return orig.planFromUci(...a); },
  };
});

const { callInaccuracyDetailed } = await import('./inaccuracyCall');

const BEFORE = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
const BEST_PV = ['e4e5', 'g7e5', 'f4e5', 'g4e5', 'g5h7', 'f8h8', 'c3b5', 'a5b6', 'h7g5', 'e8f8', 'e1e3', 'c8d7'];
const REPLY_PV = ['g7c3', 'd5a5', 'c3e1', 'f4g3', 'c6a5', 'b3c2', 'a5c6', 'c2c4', 'g4f6'];
const call = (namesBetterMove: boolean) => callInaccuracyDetailed({
  fenBefore: BEFORE, playedSan: 'Rd5', bestSan: 'e5', bestLineUci: BEST_PV, cpLoss: 185,
  moverEvalAfterCp: -30, scores: { bestWhiteCp: 155, playedWhiteCp: -30 }, side: 'student', moverColor: 'white',
  replyLineUci: REPLY_PV, replySan: 'Bxc3', priorMove: { fenBefore: 'r1b1kr2/pp2p1bp/2np1np1/q5N1/4PB2/1QN5/PP3PPP/3RR1K1 b - - 9 13', san: 'Ng4' },
  namesBetterMove,
});
const bestLineReads = (): number => planReads.filter((l) => l[0] === BEST_PV[0]).length;

describe('the better move\'s reasons are read only where they are said', () => {
  it('a surface that withholds the better move never works out why it was better', () => {
    planReads.length = 0;
    call(false);
    expect(bestLineReads()).toBe(0);
  });
  it('a surface that names it still does', () => {
    planReads.length = 0;
    call(true);
    expect(bestLineReads()).toBeGreaterThan(0);
  });
});
