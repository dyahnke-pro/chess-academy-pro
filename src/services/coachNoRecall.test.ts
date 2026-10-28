// THE RECORD STEERS, IT IS NEVER RECITED (David 2026-10-28: "Remove the 'last
// mistake narration' the last time you made this mistake. I want to trim out
// unnecessary statements."). A student whose record holds the same slip from
// another game hears the lesson, never "you've walked into this before" /
// "this one keeps recurring" / "this time you held it". The record still
// raises what gets taught (`boostFor`, the need score) — that is the loop.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegmentsForTests, type ReviewMoveInput } from './coachFeatureService';
import type { WeaknessSignal } from './weaknessSignal';

const RECALL = /keeps recurring|walked into this before|caught you before|held it|caught you in your games|against Rossi|against Sam/i;
const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: i % 2 === 0,
      classification: i === 11 ? 'mistake' : 'book',
      preMoveEval: i === 11 ? -20 : 0, evaluation: i === 11 ? 90 : 0,
      bestMove: i === 11 ? 'e7e6' : null,
    } as unknown as ReviewMoveInput;
  });
}

const recorded = (clusterId: string, label: string): WeaknessSignal => ({
  clusterId, capabilityTag: null, proven: false, bucket: 'positional', label,
  openCount: 3, severity: 50, puzzleThemes: [], total: 3,
});

describe('review never recites the record', () => {
  it('a slip the record holds from another game: the lesson speaks, the recall does not', { timeout: 30_000 }, () => {
    const signals = [recorded('fundamental:same-piece-twice', 'Moving the same piece twice')];
    for (const uncapped of [false, true]) {
      const text = buildReviewSegmentsForTests(inputs(), 'black', 'Sicilian Defense: Alapin Variation', uncapped, 1400, signals, undefined, 'this-game')[11].narration ?? '';
      expect(text).toMatch(/same knight for the third time/);
      expect(text).not.toMatch(RECALL);
    }
  });

  it('a clean move answering a question the record failed elsewhere: no "this time you held it"', { timeout: 30_000 }, () => {
    const c = new Chess();
    const moves = ['e4', 'c5', 'c3', 'Nf6'].map((san, i) => {
      c.move(san);
      return { ply: i + 1, san, isCoachMove: i % 2 === 0, classification: 'good' as const, evaluation: 30, preMoveEval: 30, bestMove: null, fenAfter: c.fen() } as unknown as ReviewMoveInput;
    });
    const segs = buildReviewSegmentsForTests(moves, 'black', null, true, 1500, [recorded('neglected-development', 'Neglected development')], undefined, 'now');
    for (const s of segs) expect(s.narration ?? '').not.toMatch(RECALL);
  });
});
