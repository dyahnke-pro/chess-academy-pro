// Review never teaches a gem (David 2026-10-29: gems are part of the opening
// the student buys and are taught on its page only). On a spine that carries a
// real gem, the review names neither the slip nor its punishment.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: vi.fn(async () => ({ evaluation: 0, bestMove: null, topLines: [] })) },
}));
import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';
import { getAllPunishGems, isTeachableSlipGem } from '../data/lessons/punishGems';

const moves = (sans: string[]): ReviewMoveInput[] => {
  const c = new Chess();
  return sans.map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, isCoachMove: false, classification: 'good', evaluation: 0, preMoveEval: 0, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
  });
};
const SPINE = ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'];

describe('no gem in review', () => {
  it('the gem exists on this spine (fixture sanity — the checks below are not vacuous)', () => {
    expect(getAllPunishGems().some((g) => isTeachableSlipGem(g) && g.lineMoves.trim() === SPINE.join(' ') && g.inaccuracy === 'f3')).toBe(true);
  });

  it('the student AVOIDED the known slip: the review does not name it', async () => {
    const n = await generateReviewNarration({ moves: moves([...SPINE, 'Nxe4', 'Nf6']), playerColor: 'white', openingName: null, result: '*', playerRating: 400, coachNarration: 'silent', uncapped: true });
    const said = n.segments.map((s) => s.narration ?? '').join(' ');
    expect(said).not.toMatch(/known mistake|loses to exf3|\bf3\b/);
  });

  it('the opponent PLAYED the known slip: the review does not teach the gem', async () => {
    const n = await generateReviewNarration({ moves: moves([...SPINE, 'f3', 'exf3']), playerColor: 'black', openingName: null, result: '*', playerRating: 400, coachNarration: 'silent', uncapped: true });
    const said = n.segments.map((s) => s.narration ?? '').join(' ');
    expect(said).not.toMatch(/known mistake|punished it with exf3|the crush was/);
  });
});
