/**
 * coachIntentRouter — pin the take-back regex against real-world
 * phrasings the user has been saying that didn't match the original
 * `take.{0,5}back` pattern. WO-CYCLE7-FOLLOWUPS.
 */
import { describe, it, expect } from 'vitest';
import { tryRouteIntent } from '../coachIntentRouter';

describe('tryRouteIntent — take_back_move', () => {
  it('matches "take that back"', () => {
    const r = tryRouteIntent('take that back');
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('matches "Take your move back" (cycle 7 audit Finding 156)', () => {
    const r = tryRouteIntent('Take your move back');
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('matches "Take that move back and play D6" (cycle 5 audit Finding 115)', () => {
    // Note: returns take_back_move only — the LLM follow-up still
    // gets to handle the "and play D6" tail, but the take-back
    // dispatches deterministically first.
    const r = tryRouteIntent('Take that move back and play D6');
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('matches "take it back"', () => {
    const r = tryRouteIntent('take it back');
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('matches plain "undo"', () => {
    const r = tryRouteIntent('undo');
    expect(r).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('matches "take both moves back" → count=2', () => {
    const r = tryRouteIntent('take both moves back');
    expect(r).toEqual({ kind: 'take_back_move', count: 2 });
  });

  it('matches "go back" / "rewind"', () => {
    expect(tryRouteIntent('go back one move')).toEqual({ kind: 'take_back_move', count: 1 });
    expect(tryRouteIntent('rewind')).toEqual({ kind: 'take_back_move', count: 1 });
  });

  it('does NOT match unrelated chess discussion that happens to contain "take"', () => {
    // No "back" anywhere — the AND-gated regex should not fire.
    expect(tryRouteIntent('I want to take the knight on c3')).toBe(null);
  });

  it('does NOT match unrelated chess discussion that happens to contain "back"', () => {
    expect(tryRouteIntent('that knight is on the back rank')).toBe(null);
  });

  it('still rejects when "take" and "back" are too far apart (sentence boundary)', () => {
    // 50+ chars between — beyond the 30-char window. Should NOT
    // match because this is a discussion sentence, not a command.
    const text = 'I would take that knight there because it would put pressure all the way back';
    expect(tryRouteIntent(text)).toBe(null);
  });
});
