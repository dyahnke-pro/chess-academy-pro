import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';

// Clean-pass review walk 2026-10-04, G2 (lichess VRUh4Qgh) 27…Rfe8: "You had it
// won and rushed — this move throws away about 2 points of your edge … You:
// that was an inaccuracy, costing about 1.0 points." The verdict spoke the
// one-search cost; the fundamental subtracted two evals from different searches.
const PGN = readFileSync('src/services/__fixtures__/VRUh4Qgh.pgn', 'utf8');

function inputs(costCp: number | null, bestMoveEval?: number): ReviewMoveInput[] {
  const g = new Chess(); g.loadPgn(PGN);
  const sans = g.history().slice(0, 54);
  const c = new Chess();
  return sans.map((san, i) => {
    c.move(san);
    const here = i === 53;
    // White-POV: Black +3.0 before, the sweep read +0.8 after (a 2.2 gap),
    // but the settled one-search cost of Rfe8 against Kh8 is 1.0.
    return {
      ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0,
      classification: here ? 'inaccuracy' : 'good',
      preMoveEval: here ? -300 : 0, evaluation: here ? -80 : 0,
      ...(here && costCp !== null ? { costCp } : {}),
      ...(here && bestMoveEval !== undefined ? { bestMoveEval } : {}),
      bestMove: here ? 'g8h8' : null,
    } as unknown as ReviewMoveInput;
  });
}

describe('one move, one cost', { timeout: 120_000 }, () => {
  it('the defect is real: read off the two evals, it says "about 2 points"', () => {
    const segs = buildReviewSegments(inputs(null), 'black', null, true, 1800, [], undefined, 'g');
    expect(segs[53].narration ?? '').toMatch(/about two pawns of your edge/);
  });
  it('with the recorded cost (1.0) the move left +2.0 — no "rushed the win", one figure only', () => {
    const segs = buildReviewSegments(inputs(100, -300), 'black', null, true, 1800, [], undefined, 'g');
    const text = segs[53].narration ?? '';
    expect(text).not.toMatch(/of your edge/);
    expect(text).toMatch(/costing about a pawn/);
  });
  it('a cost is never subtracted from a read of another search', () => {
    // Shallow read before: Black +3.0. The one search: best +6.0, this move
    // 2.5 below it (+3.5 — still winning). Old feed: 3.0 − 2.5 = +0.5 → "rushed".
    const mixed = inputs(250, -600).map((x, i) => (i === 53 ? { ...x, preMoveEval: -300 } : x));
    const segs = buildReviewSegments(mixed, 'black', null, true, 1800, [], undefined, 'g');
    expect(segs[53].narration ?? '').not.toMatch(/of your edge|winning position/);
  });
});
