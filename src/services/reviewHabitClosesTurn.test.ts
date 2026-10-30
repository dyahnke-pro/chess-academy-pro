// THE HABIT CLOSES THE TURN (WO-ONE-COACH-01). Danya's order on a move: what
// it changed, the choices, "not yet", the line played out, and LAST the habit
// that finds it next time. Review added the line after the walk had already
// closed the move with the habit, so the student heard "run CCT first…" and
// only then the line it was about.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
  },
}));

import { stockfishEngine } from './stockfishEngine';
import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';
import { isMethodSentence } from './principleVoice';

const analyzeMock = vi.mocked(stockfishEngine.analyzePosition);

/** 1.e4 e5 2.Nf3 Qg5 3.d3 — the student (White) walks past Nxg5, the queen
 *  standing en prise. */
function buildMoves(): ReviewMoveInput[] {
  const sans = ['e4', 'e5', 'Nf3', 'Qg5', 'd3'];
  const c = new Chess();
  return sans.map((san, i) => {
    c.move(san);
    const ply = i + 1;
    const flagged = ply === 5;
    return {
      ply, san, isCoachMove: false,
      classification: flagged ? 'blunder' : 'good',
      evaluation: flagged ? 30 : 30,
      preMoveEval: flagged ? 900 : 30,
      bestMove: flagged ? 'f3g5' : null,
      fenAfter: c.fen(),
    } as ReviewMoveInput;
  });
}

describe('review — the habit closes the turn', () => {
  beforeEach(() => {
    analyzeMock.mockReset();
    // Nxg5 d6 Nf3: the queen is won and the knight walks home.
    analyzeMock.mockResolvedValue({
      evaluation: 900,
      bestMove: 'f3g5',
      topLines: [{ moves: ['f3g5', 'd7d6', 'g5f3'], evaluation: 900 }],
    } as never);
  });

  it('the line played out comes before the habit, never after it', async () => {
    const narration = await generateReviewNarration({
      moves: buildMoves(), playerColor: 'white', openingName: 'Philidor Defense', result: '1-0', playerRating: 1200, coachNarration: 'silent',
    });
    const text = narration.segments.find((s) => s.ply === 5)?.narration ?? '';
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const habitAt = sentences.findIndex(isMethodSentence);
    const lineAt = sentences.findIndex((x) => /the line goes/.test(x));
    // The diagnosis leads, the line is played out, and the habit closes it.
    expect(lineAt).toBeGreaterThan(-1);
    expect(habitAt).toBeGreaterThan(lineAt);
    expect(sentences.slice(habitAt).every(isMethodSentence)).toBe(true);
    expect(sentences[0]).toMatch(/forcing moves first/);
    expect(narration.segments.every((s) => s.habitTail === undefined)).toBe(true);
  });
});
