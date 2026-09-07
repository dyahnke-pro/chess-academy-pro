import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

// A WIRE THAT DOES NOT FIRE IS NOT A WIRE (David 2026-08-07). This proves the
// causal chain comes OUT of the review walk for David's real game — not that a
// function was called.
const SANS = ['e4', 'c5', 'Bc4', 'd6', 'Qh5', 'e6', 'd3', 'Nf6', 'Qf3', 'a6', 'Bg5', 'Be7', 'Nd2', 'Qa5', 'Nge2', 'Nxe4'];

function buildMoves(): ReviewMoveInput[] {
  const c = new Chess();
  const out: ReviewMoveInput[] = [];
  SANS.forEach((san, i) => {
    c.move(san);
    out.push({
      ply: i + 1, san, isCoachMove: false,
      classification: san === 'Nxe4' ? 'great' : null,
      evaluation: null, preMoveEval: null, bestMove: null,
      fenAfter: c.fen(),
    });
  });
  return out;
}

describe('buildReviewSegments — causal chain is wired into the review walk', () => {
  it('the Nxe4 segment LEADS with the cross-move causal chain (beginner rating)', () => {
    const segs = buildReviewSegments(buildMoves(), 'black', null, false, 900);
    const nxe4 = segs.find((s) => s.san === 'Nxe4');
    expect(nxe4).toBeDefined();
    const text = nxe4!.narration ?? '';
    expect(text).toMatch(/their queen came out early to f3/i);
    expect(text).toMatch(/bishop on g5 with nothing defending it/i);
    expect(text).toMatch(/discovered double attack on the bishop on g5/i);
    // perspective contract — never we/our/us
    expect(text.toLowerCase()).not.toMatch(/\b(we|our|us)\b/);
    // the chain LEADS the beat
    expect(text.trimStart().toLowerCase().startsWith('their queen came out early')).toBe(true);
  });

  it('advanced rating compresses the chain to one line on the tactic move', () => {
    const segs = buildReviewSegments(buildMoves(), 'black', null, false, 2200);
    const nxe4 = segs.find((s) => s.san === 'Nxe4');
    expect(nxe4!.narration ?? '').toMatch(/early queen on f3 left the bishop on g5 loose/i);
  });

  it('non-tactic moves do NOT get a causal-chain lead', () => {
    const segs = buildReviewSegments(buildMoves(), 'black', null, false, 900);
    const d6 = segs.find((s) => s.san === 'd6');
    expect(d6?.narration ?? '').not.toMatch(/discovered double attack/i);
  });
});
