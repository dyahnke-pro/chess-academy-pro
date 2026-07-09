import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import {
  classifyEvalSwing,
  generateMoveCommentary,
} from './coachMoveCommentary';
import * as coachApi from './coachApi';

function gameAfter(moves: string[]): Chess {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c;
}

describe('classifyEvalSwing', () => {
  it('returns "neutral" when either eval is missing', () => {
    expect(classifyEvalSwing(null, 10, 'w')).toBe('neutral');
    expect(classifyEvalSwing(10, null, 'w')).toBe('neutral');
  });

  it('classifies a big positive swing for White as excellent', () => {
    expect(classifyEvalSwing(0, 120, 'w')).toBe('excellent');
  });

  it('classifies a big negative swing for White as blunder', () => {
    expect(classifyEvalSwing(0, -400, 'w')).toBe('blunder');
  });

  it('inverts perspective for Black', () => {
    expect(classifyEvalSwing(0, 400, 'b')).toBe('blunder');
    expect(classifyEvalSwing(0, -400, 'b')).toBe('excellent');
  });

  it('uses "book" for tiny swings', () => {
    expect(classifyEvalSwing(10, 15, 'w')).toBe('book');
  });
});

// GROUNDED contract (David 2026-07-09 — full G0 + the RICH move-purpose voice).
// A non-empty commentary is the COMPUTED move-purpose bundle (assembleMovePurpose
// → clauses) phrased through the ONE voiceFacts chokepoint. The tests mock
// voiceFacts to echo the facts it's handed, so we can assert the purpose reaches
// it — there is no free-LLM prompt to inspect.
describe('generateMoveCommentary — grounded move purpose', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // voiceFacts echoes the facts it is given (the computed purpose), so the
    // returned commentary === the computed bundle. Real voiceFacts would phrase
    // it warmly; the FACTS are what we assert are grounded.
    vi.spyOn(coachApi, 'voiceFacts').mockImplementation(async (facts: string) => facts);
  });

  it('narrates the COMPUTED purpose of the move just played', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    // White just played f4 (the King's Gambit thrust) after e4 e5.
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'f4']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: -30,
      studentColor: 'b',
    });
    expect(spy).toHaveBeenCalled();
    // The purpose is non-empty computed prose (geometry/eval), not a stock line.
    expect(out.length).toBeGreaterThan(0);
    expect(out.toLowerCase()).not.toContain("can't verify");
  });

  it('threads the opening subject into the purpose lead', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'c5', 'Nf3']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: 25,
      subject: 'Sicilian Najdorf',
    });
    expect(spy).toHaveBeenCalled();
    const facts = spy.mock.calls[0]?.[0];
    expect(facts.toLowerCase()).toContain('sicilian najdorf');
  });

  it('caps clauses by verbosity (fast = fewer than full)', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    // A capturing/attacking move so several clauses are available.
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6'];
    await generateMoveCommentary({ gameAfter: gameAfter(moves), mover: 'w', evalBefore: 20, evalAfter: 30, studentColor: 'b', verbosity: 'fast' });
    const fastFacts = (spy.mock.calls[0]?.[0] ?? '');
    spy.mockClear();
    await generateMoveCommentary({ gameAfter: gameAfter(moves), mover: 'w', evalBefore: 20, evalAfter: 30, studentColor: 'b', verbosity: 'slow' });
    const slowFacts = (spy.mock.calls[0]?.[0] ?? '');
    // Full (slow) never voices FEWER sentences than fast.
    const count = (s: string): number => (s.match(/[.!?]/g) ?? []).length;
    expect(count(slowFacts)).toBeGreaterThanOrEqual(count(fastFacts));
  });

  it('returns empty string when offline=true (no compute at all)', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
      offline: true,
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns empty string when verbosity is none', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
      verbosity: 'none',
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns empty string when no move has been played yet', async () => {
    const spy = vi.spyOn(coachApi, 'voiceFacts');
    const out = await generateMoveCommentary({
      gameAfter: new Chess(),
      mover: 'w',
      evalBefore: null,
      evalAfter: null,
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });
});
