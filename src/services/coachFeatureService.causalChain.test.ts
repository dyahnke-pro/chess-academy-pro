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

  it('the Nxe4 segment carries lead-the-eye arrows (attackers → g5)', () => {
    const segs = buildReviewSegments(buildMoves(), 'black', null, false, 900);
    const nxe4 = segs.find((s) => s.san === 'Nxe4');
    const arrows = nxe4!.planArrows ?? [];
    const toG5 = arrows.filter((a) => a.endSquare === 'g5').map((a) => a.startSquare).sort();
    expect(toG5).toEqual(['e4', 'e7']);
  });

  it('non-tactic moves do NOT get a causal-chain lead', () => {
    const segs = buildReviewSegments(buildMoves(), 'black', null, false, 900);
    const d6 = segs.find((s) => s.san === 'd6');
    expect(d6?.narration ?? '').not.toMatch(/discovered double attack/i);
  });
});

describe('buildReviewSegments — BOTH WAYS wired into the walk', () => {
  function mk(sans: string[]): ReviewMoveInput[] {
    const c = new Chess(); const out: ReviewMoveInput[] = [];
    sans.forEach((san, i) => { c.move(san); out.push({ ply: i + 1, san, isCoachMove: false, classification: null, evaluation: null, preMoveEval: null, bestMove: null, fenAfter: c.fen() }); });
    return out;
  }
  it('MISSED: the Qc5 segment says the student could have won with Qxa8+', () => {
    const MISSED = ['d4', 'd5', 'c4', 'Nf6', 'cxd5', 'Nxd5', 'e4', 'Nb4', 'Qa4+', 'N8c6', 'd5', 'e6', 'dxc6', 'Nxc6', 'Bb5', 'Bb4+', 'Qxb4', 'a5', 'Bxc6+', 'bxc6', 'Qc4', 'Ba6', 'Qxc6+', 'Qd7', 'Qc5'];
    const segs = buildReviewSegments(mk(MISSED), 'white', null, false, 1378);
    const seg = segs.find((s) => s.san === 'Qc5');
    const t = seg?.narration ?? '';
    expect(t).toMatch(/could have won the rook on a8 with Qxa8\+/i);
    expect(t).toMatch(/played Qc5 instead/i);
    expect(t.toLowerCase()).not.toMatch(/\b(we|our|us)\b/);
  });
  it('ALLOWED: the Qxb3 segment warns of Bxc6 and gives the avoidance', () => {
    const ALLOWED = ['e4', 'c5', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'e6', 'O-O', 'Ne7', 'd3', 'O-O', 'Nc3', 'Nbc6', 'Ne2', 'a6', 'c3', 'b5', 'Bb3', 'a5', 'a4', 'Ba6', 'e5', 'bxa4', 'Rxa4', 'Bb5', 'Re4', 'd5', 'exd6', 'Nf5', 'Ng3', 'Nxd6', 'Ree1', 'Qb6', 'Kh1', 'Rad8', 'c4', 'Ba6', 'Ba4', 'Nxc4', 'Qb3', 'Qxb3'];
    const segs = buildReviewSegments(mk(ALLOWED), 'black', null, false, 1378);
    const seg = segs.find((s) => s.san === 'Qxb3');
    const t = seg?.narration ?? '';
    expect(t).toMatch(/can win the knight on c6 with Bxc6/i);
    expect(t).toMatch(/Rde8 would have avoided it/i);
  }, 30000); // a full 42-ply review build is heavy in the test env; the causal
             // finders themselves are ~0.2s (measured), the rest is the pipeline.
});
