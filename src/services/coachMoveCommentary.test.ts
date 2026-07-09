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

// GROUNDED contract (David 2026-07-09 — full G0 for in-game narration). The
// coach no longer free-composes: every non-empty commentary comes from the
// COMPUTED grounded read via `groundedMoveFeedback` (which computes facts and
// voices them through the ONE `voiceFacts` chokepoint). The tests below assert
// (a) the guard short-circuits, and (b) the grounded read is the sole source —
// there is no free-LLM prompt to inspect.
describe('generateMoveCommentary — grounded', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('routes the position read through groundedMoveFeedback (no free compose)', async () => {
    const spy = vi
      .spyOn(coachApi, 'groundedMoveFeedback')
      .mockResolvedValue('You are holding a small edge — keep an eye on the open f-file.');
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'f4']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: -30,
      studentColor: 'b',
    });
    expect(spy).toHaveBeenCalled();
    expect(out).toBe('You are holding a small edge — keep an eye on the open f-file.');
  });

  it('returns empty string (no narration) when nothing is computable', async () => {
    vi.spyOn(coachApi, 'groundedMoveFeedback').mockResolvedValue(null);
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'e5', 'Nf3']),
      mover: 'w',
      evalBefore: 20,
      evalAfter: 25,
    });
    expect(out).toBe('');
  });

  it('returns empty string when the grounded read rejects', async () => {
    vi.spyOn(coachApi, 'groundedMoveFeedback').mockRejectedValue(new Error('network down'));
    const out = await generateMoveCommentary({
      gameAfter: gameAfter(['e4']),
      mover: 'w',
      evalBefore: 0,
      evalAfter: 10,
    });
    expect(out).toBe('');
  });

  it('returns empty string when offline=true is passed (no compute at all)', async () => {
    const spy = vi.spyOn(coachApi, 'groundedMoveFeedback').mockResolvedValue('should not be used');
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
    const spy = vi.spyOn(coachApi, 'groundedMoveFeedback').mockResolvedValue('nope');
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
    const spy = vi.spyOn(coachApi, 'groundedMoveFeedback');
    const out = await generateMoveCommentary({
      gameAfter: new Chess(),
      mover: 'w',
      evalBefore: null,
      evalAfter: null,
    });
    expect(out).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });

  it('threads the opening subject to the grounded read as computed framing', async () => {
    const spy = vi
      .spyOn(coachApi, 'groundedMoveFeedback')
      .mockResolvedValue('grounded read');
    await generateMoveCommentary({
      gameAfter: gameAfter(['e4', 'c5']),
      mover: 'b',
      evalBefore: 20,
      evalAfter: 25,
      subject: 'Sicilian Najdorf',
    });
    expect(spy).toHaveBeenCalled();
    const arg = spy.mock.calls[0]?.[0] as { extraFacts?: string } | undefined;
    expect(arg?.extraFacts?.toLowerCase()).toContain('sicilian najdorf');
  });
});
