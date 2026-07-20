import { describe, it, expect } from 'vitest';
import { assessPositionalEdge } from './reviewPositionalAssessment';

describe('assessPositionalEdge (David 2026-07-20 — the enumerated positional verdict)', () => {
  it('gives a verdict word from the student-POV eval', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(assessPositionalEdge(start, 'w', 250).verdict).toBe('clearly better');
    expect(assessPositionalEdge(start, 'w', 80).verdict).toBe('a bit better');
    expect(assessPositionalEdge(start, 'w', 0).verdict).toBe('balanced');
    expect(assessPositionalEdge(start, 'w', -80).verdict).toBe('a bit worse');
    expect(assessPositionalEdge(start, 'w', -250).verdict).toBe('in trouble');
    expect(assessPositionalEdge(start, 'w', null).verdict).toBeNull();
  });

  it('names the bishop pair when the student has two bishops vs one', () => {
    // White: Kg1, Bc4, Bb2, pawns; Black: Kg8, Nf6, one bishop gone. White has 2B vs 1B.
    const fen = '5nk1/5ppp/8/8/2B5/8/1B3PPP/6K1 w - - 0 1';
    const a = assessPositionalEdge(fen, 'w', 120);
    expect(a.reasons.some((r) => /bishop pair/i.test(r))).toBe(true);
  });

  it('names an outpost, an open file, and an isolated enemy pawn — the itemized asset list', () => {
    // White knight on d5 (outpost, no black pawn on c/e to attack it), white rook on
    // the open c-file, black pawn on a6 isolated (no b or... build carefully).
    // White: Kg1, Nd5, Rc1, pawns a2 e4 f2 g2 h2; Black: Kg8, pawns a6 e6 f7 g7 h7.
    // c-file open (no pawns), d5 knight defended by e4, black a6 isolated (no b-pawn).
    const fen = '6k1/5ppp/p7/3N4/4P3/8/P4PPP/2R3K1 w - - 0 1';
    const a = assessPositionalEdge(fen, 'w', 160);
    const joined = a.reasons.join(' | ');
    expect(joined).toMatch(/outpost on d5/i);
    expect(joined).toMatch(/open c-file/i);
    expect(joined).toMatch(/a6 is isolated/i);
    expect(a.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('emits no reasons and a balanced verdict from the opening start (no asset yet)', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const a = assessPositionalEdge(start, 'w', 10);
    expect(a.verdict).toBe('balanced');
    expect(a.reasons).toHaveLength(0);
  });

  it('every reason is a plain board-true clause with no engine/SAN leak (G0)', () => {
    const fen = '6k1/5ppp/p7/3N4/4P3/8/P4PPP/2R3K1 w - - 0 1';
    for (const r of assessPositionalEdge(fen, 'w', 160).reasons) {
      expect(r).not.toMatch(/\bengine\b/i);
      expect(r).not.toMatch(/\b[NBRQK][a-h]?x?[a-h][1-8]\b/); // no SAN tokens
    }
  });
});
