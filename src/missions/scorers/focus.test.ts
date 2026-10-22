import { describe, expect, it } from 'vitest';
import { scoreCandidates, type ScoringContext } from '../moveScoring';
import { focusScore, isGift, posesDefendSeat } from './focus';
import type { FocusId } from '../../coach/focus/focusCard';

// The coach (Black here) steers toward boards that POSE the focus's defend
// seat to the user (White) — never a gift, never outside its window.

/** …d5 hits the undefended knight on e4. */
const KNIGHT_TARGET = '4k3/3p4/8/8/4N3/8/8/4K3 b - - 0 1';
/** …Nf2 lands on a fork of the queen and the rook, and nothing takes it. */
const FORK_SET = '4k3/8/8/8/6n1/8/8/K2Q3R b - - 0 1';
/** …Qg5 brings the queen onto the g-file in front of the castled king. */
const KING_SIDE = '4k3/8/8/q7/8/8/5PPP/6K1 b - - 0 1';
/** …Nd4 walks the knight into the c3 pawn: a gift. */
const GIFT = '4k3/8/2n5/8/8/2P5/8/4K3 b - - 0 1';

const ctx = (fen: string, focus: FocusId | null, windowCp = 100): ScoringContext => ({
  fen, coach: 'b', windowCp, coachEvalCp: 0, pattern: null, phase: 'middlegame', bossId: null, targets: [], focus,
});

describe('posesDefendSeat — the defend question the coach can set without a gift', () => {
  it.each([
    ['loose-pieces', KNIGHT_TARGET, 'd7d5', true],
    ['loose-pieces', KNIGHT_TARGET, 'e8e7', false],
    ['tactics', FORK_SET, 'g4f2', true],
    ['tactics', FORK_SET, 'g4e5', false],
    ['kings', KING_SIDE, 'a5g5', true],
    ['kings', KING_SIDE, 'a5a4', false],
  ] as const)('%s: %s %s → %s', (focus, fen, uci, poses) => {
    expect(posesDefendSeat(focus, fen, uci, 'b')).toBe(poses);
  });
});

describe('no gift, ever', () => {
  it('a steer toward a motif that wins nothing is no tactics question (prod tactics game 1, 19…Ke7)', () => {
    const fen = '1rbq3r/pp4p1/2nkp2p/8/3n4/P1N1Q3/1P3PPP/R2R2K1 b - - 1 19';
    expect(posesDefendSeat('tactics', fen, 'd6e7', 'b')).toBe(false);
  });
  it('an even trade is not a gift (the coach takes a rook and is taken back)', () => {
    // Black (the coach) plays …Rxd1+ and the king takes back: rook for rook.
    const fen = '3r2k1/5ppp/8/8/8/8/5PPP/3RK3 b - - 0 1';
    expect(isGift(fen, 'd8d1', 'b')).toBe(false);
  });
  it('a move that leaves a coach piece to be won is a gift and scores −1', () => {
    expect(isGift(GIFT, 'c6d4', 'b')).toBe(true);
    expect(focusScore({ uci: 'c6d4', cpLoss: 0 }, ctx(GIFT, 'loose-pieces'))).toBe(-1);
    expect(isGift(GIFT, 'c6e5', 'b')).toBe(false);
  });
});

describe('scoreCandidates with the focus weight', () => {
  it('inside the window, the move that poses the question is preferred over a cheaper quiet one', () => {
    const ranked = scoreCandidates([{ uci: 'e8e7', cpLoss: 0 }, { uci: 'd7d5', cpLoss: 40 }], ctx(KNIGHT_TARGET, 'loose-pieces'), { focus: 1 });
    expect(ranked[0].uci).toBe('d7d5');
  });
  it('outside the window it is never played — the coach keeps its level', () => {
    const ranked = scoreCandidates([{ uci: 'e8e7', cpLoss: 0 }, { uci: 'd7d5', cpLoss: 140 }], ctx(KNIGHT_TARGET, 'loose-pieces'), { focus: 1 });
    expect(ranked.map((c) => c.uci)).toEqual(['e8e7']);
  });
  it('off a focus game the scorer reads nothing', () => {
    expect(focusScore({ uci: 'd7d5', cpLoss: 0 }, ctx(KNIGHT_TARGET, null))).toBe(0);
  });
});
