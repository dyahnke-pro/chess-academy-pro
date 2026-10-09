/**
 * REQUESTS ARE DONE FROM THEIR STEPS (WO-CHAT-01 P1, live walk 2026-10-09).
 * Each case is a real turn from the walk; each failed on the old code.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeSteps } from './requestExecutor';
import type { ResolvedStep } from './requestSteps';
import { dispatchCoachTurn, setChatTurnReaderForTests, resetConversations, conversationFor } from './dispatchCoachTurn';

const step = (action: ResolvedStep['action'], openingName: string | null = null, extra: Partial<ResolvedStep> = {}): ResolvedStep =>
  ({ action, opening: openingName, openingName, side: null, account: null, ...extra });

describe('executeSteps', () => {
  it('teach-opening opens THAT lesson by its resolved name', () => {
    const o = executeSteps([step('teach-opening', 'Italian Game')], { hasBoard: false, pending: null });
    expect(o?.path).toBe('/coach/teach?opening=Italian%20Game');
    expect(o?.text).toBe('Opening the Italian Game lesson.');
  });
  it('R8: "reset and teach me the Italian" with no board teaches (the lesson starts fresh)', () => {
    const o = executeSteps([step('reset-board'), step('teach-opening', 'Italian Game')], { hasBoard: false, pending: null });
    expect(o?.path).toContain('opening=Italian');
  });
  it('a board step on a board surface is that surface\'s to do', () => {
    expect(executeSteps([step('reset-board'), step('teach-opening', 'Italian Game')], { hasBoard: true, pending: null })).toBeNull();
  });
  it('two places: the first now, the second waits for "go"', () => {
    const o = executeSteps([step('teach-opening', 'Caro-Kann Defense'), step('play-game', 'Caro-Kann Defense', { side: 'black' })], { hasBoard: false, pending: null });
    expect(o?.path).toContain('Caro-Kann');
    expect(o?.pending?.[0].action).toBe('play-game');
    expect(o?.text).toMatch(/say "go"/);
  });
  it('R7: "can I start now?" runs what was offered', () => {
    const o = executeSteps([step('start-now')], { hasBoard: false, pending: [step('teach-opening', 'Italian Game')] });
    expect(o?.path).toContain('opening=Italian');
  });
  it('start-now with nothing offered says so, never answers a board question', () => {
    const o = executeSteps([step('start-now')], { hasBoard: false, pending: null });
    expect(o?.text).toMatch(/^Start what\?/);
    expect(o?.path).toBeUndefined();
  });
  it('R9: a username offers the import, naming the account', () => {
    const o = executeSteps([step('import-games', null, { account: 'Knight_mare_01' })], { hasBoard: false, pending: null });
    expect(o?.text).toMatch(/Knight_mare_01/);
    expect(o?.actionOffer).toEqual([{ type: 'import_games', id: 'connect' }]);
  });
  it('R6: a training plan opens the plan page', () => {
    expect(executeSteps([step('training-plan')], { hasBoard: false, pending: null })?.path).toBe('/coach/plan');
  });
});

describe('the door does a request from its reading', () => {
  beforeEach(() => {
    resetConversations();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 404 }));
  });
  afterEach(() => { setChatTurnReaderForTests(undefined); vi.restoreAllMocks(); });

  const ask = (text: string, reading: unknown, onNavigate?: (p: string) => void) => {
    setChatTurnReaderForTests(async () => reading as never);
    return dispatchCoachTurn({
      surface: 'standalone-chat', ask: text, origin: 'typed',
      liveState: { surface: 'standalone-chat', currentRoute: '/coach/chat' },
    } as never, { maxToolRoundTrips: 1, onNavigate });
  };

  it('R5: "…teach me" opens the Italian, never an opening called "me"', async () => {
    const went: string[] = [];
    const a = await ask('I want to practice the Italian opening, teach me',
      { kind: 'training-request', referents: [], seat: 'none', english: 'x', steps: [{ action: 'teach-opening', opening: 'Italian opening' }] },
      (p) => went.push(p));
    expect(went).toEqual(['/coach/teach?opening=Italian%20Game']);
    expect(a.text).toBe('Opening the Italian Game lesson.');
  });

  it('an opening nothing resolves is asked back', async () => {
    const a = await ask('teach me the Flibbertigibbet Attack',
      { kind: 'training-request', referents: [], seat: 'none', english: 'x', steps: [{ action: 'teach-opening', opening: 'Flibbertigibbet Attack' }] });
    expect(a.text).toMatch(/There's no opening called "Flibbertigibbet Attack"/);
  });

  it('R7: the offer survives to the next turn and "go" runs it', async () => {
    const went: string[] = [];
    await ask('walk me through the caro kann then play it with me as black',
      { kind: 'command', referents: [], seat: 'none', english: 'x', steps: [{ action: 'teach-opening', opening: 'caro kann' }, { action: 'play-game', opening: 'caro kann', side: 'black' }] },
      (p) => went.push(p));
    // the settle that folds the reading runs async; let it land
    await new Promise((r) => setTimeout(r, 20));
    expect(conversationFor('standalone-chat' as never).pending?.[0].action).toBe('play-game');
    await ask('go', { kind: 'command', referents: [], seat: 'none', english: 'go', steps: [{ action: 'start-now' }] }, (p) => went.push(p));
    expect(went[1]).toMatch(/^\/coach\/session\/play-against\?subject=Caro-Kann/);
    expect(went[1]).toContain('side=black');
  });
});
