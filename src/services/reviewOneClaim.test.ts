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

  it('Review has no think pause: no "‖" mark reaches the walk', () => {
    for (const s of segs) expect(s.narration ?? '').not.toMatch(/‖/);
  });
}, 600_000);
