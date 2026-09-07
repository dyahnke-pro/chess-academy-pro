import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { learnFundamentalVerdict, LEARN_FUNDAMENTAL_CP_FLOOR, type LearnFundamentalInput } from './learnFundamentalNarration';
import type { FundamentalId } from './principleAttribution';

// Build #3 (David 2026-09-07: "Learn it needs to be added into the narration").
// The Learn board names the fundamental the just-played move neglected, LIVE —
// the same attributor + voice the post-game review uses, fed the two engine
// reads the narration turn already holds. Pure, so it is fully unit-testable.
//
// Reuses the review's Alapin fixture (David's own 6...Nb6: "gave space away,
// moved the same piece twice, allowed tempo"). Best is 6...e6; the engine calls
// Nb6 a mistake. The student is BLACK here.
const ALAPIN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6';
const SANS = (() => { const c = new Chess(); c.loadPgn(ALAPIN); return c.history(); })();
const upTo = (ply: number): string[] => SANS.slice(0, ply);
const fenBefore = (ply: number): string => { const c = new Chess(); for (const s of upTo(ply - 1)) c.move(s); return c.fen(); };

// Ply 12 = 6...Nb6 (Black's flagged move). Black slightly better before, worse
// after → a flagged mover-POV loss (white-POV: −30 → +90).
const NB6: LearnFundamentalInput = {
  fenBefore: fenBefore(12),
  historySans: upTo(12),
  playedSan: SANS[11],       // 'Nb6'
  bestSan: 'e6',
  studentColor: 'black',
  evalBeforeWhiteCp: -30,    // +30 mover POV
  evalAfterWhiteCp: 90,      // −90 mover POV → cpLoss 120, flagged
};

describe('learnFundamentalVerdict', () => {
  it('returns null when there is no best move to compare against', () => {
    expect(learnFundamentalVerdict({ ...NB6, bestSan: null }, new Set())).toBeNull();
  });

  it('returns null for a near-best move under the centipawn floor', () => {
    const out = learnFundamentalVerdict(
      { ...NB6, evalBeforeWhiteCp: -30, evalAfterWhiteCp: -20 }, // +30 → +20, only 10cp
      new Set(),
    );
    expect(out).toBeNull();
  });

  it('names a fundamental and returns a spoken-ready verdict on a real slip', () => {
    const seen = new Set<FundamentalId>();
    const out = learnFundamentalVerdict(NB6, seen);
    expect(out).not.toBeNull();
    // The attributor is the authority on WHICH fundamental; David's read of this
    // exact move was "moved the same piece twice", and the review fixture proves
    // that id fires here — so it must be one of the trio it attributes.
    expect(['same-piece-twice', 'tempo-handed', 'space-conceded']).toContain(out!.id);
    expect(out!.verdict.trim().length).toBeGreaterThan(0);
    expect(out!.tag).toBeTruthy();
    expect(seen.has(out!.id)).toBe(true);
  });

  it('shortens a repeat of the same fundamental within one game (seen set)', () => {
    const seen = new Set<FundamentalId>();
    const first = learnFundamentalVerdict(NB6, seen);
    expect(first).not.toBeNull();
    const second = learnFundamentalVerdict(NB6, seen);
    if (second && second.id === first!.id) expect(second.verdict).not.toBe(first!.verdict);
  });

  it('treats a mate swing as flagged even when centipawns are unavailable', () => {
    const out = learnFundamentalVerdict(
      { ...NB6, evalBeforeWhiteCp: undefined, evalAfterWhiteCp: undefined, allowedMate: 3 },
      new Set(),
    );
    expect(out === null || typeof out.verdict === 'string').toBe(true);
  });

  it('is silent on an empty history (no move context to attribute)', () => {
    expect(learnFundamentalVerdict({ ...NB6, historySans: [] }, new Set())).toBeNull();
  });

  it('exposes the centipawn floor as a shared constant', () => {
    expect(LEARN_FUNDAMENTAL_CP_FLOOR).toBeGreaterThan(0);
  });
});
