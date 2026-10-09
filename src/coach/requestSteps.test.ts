/**
 * REQUEST STEPS (WO-CHAT-01 P1). The opening a request names is resolved by
 * code through the one resolver — never cut out of the sentence by position,
 * never guessed at a near name.
 */
import { describe, it, expect } from 'vitest';
import { coerceSteps, readAccountName, resolveSteps, requestStepsPrompt, REQUEST_ACTIONS } from './requestSteps';
import { coerceChatTurn } from './chatTurnParser';
import { validateChatTurn } from './chatTurn';

describe('coerceSteps', () => {
  it('keeps known actions in order, drops the rest, invents nothing', () => {
    const s = coerceSteps([
      { action: 'reset-board' },
      { action: 'teach-opening', opening: ' the Italian ', side: 'none' },
      { action: 'launch-rocket' },
      'junk',
    ]);
    expect(s).toEqual([
      { action: 'reset-board', opening: null, side: null, account: null },
      { action: 'teach-opening', opening: 'the Italian', side: null, account: null },
    ]);
  });
});

describe('resolveSteps — the one resolver names the opening', () => {
  it('the walk\'s phrasings resolve to the Italian Game', () => {
    for (const opening of ['the Italian', 'Italian Opening', 'Italian']) {
      const r = resolveSteps([{ action: 'teach-opening', opening, side: null, account: null }]);
      expect(r.ok && r.steps[0].openingName).toBe('Italian Game');
    }
  });
  it('an opening nothing resolves is asked back, never guessed', () => {
    const r = resolveSteps([{ action: 'teach-opening', opening: 'Flibbertigibbet Attack', side: null, account: null }]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.clarify).toMatch(/Flibbertigibbet/);
  });
});

describe('a request reading through the form', () => {
  it('a compound request keeps both steps, in order, resolved', () => {
    const c = coerceChatTurn({ kind: 'command', referents: [], seat: 'none', english: 'x', steps: [{ action: 'reset-board' }, { action: 'teach-opening', opening: 'the Italian' }] });
    const v = validateChatTurn(c!.turn, { fen: null } as never);
    expect(v.ok).toBe(true);
    expect(v.ok && v.turn.steps?.map((s) => [s.action, s.openingName])).toEqual([['reset-board', null], ['teach-opening', 'Italian Game']]);
  });
  it('a question carries no steps', () => {
    const c = coerceChatTurn({ kind: 'plan', referents: [], seat: 'me', english: 'x' });
    expect(c!.turn.steps).toBeUndefined();
  });
  it('the reader is told every action', () => {
    for (const a of REQUEST_ACTIONS) expect(requestStepsPrompt()).toContain(a);
  });
});

describe('readAccountName — a handle is a shape, not a sentence', () => {
  it('a real App Store turn reads as an import request', () => {
    expect(readAccountName('Knight_mare_01')?.steps[0]).toEqual({ action: 'import-games', opening: null, side: null, account: 'Knight_mare_01' });
  });
  it.each(['D5', 'Nxe5', 'O-O', 'e2e4', 'hello', 'thanks!', 'what about Nf3', 'Qh7#'])('%s is not a username', (t) => {
    expect(readAccountName(t)).toBeNull();
  });
});
