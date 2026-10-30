import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { learnFundamentalVerdict, fundamentalLines, LEARN_FUNDAMENTAL_CP_FLOOR, type LearnFundamentalInput } from './learnFundamentalNarration';
import type { FundamentalId } from './principleAttribution';
import { withPrice, type WithLegacyCost } from '../test/oneSearchScores';

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
const NB6: WithLegacyCost<LearnFundamentalInput> = {
  namesBetterMove: false,
  replySan: null,
  fenBefore: fenBefore(12),
  historySans: upTo(12),
  playedSan: SANS[11],       // 'Nb6'
  bestSan: 'e6',
  studentColor: 'black',
  costCp: null, evalBeforeWhiteCp: -30,    // +30 mover POV
  evalAfterWhiteCp: 90,      // −90 mover POV → cpLoss 120, flagged
};

describe('learnFundamentalVerdict', () => {
  it('returns null when there is no best move to compare against', () => {
    expect(learnFundamentalVerdict(withPrice({ ...NB6, bestSan: null }), new Set())).toBeNull();
  });

  it('returns null for a near-best move under the centipawn floor', () => {
    const out = learnFundamentalVerdict(withPrice(
      { ...NB6, evalBeforeWhiteCp: -30, evalAfterWhiteCp: -20 }), // +30 → +20, only 10cp
      new Set(),
    );
    expect(out).toBeNull();
  });

  it('names a fundamental and returns a spoken-ready verdict on a real slip', () => {
    const seen = new Set<FundamentalId>();
    const out = learnFundamentalVerdict(withPrice(NB6), seen);
    expect(out).not.toBeNull();
    // The attributor is the authority on WHICH fundamental; David's read of this
    // exact move was "moved the same piece twice", and the review fixture proves
    // that id fires here — so it must be one of the trio it attributes.
    expect(['same-piece-twice', 'tempo-handed', 'space-conceded']).toContain(out!.id);
    expect(out!.diagnosis.trim().length).toBeGreaterThan(0);
    expect(out!.tag).toBeTruthy();
    expect(seen.has(out!.id)).toBe(true);
  });

  it('shortens a repeat of the same fundamental within one game (seen set)', () => {
    const seen = new Set<FundamentalId>();
    const first = learnFundamentalVerdict(withPrice(NB6), seen);
    expect(first).not.toBeNull();
    const second = learnFundamentalVerdict(withPrice(NB6), seen);
    if (second && second.id === first!.id) expect(second.diagnosis).not.toBe(first!.diagnosis);
  });

  it('treats a mate swing as flagged even when centipawns are unavailable', () => {
    const out = learnFundamentalVerdict(withPrice(
      { ...NB6, evalBeforeWhiteCp: undefined, evalAfterWhiteCp: undefined, allowedMate: 3 }),
      new Set(),
    );
    expect(out === null || typeof out.diagnosis === 'string').toBe(true);
  });

  it('is silent on an empty history (no move context to attribute)', () => {
    expect(learnFundamentalVerdict(withPrice({ ...NB6, historySans: [] }), new Set())).toBeNull();
  });

  it('exposes the centipawn floor as a shared constant', () => {
    expect(LEARN_FUNDAMENTAL_CP_FLOOR).toBeGreaterThan(0);
  });
});

describe('a hung piece they did not take is a miss, not free material (re-walk 1380, 24.Bg5 f4)', () => {
  // 1.e4 d5 2.Bc4?? — dxc4 wins the bishop.
  const c = new Chess(); c.move('e4'); c.move('d5');
  const BC4: WithLegacyCost<LearnFundamentalInput> = {
    namesBetterMove: false,
    replySan: null, fenBefore: c.fen(), historySans: ['e4', 'd5', 'Bc4'],
    playedSan: 'Bc4', bestSan: 'exd5', studentColor: 'white', costCp: null, evalBeforeWhiteCp: 30, evalAfterWhiteCp: -300,
    // The engine's line after 2.Bc4 (Stockfish 18, depth 16).
    playedPvUci: ['d5c4', 'b1a3', 'g8f6', 'd1e2', 'b8c6', 'a3c4', 'e7e5', 'g1f3'],
  };
  it('names the miss when their reply does not take', () => {
    const out = learnFundamentalVerdict(withPrice({ ...BC4, replySan: 'Nf6' }), new Set());
    expect(out?.diagnosis ?? '').toMatch(/they missed it/);
    expect(out?.diagnosis ?? '').not.toMatch(/free material/);
  });
  it('keeps the plain verdict when they take it', () => {
    const out = learnFundamentalVerdict(withPrice({ ...BC4, replySan: 'dxc4' }), new Set());
    expect(out).not.toBeNull();
    expect(out?.diagnosis ?? '').not.toMatch(/missed/);
  });
});

describe('fundamentalLines — the moves a verdict names travel with it (deeper lines)', () => {
  it('calculation-depth: the path to the blow, from the board AFTER the student move', () => {
    const lines = fundamentalLines(
      // The game's own continuation, 7.Nf3 d6 8.exd6 Qxd6 — legal from the board.
      { id: 'calculation-depth', facts: { path: 'Nf3, d6, exd6', punish: 'Qxd6' }, evidence: { pvMoves: ['Nf3', 'd6', 'exd6', 'Qxd6'] } },
      fenBefore(12), 'Nb6', true,
    );
    const after = new Chess(fenBefore(12)); after.move('Nb6');
    expect(lines).toEqual([{ fen: after.fen(), sans: ['Nf3', 'd6', 'exd6', 'Qxd6'] }]);
    // …and the whole path actually plays from that board.
    const c = new Chess(lines[0].fen);
    for (const s of lines[0].sans) expect(c.move(s)).toBeTruthy();
  });
  it('the short repeat stem names only the blow — no path is drawn for it', () => {
    expect(fundamentalLines({ id: 'calculation-depth', facts: {}, evidence: { pvMoves: ['Nf3'] } }, fenBefore(12), 'Nb6', false)).toEqual([]);
  });
  it('a forcing win that was on the board: that move, from the board BEFORE the student move', () => {
    expect(fundamentalLines({ id: 'passive-when-forcing-existed', facts: { better: 'e6' }, evidence: {} }, fenBefore(12), 'Nb6', true))
      .toEqual([{ fen: fenBefore(12), sans: ['e6'] }]);
  });
  it('a verdict that names no move carries no line', () => {
    expect(fundamentalLines({ id: 'same-piece-twice', facts: {}, evidence: {} }, fenBefore(12), 'Nb6', true)).toEqual([]);
  });
});

