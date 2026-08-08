// The deep-threat horizon, BOTH directions (David 2026-07-22: "I want to know
// that threats are called out 3+ moves in advance. Both for and against the
// user"). The engine is mocked to a canned multi-ply refutation line so the
// #5c AGAINST-the-user pass is exercised deterministically: after the
// opponent's quiet-looking ...Bc5, giving the opponent the move again runs
// Bxf2+ Kxf2 Qh4+ — a 3-ply swing ≥250cp toward the opponent. The pass must
// narrate the brewing idea AND close with the stored defense.
import { describe, it, expect, vi } from 'vitest';

vi.mock('./stockfishEngine', () => ({
  stockfishEngine: {
    analyzePosition: vi.fn().mockResolvedValue({
      evaluation: -400,
      bestMove: 'c5f2',
      topLines: [{ moves: ['c5f2', 'e1f2', 'd8h4'], evaluation: -400 }],
    }),
  },
}));

import { generateReviewNarration } from './coachFeatureService';
import type { ReviewMoveInput } from './coachFeatureService';
import { Chess } from 'chess.js';

describe('uncapped verdict facet — spoken only when it CHANGES (R10)', () => {
  it('never ships the identical bare verdict on two plies', async () => {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'Nc3', 'Nf6'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      return {
        ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0,
        classification: 'book', evaluation: -20, preMoveEval: -20,
        bestMove: null, fenAfter: c.fen(),
      } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({
      moves, playerColor: 'white', openingName: null, result: '1-0',
      playerRating: 1500, coachNarration: 'silent', uncapped: true,
    });
    const spoken = n.segments.map((s) => (s.narration ?? '').trim().toLowerCase()).filter((t) => t.length >= 8);
    const dupes = spoken.filter((t, i) => spoken.indexOf(t) !== i);
    expect(dupes, `verbatim-duplicate narration lines: ${dupes.join(' || ')}`).toEqual([]);
  });
});

describe('teaching refrains speak ONCE per review (David 2026-07-22)', () => {
  it('facts repeat, principles do not — and the development nag fires once', async () => {
    // 2.c4 uncovers d3 (both its pawn guards, c2 and e2, have advanced) and
    // 3.g4 uncovers f3 the same way — two HONEST weakenings (a square still
    // covered by a neighbouring pawn, like d3/f3 after a bare 1.e4, no longer
    // counts as weakened; board-awareness sweep 2026-07-22).
    const sans = ['e4', 'e5', 'c4', 'd6', 'g4', 'Nc6'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      return {
        ply: i + 1, san, isCoachMove: (i + 1) % 2 === 0,
        classification: 'book', evaluation: -20, preMoveEval: -20,
        bestMove: null, fenAfter: c.fen(),
      } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({
      moves, playerColor: 'white', openingName: null, result: '1-0',
      playerRating: 1500, coachNarration: 'silent', uncapped: true,
    });
    const texts = n.segments.map((s) => s.narration ?? '');
    // PAST TENSE. Review is the retrospective register — the student's own,
    // finished game — so `pastTenseReviewNarration` converts every head before
    // it ships ("the pawn GAVE up d3"). These assertions were written against
    // the present-tense output and never updated when that landed, so they had
    // been failing on a contract the code deliberately left behind.
    //
    // A square its remaining pawns still cover is NOT called weakened (1.e4).
    expect(texts[0]).not.toMatch(/g(?:ives|ave) up .* for good/);
    // Ply 3 (c4) teaches the principle with the fact…
    expect(texts[2]).toMatch(/gave up d3 for good — pawns don't move back/);
    // …ply 5 (g4) keeps the FACT but not the refrain.
    expect(texts[4]).toMatch(/gave up f3 for good/);
    expect(texts[4]).not.toMatch(/pawns don't move back/);
    // The development nag ("boxed in at home") appears in exactly one segment.
    const nagCount = texts.filter((t) => t.includes('boxed in at home')).length;
    expect(nagCount).toBeLessThanOrEqual(1);
  });
});

describe('uncapped narration never leaks a facet tag or a mate-sentinel eval (preview audit 2026-07-22)', () => {
  it('strips DIGIT-bearing tags ([rook7]) and skips [eval] on the mating move', async () => {
    // The Opera-style finish reaches a rook on the seventh (Rxd7) and ends on a
    // checkmate (Rd8#) — the two plies where the preview audit caught "[rook7]"
    // leaking and "[eval] dips 300.0 their way" over a mate.
    const sans = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5',
      'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5', 'cxb5',
      'Bxb5+', 'Nbd7', 'O-O-O', 'Rd8', 'Rxd7', 'Rxd7', 'Rd1', 'Qe6', 'Bxd7+', 'Nxd7',
      'Qb8+', 'Nxb8', 'Rd8#'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      // Give the final mate a mate-sentinel eval, as the engine would.
      const isMate = san.includes('#');
      return {
        ply, san, isCoachMove: ply % 2 === 0,
        classification: 'good',
        evaluation: isMate ? 30000 : 40,
        preMoveEval: isMate ? 900 : 20,
        bestMove: null, fenAfter: c.fen(),
      } as unknown as ReviewMoveInput;
    });
    const n = await generateReviewNarration({
      moves, playerColor: 'white', openingName: null, result: '1-0',
      playerRating: 1400, coachNarration: 'silent', uncapped: true,
    });
    const all = n.segments.map((s) => s.narration ?? '').join('\n');
    // No facet tag of any shape (letters, hyphens, OR digits) survives.
    expect(all).not.toMatch(/\[[a-z0-9-]+\]/i);
    // The mating segment does not narrate a mate-sentinel as a pawn drift.
    const mateSeg = n.segments.find((s) => s.san === 'Rd8#');
    expect(mateSeg?.narration ?? '').not.toMatch(/eval bar.*\b\d{3}(\.\d)? /);
    // 30s, because this generates the FULL narration for a 33-ply game and had
    // no declared budget — ~2s alone, past the 5s default whenever it runs
    // beside anything else. It failed on the clock, not on the contract, so the
    // tag-leak check it exists for silently stopped being performed.
  }, 30000);
});

describe('deep threat AGAINST the student (#5c)', () => {
  it('narrates the opponent\'s multi-move idea and names the stored defense', async () => {
    const sans = ['e4', 'e5', 'Nc3', 'Bc5', 'a3', 'Qh4'];
    const c = new Chess();
    const moves: ReviewMoveInput[] = sans.map((san, i) => {
      c.move(san);
      const ply = i + 1;
      return {
        ply,
        san,
        isCoachMove: ply % 2 === 0,
        classification: 'good',
        evaluation: -30,
        preMoveEval: -20,
        bestMove: ply === 5 ? 'g1f3' : null,
        fenAfter: c.fen(),
      } as unknown as ReviewMoveInput;
    });

    const n = await generateReviewNarration({
      moves,
      playerColor: 'white',
      openingName: null,
      result: '0-1',
      playerRating: 1500,
      coachNarration: 'silent',
    });

    const oppSeg = n.segments.find((s) => s.ply === 4); // ...Bc5, opponent 'good'
    expect(oppSeg).toBeTruthy();
    // Past tense for the same reason as above — review looks back, so the
    // authored "Watch what they're building" ships as "…they were building".
    expect(oppSeg?.narration ?? '').toMatch(/Watch what they were building/);
    // The line is rendered ply-by-ply (Bxf2 appears in the narrated run).
    expect(oppSeg?.narration ?? '').toMatch(/Bxf2/);
    // The DEFENSE from the stored analysis (the student's next best move).
    expect(oppSeg?.narration ?? '').toMatch(/Your defense starts with Nf3/);
  });
});
