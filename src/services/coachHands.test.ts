/**
 * THE HANDS ARE WIRED — end to end, text box to handler (2026-09-21).
 *
 * David: "A. Not even a question." (the spine gets the hands) + "The hands need
 * to be controllable by the user through the text box." + "Check double check
 * and triple check the wiring. I want this working on the first try."
 *
 * 🚨 WHAT THIS PROVES, AND WHY AN IMPORT CHECK WOULD NOT. The repo's own rule
 * is that a wire which does not fire is not a wire. So every test below drives
 * the REAL chain — `tryRouteIntent` (the app's one command router) →
 * `actionForCommand` (the adapter) → `actuate` (the one door) → a registered
 * handler — and asserts the handler was actually called with the value CODE
 * computed. Nothing here asserts that a function exists or that a module
 * imports another.
 *
 * THE G0 CONTRACT IS THE POINT. Before this, thirteen of fifteen board tools
 * were reachable only by the model, so the LLM decided when the board jumped
 * and when a move was taken back. These tests are the proof that a student's
 * sentence now reaches the hand WITHOUT a model in the path.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  actuate, actionForCommand, registerCoachHands, clearCoachHands,
  registerCoachNavigate, clearCoachNavigate, canPerform, steppedElo, HAND_FALLBACK,
  HAND_PROVIDER, type CoachHand, type RoutedCommand,
} from './coachActuator';
import type { CoachHand } from './coachActuator';
import { tryRouteIntent } from './coachSessionRouter';

/** Drive the REAL chain the student's text box drives. */
async function type(text: string, opts: {
  ctx?: Parameters<typeof tryRouteIntent>[1];
  board?: Parameters<typeof actionForCommand>[1];
} = {}) {
  const intent = tryRouteIntent(text, opts.ctx ?? {});
  if (!intent) return { intent: null, action: null, result: null };
  const action = actionForCommand(intent as RoutedCommand, opts.board ?? {});
  if (!action) return { intent, action: null, result: null };
  return { intent, action, result: await actuate(action) };
}

beforeEach(() => { clearCoachHands(); clearCoachNavigate(); });

describe('the student types, the hand moves — no model in the path', () => {
  it('"take that back" reaches the takeBack handler', async () => {
    const takeBack = vi.fn();
    registerCoachHands({ takeBack });
    const { intent, result } = await type('take that back', { ctx: { lastMoveBy: 'coach' } });
    expect(intent?.kind).toBe('take_back_move');
    expect(takeBack).toHaveBeenCalledTimes(1);
    expect(result?.ok).toBe(true);
  });

  it('"flip the board" reaches setOrientation', async () => {
    const setOrientation = vi.fn();
    registerCoachHands({ setOrientation });
    const { intent, result } = await type('flip the board');
    expect(intent?.kind).toBe('set_orientation');
    expect(setOrientation).toHaveBeenCalledTimes(1);
    expect(result?.ok).toBe(true);
  });

  it('"let me play black" names the colour rather than flipping blind', async () => {
    const setOrientation = vi.fn();
    registerCoachHands({ setOrientation });
    await type('let me play black');
    expect(setOrientation).toHaveBeenCalledWith('black');
  });

  it('"make it harder" steps the Elo UP from the live value — code computes it', async () => {
    const setStrength = vi.fn();
    registerCoachHands({ setStrength });
    const { intent, result } = await type('make it harder', { board: { currentElo: 1400 } });
    expect(intent?.kind).toBe('set_strength');
    expect(setStrength).toHaveBeenCalledWith(1550);
    expect(result?.ok).toBe(true);
  });

  it('"too easy" is HARDER, not easier — the shared word does not win', async () => {
    const setStrength = vi.fn();
    registerCoachHands({ setStrength });
    await type("this is too easy", { board: { currentElo: 1400 } });
    expect(setStrength).toHaveBeenCalledWith(1550);
  });

  it('"go easy on me" steps DOWN', async () => {
    const setStrength = vi.fn();
    registerCoachHands({ setStrength });
    await type('go easy on me', { board: { currentElo: 1400 } });
    expect(setStrength).toHaveBeenCalledWith(1250);
  });

  it('"let me practise that" reaches the drill, NOT the take-back', async () => {
    const startDrill = vi.fn();
    const takeBack = vi.fn();
    registerCoachHands({ startDrill, takeBack });
    const { intent } = await type('let me practise that');
    expect(intent?.kind).toBe('start_drill');
    expect(startDrill).toHaveBeenCalledTimes(1);
    expect(takeBack).not.toHaveBeenCalled();
  });

  it('"go back to where we were" is a RESTORE, not an undo', async () => {
    const takeBack = vi.fn();
    registerCoachHands({ takeBack });
    const { intent } = await type('go back to where we were');
    expect(intent?.kind).toBe('restore_position');
    expect(takeBack).not.toHaveBeenCalled();
  });
});

