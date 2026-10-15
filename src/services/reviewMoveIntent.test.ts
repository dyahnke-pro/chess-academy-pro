import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { intentsFromReads } from './reviewMoveIntent';
import type { CachedEval } from './positionEvalCache';

const game = (sans: string[]): { ply: number; san: string; fenAfter: string }[] => {
  const c = new Chess();
  return sans.map((san, i) => { const m = c.move(san); return { ply: i + 1, san: m.san, fenAfter: c.fen() }; });
};

describe('review asks the engine what a clean move was FOR (audits 2026-10-15)', () => {
  const moves = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']);
  const reads = new Map<number, CachedEval>([
    [4, { evaluation: 30, depth: 18, bestMove: 'f1c4', pv: ['f1c4', 'g8f6', 'e1g1'] }],
    [5, { evaluation: 30, depth: 18, bestMove: 'g8f6', pv: ['g8f6', 'e1g1', 'f8c5'] }],
  ]);
  it('Bc4 clears the way to castle — the follow-up the engine plays', () => {
    const out = intentsFromReads(moves, 'white', reads);
    expect(out.get(5)?.text).toMatch(/castle/);
  });
  it('never on the opponent\'s move, and never without a stored line', () => {
    const out = intentsFromReads(moves, 'black', reads);
    expect(out.size).toBe(0);
    expect(intentsFromReads(moves, 'white', new Map()).size).toBe(0);
  });
});

describe('the intent reaches the review narration', () => {
  it('a clean student move speaks what it is for', { timeout: 60_000 }, async () => {
    const { buildReviewSegments } = await import('./coachFeatureService');
    const moves = game(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
    const inputs = moves.map((m) => ({
      ply: m.ply, san: m.san, isCoachMove: m.ply % 2 === 0, classification: 'good' as const,
      evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: m.fenAfter,
    }));
    const intent = new Map([[5, { text: 'Bc4 clears the way to castle.', squares: ['c4', 'e1', 'g1'] }]]);
    const segs = buildReviewSegments(inputs, 'white', null, true, 1500, [], undefined, null, new Map(), intent);
    const said = segs.find((s) => s.ply === 5)?.narration ?? '';
    expect(said).toContain('clears the way to castle');
    // The reason leads; the description that supports it follows.
    const desc = said.indexOf('joins the fight');
    expect(desc).toBeGreaterThan(said.indexOf('clears the way to castle'));
  });
});

describe('development is a job the follow-up can name (Review audit 2026-10-15)', () => {
  it('…e5 first, so that …Bd6 can bring the bishop into the game', () => {
    const moves = game(['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3', 'd6', 'exd6', 'Qxd6', 'Be2', 'Bg4', 'Nb5', 'Qd7', 'Bf4', 'Nd5', 'Ne5', 'Bxe2', 'Qxe2', 'Nxf4', 'Nxd7', 'Nxe2', 'Nc7+', 'Kxd7', 'Nxa8', 'Nexd4', 'Rd1', 'e5']);
    const reads = new Map<number, CachedEval>([
      [33, { evaluation: -300, depth: 18, bestMove: 'e7e5', pv: ['e7e5', 'e1g1', 'f8d6'] }],
      [34, { evaluation: -300, depth: 18, bestMove: 'e1g1', pv: ['e1g1', 'f8d6', 'f2f4'] }],
    ]);
    expect(intentsFromReads(moves, 'black', reads).get(34)?.text).toBe('…e5 first, so that …Bd6 can bring the bishop into the game.');
  });
});
