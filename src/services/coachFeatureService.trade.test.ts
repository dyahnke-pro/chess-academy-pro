// A capture they can take back is a TRADE, and review says so (2026-09-25).
// The review audit caught 4…cxd4 in the Alapin going silent once the door
// stopped describing a pawn about to be taken ("your pawn on d4 now eyes…").
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import { coldStudent } from './needScore';

const SANS = 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 Nc6'.split(' ');

describe('review names the trade on a capture that will be taken back', () => {
  it('4…cxd4 — "You take on d4, and they can take back — a pawn trade."', () => {
    const c = new Chess();
    const inputs = SANS.map((san, i) => { c.move(san); return { ply: i + 1, san, fenAfter: c.fen(), isCoachMove: i % 2 === 0, classification: 'book', preMoveEval: 0, evaluation: 0, bestMove: null } as unknown as ReviewMoveInput; });
    const segs = buildReviewSegments(inputs, 'black', 'Sicilian Defense: Alapin Variation', true, 1200, [], coldStudent(1200), 'g');
    const ply8 = segs.find((s) => s.ply === 8);
    expect(ply8?.narration ?? '').toContain('You take on d4, and they can take back — a pawn trade.');
    expect(ply8?.narration ?? '').not.toMatch(/pawn on d4 now eyes/);
  });
});
