// A deep idea with nothing to recite says its stake (review audit 2026-10-14:
// "Watch what they're building — left alone, their idea starts with d5." and
// nothing more). The engine is mocked to a QUIET decisive line — no capture,
// so the proof renderer has nothing to recite — and the kept line's reason
// (it swings the game) must be said with it.
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
import type { ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';

describe('a deep idea says why it matters', () => {
  it('a quiet decisive line names its first move AND what it swings', async () => {
    const sans = ['e4', 'e5', 'Nc3', 'Bc5', 'a3', 'Qh4'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return { ply, san, isCoachMove: ply % 2 === 0, classification: 'good', evaluation: -30, preMoveEval: -20, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({ moves, playerColor: 'white', openingName: null, result: '0-1', playerRating: 1500, coachNarration: 'silent' });
    const said = n.segments.find((s) => s.ply === 4)?.narration ?? '';
    expect(said).toMatch(/their idea starts with Ne7, and it swings the game by [^.]+\./);
  }, 30000);
});
