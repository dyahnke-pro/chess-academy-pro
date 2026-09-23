// The better-line WHY (David 2026-07-21, IMG_4577: "Need to know why Bf2 was
// better. The better lines need the why narrations. A deeper understanding is
// critical."). Every student flagged move that names a distinct best move —
// inaccuracies included — must carry the engine's line STARTING with the better
// move, narrated ply-by-ply, not just the bare "the stronger move was X".
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn(),
  },
}));

import { stockfishEngine } from './stockfishEngine';
import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';

const analyzeMock = vi.mocked(stockfishEngine.analyzePosition);

function buildMoves(): ReviewMoveInput[] {
  // 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.d3 — 4.d3 flagged as the student's
  // inaccuracy with 4.Ng5 (f3g5) recorded as the engine's better move.
  const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3'];
  const c = new Chess();
  return sans.map((san, i) => {
    c.move(san);
    const ply = i + 1;
    const isFlagged = ply === 7;
    return {
      ply,
      san,
      isCoachMove: false,
      classification: isFlagged ? 'inaccuracy' : 'good',
      evaluation: isFlagged ? 10 : 30,
      preMoveEval: isFlagged ? 90 : 30,
      bestMove: isFlagged ? 'f3g5' : null,
      fenAfter: c.fen(),
    } as ReviewMoveInput;
  });
}

describe('review — the better-line why on flagged moves', () => {
  beforeEach(() => {
    analyzeMock.mockReset();
    // Every analysis returns the Two Knights line from the flagged position:
    // Ng5 d5 exd5 Na5 — legal from the ply-7 fenBefore, so computePvLine can
    // seed on firstUci=f3g5 straight from the top line (the cheap path).
    analyzeMock.mockResolvedValue({
      evaluation: 90,
      bestMove: 'f3g5',
      topLines: [{ moves: ['f3g5', 'd7d5', 'e4d5', 'c6a5'], evaluation: 90 }],
    } as never);
  });

  it('a line that settles nothing is not recited (WO-LAYERS-01: a line is spoken only as proof)', async () => {
    // Ng5 d5 exd5 Na5 — …Nxd5 still wins the pawn back, so the line proves
    // no material point, and the move's own verdict has already been said.
    const narration = await generateReviewNarration({
      moves: buildMoves(), playerColor: 'white', openingName: 'Italian Game', result: '1-0', playerRating: 1500, coachNarration: 'silent',
    });
    const text = narration.segments.find((s) => s.ply === 7)?.narration ?? '';
    expect(text).toMatch(/Ng5/);                   // the better move is still named
    expect(text).not.toMatch(/the line runs/);     // …but no recital that proves nothing
  });

  it('a line that PROVES something is spoken to its result and stops', async () => {
    // Ng5 h6 Nxf7 — the pawn on f7 falls and the knight is defended by the
    // c4-bishop: a settled pawn. Then …Qe7 is a move the proof does not need.
    analyzeMock.mockResolvedValue({
      evaluation: 90,
      bestMove: 'f3g5',
      topLines: [{ moves: ['f3g5', 'h7h6', 'g5f7', 'd8e7'], evaluation: 90 }],
    } as never);
    const narration = await generateReviewNarration({
      moves: buildMoves(), playerColor: 'white', openingName: 'Italian Game', result: '1-0', playerRating: 1500, coachNarration: 'silent',
    });
    const text = narration.segments.find((s) => s.ply === 7)?.narration ?? '';
    expect(text).toMatch(/Why Ng5 was better — the line runs Ng5, h6 and Nxf7 — you win a pawn/);
    expect(text).not.toMatch(/Qe7/);               // cut where the claim settled
  });

  it('stays silent when the flagged move has no recorded best move', async () => {
    const moves = buildMoves().map((m) => (m.ply === 7 ? { ...m, bestMove: null } : m));
    const narration = await generateReviewNarration({
      moves,
      playerColor: 'white',
      openingName: 'Italian Game',
      result: '1-0',
      playerRating: 1500,
      coachNarration: 'silent',
    });
    const flagged = narration.segments.find((s) => s.ply === 7);
    expect(flagged?.narration ?? '').not.toContain('Why');
  });
});
