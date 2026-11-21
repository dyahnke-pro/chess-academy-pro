import { describe, it, expect } from 'vitest';
import { isForcingThreat, pieceIsSafe, renderTry } from './teachingSentence';

// 0LeQy before Rg1+: White Qh6, Ra1, Bd3, Kf3; Black Qb6.
const LEQY = 'r4rk1/pp2bp2/1q5Q/4P3/3pP3/3B1K2/PP3P2/R7 w - - 1 26';

describe('the board readers the renderer words from', () => {
  it('"threatens" only a forcing follow-up; a quiet one is "prepares"', () => {
    // After 1.e4 the d-pawn push d4 is not forcing.
    expect(isForcingThreat('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'd2d4')).toBe(false);
    // Qh5xf7 on the scholar's board is mate: forcing.
    expect(isForcingThreat('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 3', 'h5f7')).toBe(true);
  });
  it('praise needs a safe piece', () => {
    expect(pieceIsSafe(LEQY, 'b6')).toBe(true);
    expect(pieceIsSafe('4k3/8/8/3n4/8/2P5/8/4K3 b - - 0 1', 'd5')).toBe(true);
    expect(pieceIsSafe('4k3/8/8/3n4/2P5/8/8/4K3 b - - 0 1', 'd5')).toBe(false);
  });
});

describe('a reason on the board after the line', () => {
  it('joins the clause in lower case, a move keeps its case', async () => {
    const { renderTryReason } = await import('./teachingSentence');
    const t = { san: 'Nxd4', name: 'Nxd4', reply: '…Bd7', mine: true, stem: 0, plan: null, replyFollow: null, whyPath: 'Nxd4 …Bd7', material: null, materialWho: 'They', mates: false, shift: null, shiftKind: null };
    expect(renderTryReason({ ...t, why: "They're worse, so they're setting you a problem." })).toBe("After Nxd4 …Bd7, they're worse, so they're setting you a problem.");
    expect(renderTryReason({ ...t, why: 'Qxd4 wins a pawn.' })).toBe('After Nxd4 …Bd7, Qxd4 wins a pawn.');
  });

  it('a path that is only the reply the lead named is not anchored again (colle800: "…f6 meets it. After …f6, their pawn on f6 is aimed at …")', async () => {
    const { renderTryReason } = await import('./teachingSentence');
    const t = { san: 'Qxf4', name: 'Qxf4', reply: '…f6', mine: true, stem: 0, plan: null, replyFollow: null, whyPath: '…f6', material: null, materialWho: 'They', mates: false, shift: null, shiftKind: null };
    expect(renderTryReason({ ...t, why: 'Their pawn on f6 is aimed at your bishop on g5.' })).toBe('That pawn is aimed at your bishop on g5.');
    expect(renderTryReason({ ...t, why: 'Your queen has no square.' })).toBe('Then your queen has no square.');
  });
});

describe('a try says its one cost on the sentence before it — never on another idea (2026-11-20 baseline: "But your Rxe5 stops it, and Bxh7+ leaves you losing")', () => {
  const base = { san: 'Bxh7+', name: 'Bxh7+', reply: '…Kxh7', mine: true, stem: 1, plan: null, replyFollow: null, whyPath: null, material: null, materialWho: 'They', mates: false, shiftKind: 'result' as const };
  it('a why whose last sentence is another idea keeps the cost its own sentence, the try named', () => {
    const t = renderTry({ ...base, why: 'Their bishop is aimed at your rook. But your Rxe5 stops it.', shift: 'It leaves you losing.' });
    expect(t).toMatch(/But your Rxe5 stops it\. Bxh7\+ leaves you losing\.$/);
  });
  it('a why about the try takes the cost as its second half', () => {
    const t = renderTry({ ...base, why: 'It wins nothing: the trades leave the material level.', shift: 'It gives back part of your edge.', shiftKind: 'smaller' });
    expect(t).toMatch(/It wins nothing: the trades leave the material level, and it gives back part of your edge\.$/);
  });
});

describe('a resource with two targets names them by piece (humanSquares 2026-11-21: "from d8 it hits your queen on c8 and your rook on h1")', () => {
  it('one target keeps its square, two lose theirs', async () => {
    const { renderCounterplay } = await import('./teachingSentence');
    const base = { mine: false, alive: true, piece: 'queen', from: 'd1', to: 'd8', brk: null, whose: 'your', stopper: null, stem: 1 };
    const two = renderCounterplay({ ...base, hits: ['your queen on c8', 'your rook on h1'] });
    expect(two).not.toMatch(/c8|h1/);
    expect(two).toMatch(/your queen and your rook/);
    expect(renderCounterplay({ ...base, hits: ['your queen on c8'] })).toMatch(/your queen on c8/);
  });
});