describe('the take-back COUNT is read off the board, never guessed', () => {
  it('after the coach replied it is 2 — the exchange, so it is your move again', async () => {
    const takeBack = vi.fn();
    registerCoachHands({ takeBack });
    await type('undo', { ctx: { lastMoveBy: 'coach' } });
    expect(takeBack).toHaveBeenCalledWith(2);
  });

  it('a bare undo with no game context falls to 1, never a guess', async () => {
    const takeBack = vi.fn();
    registerCoachHands({ takeBack });
    await type('undo');
    expect(takeBack).toHaveBeenCalledWith(1);
  });
});

describe('a QUESTION is never swallowed as a command', () => {
  // The router owns commands; `questionIntents` owns questions. A false
  // command fires a hand nobody asked for, which is worse than a miss —
  // a miss still reaches the brain and gets answered.
  for (const q of [
    'what is the best move here?',
    'why is my knight bad?',
    'show me the best move',          // "show me" alone must NOT be the eyes
    'can you explain the Najdorf?',
    'how do I play against the London?',
    'what should I learn next?',
  ]) {
    it(`"${q}" does not route to a hand`, () => {
      expect(tryRouteIntent(q, {})).toBeNull();
    });
  }
});

describe('honest failure — never a silent no-op, never a fake success', () => {
  it('a hand no surface provides reports the reason', async () => {
    const r = await actuate({ hand: 'take-back', count: 1 });
    expect(r.ok).toBe(false);
    // 🔴 WAS /no board/i. Six hands used to share that ONE sentence; each now
    // answers in its own words (see HAND_FALLBACK), and take-back's is about a
    // missing GAME, not a missing board — you cannot undo what was never played.
    expect(r.reason).toMatch(/no game here to take a move back/i);
  });

  it('a handler that throws becomes {ok:false}, not a crash', async () => {
    registerCoachHands({ resetBoard: () => { throw new Error('board is mid-animation'); } });
    const r = await actuate({ hand: 'reset-board' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('board is mid-animation');
  });

  it('a surface may REFUSE with a reason and it survives', async () => {
    registerCoachHands({ playMove: () => ({ ok: false, reason: 'not your turn' }) });
    const r = await actuate({ hand: 'play-move', san: 'e4' });
    expect(r).toEqual({ ok: false, reason: 'not your turn' });
  });

  it('a handler returning void is a success', async () => {
    registerCoachHands({ resetBoard: () => { /* did it */ } });
    expect(await actuate({ hand: 'reset-board' })).toEqual({ ok: true });
  });
});

describe('OBEY THE USER (David: "Always obey")', () => {
  it('an explicit command is executed, never adjudicated', async () => {
    // The spine may think a takeback is a bad idea here; it does not get a
    // veto over what the student asked for. Only impossibility refuses.
    const takeBack = vi.fn();
    registerCoachHands({ takeBack });
    const { result } = await type('let me try that again', { ctx: { lastMoveBy: 'coach' } });
    expect(takeBack).toHaveBeenCalled();
    expect(result?.ok).toBe(true);
  });
});

describe('the registry cannot strand a live surface', () => {
  it('last mount wins — the student is on one board', async () => {
    const first = vi.fn(); const second = vi.fn();
    registerCoachHands({ resetBoard: first });
    registerCoachHands({ resetBoard: second });
    await actuate({ hand: 'reset-board' });
    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });

  it('an unmount racing a mount does NOT blank the live hands', async () => {
    const stale = vi.fn(); const live = vi.fn();
    const unregisterStale = registerCoachHands({ resetBoard: stale });
    registerCoachHands({ resetBoard: live });
    unregisterStale();               // the old surface unmounts LATE
    await actuate({ hand: 'reset-board' });
    expect(live).toHaveBeenCalled(); // still wired
  });
});

describe('every hand declares a provider — the compile-time half', () => {
  it('HAND_PROVIDER covers the union with no gaps', () => {
    const hands = Object.keys(HAND_PROVIDER) as CoachHand[];
    expect(hands.length).toBeGreaterThanOrEqual(14);
    for (const h of hands) expect(['surface', 'global', 'hybrid', 'service']).toContain(HAND_PROVIDER[h]);
  });

  it('service hands work with NO surface and NO navigator — that is the point', () => {
    expect(canPerform('save-position')).toBe(true);
    expect(canPerform('restore-position')).toBe(true);
  });

  it('a surface hand is honestly unavailable until a surface provides it', () => {
    expect(canPerform('play-move')).toBe(false);
    registerCoachHands({ playMove: () => ({ ok: true }) });
    expect(canPerform('play-move')).toBe(true);
  });

  it('navigate rides the global registration', () => {
    expect(canPerform('navigate')).toBe(false);
    registerCoachNavigate(() => {});
    expect(canPerform('navigate')).toBe(true);
  });
});

describe('steppedElo — damped, clamped, and never NaN', () => {
  it('steps by one band', () => {
    expect(steppedElo(1200, 'up')).toBe(1350);
    expect(steppedElo(1200, 'down')).toBe(1050);
  });
  it('clamps rather than running away', () => {
    expect(steppedElo(2800, 'up')).toBe(2800);
    expect(steppedElo(600, 'down')).toBe(600);
  });
  it('an unknown current rating falls to the shared default, not NaN', () => {
    expect(steppedElo(undefined, 'up')).toBe(1350);
    expect(steppedElo(Number.NaN, 'up')).toBe(1350);
  });
});

describe('G3 — the adapter never invents a chess value', () => {
  it('"quiz me" with no resolved move yields NO action (empty > invented)', () => {
    const intent = tryRouteIntent('quiz me', {});
    expect(intent?.kind).toBe('quiz_me');
    expect(actionForCommand(intent as RoutedCommand, {})).toBeNull();
  });

  it('…and becomes a real quiz once the BOARD supplies the move', () => {
    const intent = tryRouteIntent('quiz me', {});
    const action = actionForCommand(intent as RoutedCommand, { quizSan: 'Nf3' });
    expect(action).toMatchObject({ hand: 'quiz-move', expectedSan: 'Nf3' });
  });

  it('"point it out" with no computed squares yields NO action', () => {
    const intent = tryRouteIntent('point it out', {});
    expect(intent?.kind).toBe('show_squares');
    expect(actionForCommand(intent as RoutedCommand, {})).toBeNull();
  });

  it('"save this position" with no board yields NO action', () => {
    const intent = tryRouteIntent('save this position', {});
    expect(intent?.kind).toBe('save_position');
    expect(actionForCommand(intent as RoutedCommand, {})).toBeNull();
  });
});


/**
 * THE OVERLAY SEQUENCE — the bug that a one-slot registry cannot survive.
 *
 * `GlobalCoachDrawer` renders the SAME `GameChatPanel` over whatever page the
 * student is on and passes it NO board callbacks. With a one-slot registry that
 * open/close cycle cost Play its hands permanently: the drawer's empty set
 * overwrote them, and its unregister cleared the slot rather than restoring
 * them, while Play's own effect had no reason to re-run.
 *
 * These drive the real `registerCoachHands` in the real order.
 */
describe('the hand registry survives an overlay', () => {
  beforeEach(() => { clearCoachHands(); });

  it('an EMPTY hand set never evicts a real one', async () => {
    const playMove = vi.fn(() => ({ ok: true }));
    registerCoachHands({ playMove });               // Play mounts
    const dropDrawer = registerCoachHands({});      // the drawer opens

    expect(canPerform('play-move')).toBe(true);
    expect(await actuate({ hand: 'play-move', san: 'e4' })).toEqual({ ok: true });
    expect(playMove).toHaveBeenCalledWith('e4');

    dropDrawer();                                   // the drawer closes
    expect(await actuate({ hand: 'play-move', san: 'e5' })).toEqual({ ok: true });
    expect(playMove).toHaveBeenCalledTimes(2);
  });

  it('an overlay WITH hands owns them, and gives them back on unmount', async () => {
    const below = vi.fn(() => ({ ok: true }));
    const above = vi.fn(() => ({ ok: true }));
    registerCoachHands({ playMove: below });
    const dropAbove = registerCoachHands({ playMove: above });

    await actuate({ hand: 'play-move', san: 'e4' });
    expect(above).toHaveBeenCalledTimes(1);
    expect(below).not.toHaveBeenCalled();

    dropAbove();
    await actuate({ hand: 'play-move', san: 'e5' });
    expect(below).toHaveBeenCalledTimes(1);
  });

  it('an OUT-OF-ORDER unmount evicts only its own entry', async () => {
    // React does not promise LIFO unmount across trees, so the underneath
    // surface can go first. It must not take the top owner down with it.
    const first = vi.fn(() => ({ ok: true }));
    const second = vi.fn(() => ({ ok: true }));
    const dropFirst = registerCoachHands({ playMove: first });
    registerCoachHands({ playMove: second });

    dropFirst();
    await actuate({ hand: 'play-move', san: 'e4' });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('with NOTHING mounted the answer is an honest refusal, never a fake ok', async () => {
    const r = await actuate({ hand: 'play-move', san: 'e4' });
    expect(r.ok).toBe(false);
    expect(r.reason, 'a refusal must say why').toBeTruthy();
  });
});


describe('a hand that REJECTS is caught, not leaked', () => {
  beforeEach(() => { clearCoachHands(); });

  it('an async throw becomes {ok:false}, never an unhandled rejection', async () => {
    // `actuate` wraps its switch in try/catch, but `return settle(...)` without
    // `await` hands the promise back BEFORE the catch can see it — the rejection
    // escapes and the caller gets a bare promise that blows up elsewhere. That
    // is the same defect as throwing inside a `.then` in `onNavigate`, and
    // eslint's `return-await` flagged all 13 sites. This holds the behaviour.
    registerCoachHands({ playMove: () => Promise.reject(new Error('board is mid-animation')) });
    const r = await actuate({ hand: 'play-move', san: 'e4' });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/board is mid-animation/);
  });

  it('a synchronous throw is caught too', async () => {
    registerCoachHands({ takeBack: () => { throw new Error('nothing to undo'); } });
    const r = await actuate({ hand: 'take-back', count: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/nothing to undo/);
  });
});


/**
 * THE INVERSION: A HAND IS THE COACH'S, NOT A SURFACE'S (2026-09-21).
 *
 * David: "if we have a unified coach, how can review have things that learn
 * doesn't? Don't we just build up the coach, then all surfaces get them
 * automatically, it's just the tools that use them differently?"
 *
 * These hold the answer in code. With NOTHING mounted, a hand that can route
 * routes, and one that genuinely cannot says why in its OWN words — never the
 * one flat sentence six different questions used to share.
 */
describe('every hand answers without a surface', () => {
  beforeEach(() => { clearCoachHands(); clearCoachNavigate(); });

  it('declares a fallback for EVERY hand — no hand can be added without one', () => {
    // The Record is the forcing function; this proves it is populated rather
    // than merely typed, and that no entry is a silent empty object.
    const hands = Object.keys(HAND_FALLBACK) as CoachHand[];
    expect(hands.length).toBeGreaterThanOrEqual(14);
    for (const h of hands) {
      const fb = HAND_FALLBACK[h];
      expect(['global', 'service', 'route', 'none'], h).toContain(fb.kind);
      if (fb.kind === 'none') {
        expect(fb.because.length, `${h} refuses without saying why`).toBeGreaterThan(20);
      }
      if (fb.kind === 'route') expect(fb.to.startsWith('/'), h).toBe(true);
    }
  });

  it('a ROUTING hand takes the student somewhere it works', async () => {
    const nav = vi.fn();
    registerCoachNavigate(nav);
    const r = await actuate({ hand: 'start-drill', motif: null });
    expect(r.ok, 'start-drill must not dead-end on a surface with no runner').toBe(true);
    expect(nav).toHaveBeenCalledWith('/tactics/calculation');
  });

  it('a REFUSING hand says why in its own words, not one shared sentence', async () => {
    const play = await actuate({ hand: 'play-move', san: 'e4' });
    const quiz = await actuate({ hand: 'quiz-move', expectedSan: 'e4', prompt: 'x' });
    expect(play.ok).toBe(false);
    expect(quiz.ok).toBe(false);
    // The bug this replaces: six hands returned the IDENTICAL string, so the
    // student got "no board on this surface" for six different questions.
    expect(play.reason).not.toEqual(quiz.reason);
    expect(play.reason).toMatch(/board/i);
    expect(quiz.reason).toMatch(/quiz/i);
  });

  it('the SURFACE still wins when one is mounted', async () => {
    // The fallback is a floor, never an override — a surface that implements a
    // hand must keep owning it.
    const nav = vi.fn();
    registerCoachNavigate(nav);
    const startDrill = vi.fn(() => ({ ok: true }));
    registerCoachHands({ startDrill });
    const r = await actuate({ hand: 'start-drill', motif: 'fork' });
    expect(r.ok).toBe(true);
    expect(startDrill).toHaveBeenCalled();
    expect(nav, 'a mounted surface must not be navigated away from').not.toHaveBeenCalled();
  });
});
