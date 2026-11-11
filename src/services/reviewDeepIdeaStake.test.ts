// A deep idea with nothing to recite says its SPECIFIC stake, or nothing (review
// audit 2026-10-14: "their idea starts with d5." and nothing more → David
// 2026-11-07: specificity, never a general statement). The engine is mocked to
// a QUIET decisive line — no capture, so the proof renderer has nothing to
// recite — and the line builds nothing nameable, so it is not told.
import { describe, it, expect, vi } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      evaluation: -400,
      bestMove: 'g8e7',
      topLines: [{ moves: ['g8e7', 'd2d3', 'e8g8'], evaluation: -400 }],
    }),
  },
}));

import { generateReviewNarration } from './coachFeatureService';
import { stockfishEngine } from './stockfishEngine';
import type { ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';

describe('a deep idea says why it matters', () => {
  // David 2026-11-07: "I want specificity when we teach. Not a general
  // statement." This line (…Ne7, d3, …O-O) wins nothing and builds nothing a
  // sentence can name, so "it swings the game by three or four points" — a
  // stake with no why — is not said, and neither is the bare idea.
  it('a quiet line that builds nothing nameable is not told', async () => {
    const sans = ['e4', 'e5', 'Nc3', 'Bc5', 'a3', 'Qh4'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return { ply, san, isCoachMove: ply % 2 === 0, classification: 'good', evaluation: -30, preMoveEval: -20, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({ moves, playerColor: 'white', openingName: null, result: '0-1', playerRating: 1500, coachNarration: 'silent' });
    const said = n.segments.find((s) => s.ply === 4)?.narration ?? '';
    expect(said).not.toMatch(/swings the game/);
    expect(said).not.toMatch(/starts with Ne7/);
  }, 30000);

  it('a quiet line that builds something says what it builds', async () => {
    // …Qf6, d3, …Bb4: the bishop pins the knight on c3 to the king. No capture,
    // so nothing to recite; the pin is the line's specific stake.
    vi.mocked(stockfishEngine.analyzePosition).mockResolvedValue({
      evaluation: -400, bestMove: 'd8f6', topLines: [{ moves: ['d8f6', 'd2d3', 'c5b4'], evaluation: -400 }],
    } as never);
    const sans = ['e4', 'e5', 'Nc3', 'Bc5', 'a3', 'Qh4'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return { ply, san, isCoachMove: ply % 2 === 0, classification: 'good', evaluation: -30, preMoveEval: -20, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({ moves, playerColor: 'white', openingName: null, result: '0-1', playerRating: 1500, coachNarration: 'silent' });
    const said = n.segments.find((s) => s.ply === 4)?.narration ?? '';
    expect(said).toMatch(/starts with Qf6, and it sets up a pin when the bishop goes to b4\./);
    expect(said).not.toMatch(/swings the game/);
  }, 30000);
});
