/**
 * THE EYES FIRE — producer to consumer (2026-09-21).
 *
 * `show-squares` shipped with a hand, a router entry, two registrations and a
 * working handler, and never fired once because nothing produced the squares.
 * These drive the WHOLE chain, because every piece of it existed before and the
 * chain still did nothing.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  rememberSpokenSquares, readSpokenSquares, clearSpokenSquares,
} from './spokenSquares';
import {
  actuate, actionForCommand, registerCoachHands, clearCoachHands,
} from './coachActuator';
import { tryRouteIntent } from './coachSessionRouter';

const FEN = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3';
const SAME_BOARD_OTHER_CLOCK = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 9 30';
const OTHER = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('spokenSquares', () => {
  beforeEach(() => { clearSpokenSquares(); clearCoachHands(); });

  it('reads back what the narration pointed at', () => {
    rememberSpokenSquares(FEN, ['f3', 'e5']);
    expect(readSpokenSquares(FEN)).toEqual(['f3', 'e5']);
  });

  it('matches the POSITION, not the clock', () => {
    rememberSpokenSquares(FEN, ['f3']);
    expect(readSpokenSquares(SAME_BOARD_OTHER_CLOCK)).toEqual(['f3']);
  });

  it('says NOTHING about a different board — stale pointing is worse than none', () => {
    rememberSpokenSquares(FEN, ['f3']);
    expect(readSpokenSquares(OTHER)).toEqual([]);
  });

  it('drops a malformed square at the source, not at the board', () => {
    rememberSpokenSquares(FEN, ['f3', 'zz', '', 'e9']);
    expect(readSpokenSquares(FEN)).toEqual(['f3']);
  });

  it('keeps only the LAST fact — it is a pointer, not a history', () => {
    rememberSpokenSquares(FEN, ['f3']);
    rememberSpokenSquares(FEN, ['d5', 'c7']);
    expect(readSpokenSquares(FEN)).toEqual(['d5', 'c7']);
  });
});

describe('"show me on the board" reaches the board', () => {
  beforeEach(() => { clearSpokenSquares(); clearCoachHands(); });

  it('drives the FULL chain: spoken -> routed -> action -> handler', async () => {
    const painted: string[][] = [];
    registerCoachHands({ showSquares: (sq) => { painted.push([...sq]); return { ok: true }; } });

    // 1. the narration speaks a fact and records its coupled squares
    rememberSpokenSquares(FEN, ['f3', 'e5']);
    // 2. the student asks
    const intent = tryRouteIntent('show me on the board', { currentFen: FEN });
    expect(intent?.kind, 'the ask must parse').toBe('show_squares');
    // 3. the adapter fills the squares from what was SPOKEN
    const action = actionForCommand(intent!, { squares: readSpokenSquares(FEN) });
    expect(action, 'this returned null for the whole life of the build').toBeTruthy();
    // 4. the hand paints them
    const r = await actuate(action!);
    expect(r.ok).toBe(true);
    expect(painted).toEqual([['f3', 'e5']]);
  });

  it('declines when the coach has said nothing here — never paints a guess', () => {
    const intent = tryRouteIntent('show me on the board', { currentFen: FEN });
    const action = actionForCommand(intent!, { squares: readSpokenSquares(FEN) });
    // Null means the ask falls through to the brain, which answers in prose.
    // Painting arbitrary squares would be the invention this build removes.
    expect(action).toBeNull();
  });

  it('a surface with no highlight channel REFUSES with a reason', async () => {
    rememberSpokenSquares(FEN, ['f3']);
    const action = actionForCommand(
      tryRouteIntent('show me on the board', { currentFen: FEN })!,
      { squares: readSpokenSquares(FEN) },
    );
    const r = await actuate(action!);
    expect(r.ok).toBe(false);
    expect(r.reason, 'the fallback speaks for this hand').toMatch(/no board here to point at/i);
  });
});
