import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { replaceVerdictReason } from './coachFeatureService';
import { betterMoveReason } from './inaccuracyCall';

// Clean-pass review walk 2026-10-04, G1 15.Ba2. The review spoke before its deep
// dive finished, so the verdict read its reason off the depth-12 line (axb4 Ne7
// Bxa4 — Black never takes back on b4): "axb4 — it would win two pawns". One
// sentence later the better-line pass played its own line, axb4 Qxb4 c3 Qb7
// Bxa4: "two pawns for a pawn". One ply, two lines, two answers.
const FEN = 'r3k1nr/5ppp/1qn1p3/3pPb2/pp3B2/PB3N2/1PP2PPP/R2Q1RK1 w kq - 0 15';
const uci = (sans: string[]): string[] => { const c = new Chess(FEN); return sans.map((s) => { const m = c.move(s); return m.from + m.to; }); };

describe('one ply, one line: the verdict reason follows the line the ply plays', () => {
  it('the two lines really disagree (the defect is real)', () => {
    const shallow = betterMoveReason(FEN, 'Ba2', 'axb4', uci(['axb4', 'Nge7', 'Bxa4', 'O-O', 'c3', 'Bg4', 'h3', 'Bh5']), 'white', null, false);
    const fresh = betterMoveReason(FEN, 'Ba2', 'axb4', uci(['axb4', 'Qxb4', 'c3', 'Qb7', 'Bxa4', 'Nge7']), 'white', null, false);
    expect(shallow).toBe('it would win two pawns');
    expect(fresh).toBe('it would win a pawn');
  });
  it('the fresh reason replaces the spoken one', () => {
    const said = 'You: that was a mistake, costing about 1.9 points — the stronger move was axb4 — it would win two pawns. Why axb4 was better';
    const out = replaceVerdictReason(said, 'it would win two pawns', 'it would win a pawn');
    expect(out).toContain('the stronger move was axb4 — it would win a pawn.');
    expect(out).not.toContain('two pawns.');
  });
  it('no reason on the fresh line drops the old one; an unseen reason is left alone', () => {
    expect(replaceVerdictReason('— the stronger move was X — it would win two pawns.', 'it would win two pawns', null)).toBe('— the stronger move was X.');
    expect(replaceVerdictReason('the stronger move was X.', 'it would win two pawns', 'it would win a pawn')).toBe('the stronger move was X.');
  });
});

describe('a bare verdict takes the fresh line\'s reason', () => {
  it('adds the reason after "the stronger move was X" and nowhere else', async () => {
    const { addVerdictReason } = await import('./coachFeatureService');
    expect(addVerdictReason('You: that was a mistake — the stronger move was Be3. Next.', 'Be3', 'it would walk your bishop round to c5'))
      .toBe('You: that was a mistake — the stronger move was Be3 — it would walk your bishop round to c5. Next.');
    expect(addVerdictReason('the stronger move was Be3 — it would win a pawn.', 'Be3', 'x')).toBe('the stronger move was Be3 — it would win a pawn.');
    expect(addVerdictReason('the stronger move was Be3.', 'Be3', null)).toBe('the stronger move was Be3.');
  });
});
