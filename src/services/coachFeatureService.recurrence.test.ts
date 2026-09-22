// WO-LOOP-01 — the review's fundamentals-first beat carries the recurrence
// clause when the student's OWN record proves the fundamental recurred in a
// PRIOR game. Same Alapin fixture the fundamentals-first test uses (6...Nb6 —
// same piece for the third time, space conceded, a tempo handed over).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildReviewSegments, type ReviewMoveInput } from './coachFeatureService';
import type { WeaknessSignal } from './weaknessSignal';

const DAY = 24 * 60 * 60 * 1000;
const SANS = ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'Nc6', 'Nc3', 'Nb6', 'Nf3'];

function inputs(): ReviewMoveInput[] {
  const chess = new Chess();
  return SANS.map((san, i) => {
    chess.move(san);
    const isBlack = i % 2 === 1;
    return {
      ply: i + 1, san, fenAfter: chess.fen(), isCoachMove: !isBlack,
      classification: i === 11 ? 'mistake' : 'book',
      preMoveEval: i === 11 ? -20 : 0, evaluation: i === 11 ? 90 : 0,
      bestMove: i === 11 ? 'e7e6' : null,
    } as unknown as ReviewMoveInput;
  });
}

function recurring(games: NonNullable<WeaknessSignal['games']>): WeaknessSignal {
  return {
    clusterId: 'fundamental:same-piece-twice', capabilityTag: null, proven: false, bucket: 'positional', label: 'Moving the same piece twice',
    openCount: games.length, severity: 30, puzzleThemes: [], total: games.length, games,
  };
}

describe('review — the loop out loud (WO-LOOP-01)', () => {
  it('a fundamental the student has recorded in a PRIOR game gets the recurrence clause, after the verdict and before the better move', () => {
    const signals = [recurring([{ gameId: 'prior-1', opponentName: 'Rossi, Anna', playedAt: Date.now() - 9 * DAY }])];
    const segs = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Alapin Variation', false, 1400, signals, undefined, 'this-game');
    const text = segs[11].narration ?? '';
    expect(text).toMatch(/keeps recurring in your games — moving the same piece twice, the second game now — the last one was against Rossi, Anna 9 days ago/);
    const firstSentence = text.split(/(?<=[.!?])\s/)[0];
    expect(firstSentence).not.toMatch(/keeps recurring/);      // the FUNDAMENTAL still leads
    expect(text.indexOf('keeps recurring')).toBeLessThan(text.indexOf('The move was e6.'));
  });

  it('negative control: no record → the beat is exactly what it was', () => {
    const text = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Alapin Variation', false, 1400, [], undefined, 'this-game')[11].narration ?? '';
    expect(text).not.toMatch(/keeps recurring/);
    expect(text).toMatch(/The move was e6\./);
  });

  it("negative control: the sweep's rows for THIS game are not a prior game", () => {
    const signals = [recurring([{ gameId: 'this-game', opponentName: 'Rossi, Anna', playedAt: Date.now() - DAY }])];
    const text = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Alapin Variation', false, 1400, signals, undefined, 'this-game')[11].narration ?? '';
    expect(text).not.toMatch(/keeps recurring/);
  });

  it('UNCAPPED (the shipped default): the clause rides on the [principle] facet, and not without a record', () => {
    const signals = [recurring([{ gameId: 'prior-1', opponentName: 'Rossi, Anna', playedAt: Date.now() - 9 * DAY }])];
    const on = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Alapin Variation', true, 1400, signals, undefined, 'this-game')[11].narration ?? '';
    expect(on).toMatch(/keeps recurring in your games — moving the same piece twice, the second game now — the last one was against Rossi, Anna 9 days ago/);
    const off = buildReviewSegments(inputs(), 'black', 'Sicilian Defense: Alapin Variation', true, 1400, [], undefined, 'this-game')[11].narration ?? '';
    expect(off).not.toMatch(/keeps recurring/);
  });

  it('never says "we/our/us" and stays deterministic across two builds', () => {
    const signals = [recurring([{ gameId: 'prior-1', opponentName: 'Rossi, Anna', playedAt: Date.now() - 9 * DAY }])];
    const a = buildReviewSegments(inputs(), 'black', null, false, 1400, signals, undefined, 'this-game')[11].narration;
    const b = buildReviewSegments(inputs(), 'black', null, false, 1400, signals, undefined, 'this-game')[11].narration;
    expect(a).toBe(b);
    expect(a ?? '').not.toMatch(/\b(we|our|us)\b/i);
  });
});
