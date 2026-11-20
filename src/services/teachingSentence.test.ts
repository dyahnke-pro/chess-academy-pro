import { describe, it, expect } from 'vitest';
import { anchorSentenceFact, anchorPastFact, boardAfter, nowBoard, positionKey, renderSentenceFact, isForcingThreat, pieceIsSafe, ORPHAN_LEAD, TENSE, type SentenceFact } from './teachingSentence';

// 0LeQy before Rg1+: White Qh6, Ra1, Bd3, Kf3; Black Qb6.
const LEQY = 'r4rk1/pp2bp2/1q5Q/4P3/3pP3/3B1K2/PP3P2/R7 w - - 1 26';
const base = { soWhat: null, proof: { short: null, full: [] }, seat: 'w' as const };

describe('every fact knows its board', () => {
  it('a fact about the try board is said as the try, never as now', () => {
    // "their queen on h6 attacks your rook on h1": true only after Rh1 …Qxh6.
    const board = boardAfter(LEQY, ['a1h1', 'b6h6'], 'try');
    expect(board).not.toBeNull();
    const f: SentenceFact = { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h1' }, board: board! };
    const a = anchorSentenceFact(f, LEQY);
    expect(a).not.toBeNull();
    expect(renderSentenceFact(a!, 'read', LEQY)?.spoken).toBe('If Rh1 …Qxh6 is played, their queen on h6 would attack your rook on h1.');
  });
  it('NEGATIVE CONTROL: the same fact stamped "now" with the try board\'s key cannot be rendered', () => {
    const tryKey = boardAfter(LEQY, ['a1h1', 'b6h6'], 'try')!.key;
    const f: SentenceFact = { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h1' }, board: { key: tryKey, path: [], relation: 'now' } };
    expect(anchorSentenceFact(f, LEQY)).toBeNull();
  });
  it('NEGATIVE CONTROL: a try with no path cannot be rendered', () => {
    const f: SentenceFact = { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h1' }, board: { key: positionKey(LEQY), path: [], relation: 'try' } };
    expect(anchorSentenceFact(f, LEQY)).toBeNull();
  });
  it('NEGATIVE CONTROL: a path that does not reach the stamped key cannot be rendered', () => {
    const f: SentenceFact = { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h1' }, board: { key: positionKey(LEQY), path: ['a1h1'], relation: 'try' } };
    expect(anchorSentenceFact(f, LEQY)).toBeNull();
  });
  it('the owner is read off the fact\'s own board: their knight, never "your knight on e7"', () => {
    const fen = 'r4rk1/p3nqp1/Ppn1p2p/1B1pPp2/1P1P1P2/5N2/3Q2PP/R4RK1 w - - 0 20';
    const f: SentenceFact = { ...base, who: { square: 'e7' }, does: { kind: 'attacks', target: 'd5' }, board: nowBoard(fen) };
    const r = renderSentenceFact(anchorSentenceFact(f, fen)!, 'read', fen);
    expect(r?.spoken).not.toMatch(/your knight on e7/i);
    expect(r?.spoken).toMatch(/^Their knight on e7/);
  });
  it('a past board anchors only through its own board and path', () => {
    const before = 'r4rk1/pp2bp2/1q5Q/4P3/3pP3/3B1K2/PP3P2/6R1 b - - 2 26';
    const f: SentenceFact = { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h7' }, board: { key: positionKey(LEQY), path: ['a1g1'], relation: 'past' } };
    expect(anchorPastFact(f, LEQY, before)).not.toBeNull();
    expect(anchorPastFact(f, before, LEQY)).toBeNull();
  });
  it('one tense table: a try is always "if", Review the past', () => {
    expect(TENSE.try.review).toBe('if');
    expect(TENSE.now.review).toBe('past');
    expect(TENSE.now.learn).toBe('present');
  });
});

describe('the renderer writes the voice rules once', () => {
  it('the why before the material', () => {
    const f: SentenceFact = { ...base, who: { move: 'a1h1' }, does: { kind: 'try-fails', reply: '…Qxh6', why: 'their queen takes yours with nothing to take back', material: 'a queen', mates: false }, board: boardAfter(LEQY, ['a1h1'], 'try')! };
    const t = renderSentenceFact(anchorSentenceFact(f, LEQY)!, 'read', LEQY)!.spoken;
    expect(t.indexOf('their queen takes yours')).toBeLessThan(t.indexOf('a queen in the line'));
  });
  it('"threatens" only a forcing follow-up; a quiet one is "prepares"', () => {
    // After 1.e4 the d-pawn push d4 is not forcing.
    expect(isForcingThreat('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'd2d4')).toBe(false);
    // Qh5xf7 on the scholar's board is mate: forcing.
    expect(isForcingThreat('r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 3', 'h5f7')).toBe(true);
  });
  it('praise needs a safe piece', () => {
    // Black's queen on b6 attacked by nothing: safe. White's queen on h6 hangs to nothing but is unguarded and not attacked: safe.
    expect(pieceIsSafe(LEQY, 'b6')).toBe(true);
    expect(pieceIsSafe('4k3/8/8/3n4/8/2P5/8/4K3 b - - 0 1', 'd5')).toBe(true);
    expect(pieceIsSafe('4k3/8/8/3n4/2P5/8/8/4K3 b - - 0 1', 'd5')).toBe(false);
  });
  it('NEGATIVE CONTROL: orphan leads are caught', () => {
    for (const bad of ['It takes the …f5 break away.', 'This wins a pawn.', 'after this they cannot castle']) expect(bad).toMatch(ORPHAN_LEAD);
    expect('Their knight takes the …f5 break away.').not.toMatch(ORPHAN_LEAD);
  });
  it('one to one: every anchored fact renders to one sentence, in order', () => {
    const facts: SentenceFact[] = [
      { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'f8' }, board: nowBoard(LEQY) },
      { ...base, who: { square: 'h6' }, does: { kind: 'attacks', target: 'h1' }, board: boardAfter(LEQY, ['a1h1', 'b6h6'], 'try')! },
    ];
    const out = facts.map((f) => renderSentenceFact(anchorSentenceFact(f, LEQY)!, 'read', LEQY));
    expect(out.every((r) => r !== null)).toBe(true);
    expect(out.length).toBe(facts.length);
  });
});

describe('a reason on the board after the line', () => {
  it('joins the clause in lower case, a move keeps its case', async () => {
    const { renderTryReason } = await import('./teachingSentence');
    const t = { san: 'Nxd4', reply: '…Bd7', mine: true, stem: 0, plan: null, replyFollow: null, whyPath: 'Nxd4 …Bd7', material: null, materialWho: 'They', mates: false, shift: null };
    expect(renderTryReason({ ...t, why: "They're worse, so they're setting you a problem." })).toBe("After Nxd4 …Bd7, they're worse, so they're setting you a problem.");
    expect(renderTryReason({ ...t, why: 'Qxd4 wins a pawn.' })).toBe('After Nxd4 …Bd7, Qxd4 wins a pawn.');
  });
});
