// David 2026-09-25: "If the structure plan changes then coach should say so."
// Review states each plan goal once; a NEW goal after one the student already
// heard is framed as the change. Real game: the KID hand walk (2000, Black).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

const SANS = 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3 c6 Kh1 Nh5 Be3 f5 Qd2 f4 Bf2 Be5 Nc2 Ng3+ Kg1 Qh4 Bd4 Nxf1 Bxf1 Be6 Bxe5 dxe5 Qd6 Nd7 Qc7 Qd8 Qxd8 Raxd8 Kf2 Nc5 Rd1 a5 Rxd8 Rxd8 Ke1 Kf7 Be2 g5 h3 h5 b3 Kf6 Nd1 g4 hxg4 hxg4 Nf2 g3 Nd1 Rh8'.split(' ');

describe('review says when the plan changes', () => {
  it('the first plan is stated plainly; a later, different one as a change', () => {
    const c = new Chess();
    const inputs = SANS.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'good', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const segs = buildReviewSegments(inputs, 'black', "King's Indian Defense", true, 2000);
    const plans = segs.filter((s) => /The plan (from here is|changes here)/.test(s.narration ?? ''));
    expect(plans.length, 'fixture must state at least two plans').toBeGreaterThanOrEqual(2);
    expect(plans[0].narration).toMatch(/The plan from here is to/);
    expect(plans[0].narration).not.toMatch(/plan changes here/);
    expect(plans.slice(1).every((s) => /The plan changes here/.test(s.narration ?? ''))).toBe(true);
  }, 120000);
});
