// ONE CLAIM, ONE LINE, on a real game (prod Review audit 2026-11-08,
// Carlsen–Caruana, the audit's own game, with its engine reads at depth 14 in
// `src/test/fixtures/carlsen-caruana-jYSkjcuG.json`). Each case was said twice
// in one turn by two producers of the same claim.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { reviewSegments, type ReplayGame } from '../test/replayGame';

const game = JSON.parse(readFileSync('src/test/fixtures/carlsen-caruana-jYSkjcuG.json', 'utf8')) as ReplayGame & { rating: number };

describe('Review says each claim once a move (Carlsen–Caruana)', () => {
  const segs = reviewSegments(game, game.rating);
  const at = (ply: number): string => segs.find((s) => s.ply === ply)?.narration ?? '';

  it('21.Bxg5: the attack on the loose knight on f4 is said once', () => {
    expect(at(41)).toMatch(/hits their knight/);
    expect(at(41).match(/hits their knight/g)?.length).toBe(1);
  });

  it('34.gxf7+: the king\'s cover is said once — the king attack keeps it, not the briefing as well', () => {
    expect(at(67)).toMatch(/the cover is coming apart/);
    expect(at(67)).not.toMatch(/prises open their king's cover/);
  });

  it('26…Qd4: the rook to e4 hitting their queen is said once — by the verdict, not again as their favour', () => {
    expect(at(52)).toMatch(/It let you play Re4, which attacks the queen on d4/);
    expect(at(52)).not.toMatch(/gain of time/);
  });

  it('22…Nh5: the f4 their move allowed is said once — by the verdict, not again as their help', () => {
    expect(at(44)).toMatch(/It let you play f4/);
    expect(at(44)).not.toMatch(/helps you|does you a favour/);
  });

  it('26…Qd4: their queen on the loose d5 pawn is said once — by the reach, not again as a weak-pawn target', () => {
    expect(at(52)).toMatch(/hits your d-pawn, which is loose/);
    expect(at(52)).not.toMatch(/trains on your weak pawn on d5/);
  });

  it('Review has no think pause: no "‖" mark reaches the walk', () => {
    for (const s of segs) expect(s.narration ?? '').not.toMatch(/‖/);
  });
}, 600_000);
