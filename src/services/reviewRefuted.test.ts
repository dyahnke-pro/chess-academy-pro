// WO-LAYERS-01 step 3 — "not X, because Y" reaches the shipped review.
import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: vi.fn(async () => ({ evaluation: 0, bestMove: null, topLines: [] })) },
}));
import { generateReviewNarration, type ReviewMoveInput } from './coachFeatureService';
import { computeGemCrush } from './gemCrushLines';

const moves = (sans: string[]): ReviewMoveInput[] => {
  const c = new Chess();
  return sans.map((san, i) => {
    c.move(san);
    return { ply: i + 1, san, isCoachMove: false, classification: 'good', evaluation: 0, preMoveEval: 0, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
  });
};
const SPINE = ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4'];

describe('the refuted alternative in review', () => {
  it('the gem exists on this spine (fixture sanity)', () => {
    expect(computeGemCrush(undefined, SPINE)?.inaccuracy).toBe('f3');
  });

  it('the student AVOIDED the known slip: the coach names it and why it fails', async () => {
    const n = await generateReviewNarration({ moves: moves([...SPINE, 'Nxe4', 'Nf6']), playerColor: 'white', openingName: null, result: '*', playerRating: 400, coachNarration: 'silent', uncapped: true });
    const seg = n.segments.find((s) => s.ply === 7);
    console.log('AVOIDED:', seg?.narration);
    expect(seg?.narration ?? '').toMatch(/The trap here is f3 \(\d+% of games at your level\) — it loses to exf3/);
  });

  it('the opponent PLAYED the known slip: the coach names the punishment', async () => {
    const n = await generateReviewNarration({ moves: moves([...SPINE, 'f3', 'exf3']), playerColor: 'black', openingName: null, result: '*', playerRating: 400, coachNarration: 'silent', uncapped: true });
    const seg = n.segments.find((s) => s.ply === 7);
    console.log('PLAYED:', seg?.narration);
    expect(seg?.narration ?? '').toMatch(/f3 is a known mistake.*punished it with exf3/);
  });

  it('negative control: off the spine there is no refuted line', async () => {
    const n = await generateReviewNarration({ moves: moves(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4']), playerColor: 'white', openingName: null, result: '*', playerRating: 400, coachNarration: 'silent', uncapped: true });
    expect(n.segments.some((s) => /known mistake|often play .* here/.test(s.narration ?? ''))).toBe(false);
  });
});
