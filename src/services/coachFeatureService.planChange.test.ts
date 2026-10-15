// David 2026-09-25: "If the structure plan changes then coach should say so."
// Review states each plan goal once; a NEW goal after one the student already
// heard is framed as the change. Real game: the KID hand walk (2000, Black).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, PLAN_HOLD_PLIES, type ReviewMoveInput } from './coachFeatureService';

const SANS = 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 c6 Kh1 Nh5 Be3 f5 Qd2 f4 Bf2 Be5 Nc2 Ng3+ Kg1 Qh4 Bd4 Nxf1 Bxf1 Be6 Bxe5 dxe5 Qd6 Nd7 Qc7 Qd8 Qxd8 Raxd8 Kf2 Nc5 Rd1 a5 Rxd8 Rxd8 Ke1 Kf7 Be2 g5 h3 h5 b3 Kf6 Nd1 g4 hxg4 hxg4 Nf2 g3 Nd1 Rh8'.split(' ');

describe('review says when the plan changes', () => {
  it('the first plan is stated plainly; a later, different one as a change', () => {
    const c = new Chess();
    const inputs = SANS.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const segs = buildReviewSegments(inputs, 'black', "King's Indian Defense", true, 2000);
    const plans = segs.filter((s) => /the plan (from here is|changes here)/i.test(s.narration ?? ''));
    expect(plans.length, 'fixture must state at least two plans').toBeGreaterThanOrEqual(2);
    expect(plans[0].narration).toMatch(/the plan from here is to/i);
    expect(plans[0].narration).not.toMatch(/plan changes here/);
    expect(plans.slice(1).every((s) => /The plan changes here/.test(s.narration ?? ''))).toBe(true);
    // A plan is a thread (unity U5, walk #23): two plans are never stated
    // closer together than the hold.
    for (let i = 1; i < plans.length; i++) expect(plans[i].ply - plans[i - 1].ply).toBeGreaterThanOrEqual(PLAN_HOLD_PLIES);
  }, 120000);
});

// Review tape 2026-10-15 (David's Alapin, Black): one turn said "The plan
// changes here — now it's to get your passed pawn on a7 promoting … The plan
// from here is to make your knight on d4 the boss", and the next turn changed
// it again to the bishop on b4 while the passed pawn still ran. A plan is a
// thread: ONE per turn, and none while the one stated still stands.
const ALAPIN = 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6 Nc3 Nb6 Nf3 d6 exd6 Qxd6 Be2 Bg4 Nb5 Qd7 Bf4 Nd5 Ne5 Bxe2 Qxe2 Nxf4 Nxd7 Nxe2 Nc7+ Kxd7 Nxa8 Nexd4 Rd1 e5 a3 Bc5 b4 Nxb4 axb4 Bxb4+ Kf1 Rxa8 Rb1 a5 h4 Rc8'.split(' ');
describe('a plan is a thread on review', () => {
  it('never two plans in one turn, never a change while the plan stands', () => {
    const c = new Chess();
    const inputs = ALAPIN.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const segs = buildReviewSegments(inputs, 'black', 'Sicilian Defense: Alapin Variation', true, 1500);
    const PLAN = /the plan (from here is|changes here)|The new plan is/gi;
    for (const s of segs) expect((s.narration ?? '').match(PLAN)?.length ?? 0, s.narration ?? '').toBeLessThanOrEqual(1);
    const plans = segs.filter((s) => PLAN.test(s.narration ?? ''));
    for (let i = 1; i < plans.length; i++) expect(plans[i].ply - plans[i - 1].ply).toBeGreaterThanOrEqual(PLAN_HOLD_PLIES);
  }, 120000);
});
