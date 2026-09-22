/**
 * WHO PRODUCED THE ASK — the property, end to end (WO-STANDARD-01 H6).
 *
 * `coach_question_asked` was 10× inflated on native: 173 canned best-move taps
 * (one device) + 115 hint prompts against ~28 typed questions in 30 days. The
 * events are never deleted — they are DISTINGUISHED by `ask_source`. Proof is
 * the emitted PROPERTY: the classifier's verdict per producer, and the
 * analytics prop builder forwarding it under the name the recipe reads.
 */
import { describe, it, expect } from 'vitest';
import { askSourceFor, INTERNAL_ASK_SURFACES } from './questionIntents';
import { buildEventProps } from '../services/analytics';
import type { AuditEntry } from '../services/appAuditor';

describe('askSourceFor — the one classifier', () => {
  it('a hint tap is `hint`, whatever origin the caller claims', () => {
    expect(askSourceFor('hint', undefined)).toBe('hint');
    expect(askSourceFor('hint', 'typed')).toBe('hint');
  });
  it('the other composed-prompt surfaces are `internal`', () => {
    for (const s of INTERNAL_ASK_SURFACES) {
      if (s === 'hint') continue;
      expect(askSourceFor(s, undefined), s).toBe('internal');
    }
  });
  it('the canned best-move button on Play is `canned-best-move`', () => {
    expect(askSourceFor('game-chat', 'canned-best-move')).toBe('canned-best-move');
  });
  it('NEGATIVE CONTROL — a chat surface with no declared origin is a typed question', () => {
    expect(askSourceFor('game-chat', undefined)).toBe('typed');
    expect(askSourceFor('teach', undefined)).toBe('typed');
    expect(askSourceFor('home-chat', undefined)).toBe('typed');
  });
});

describe('the property reaches PostHog as ask_source', () => {
  const entry = (askSource: AuditEntry['askSource']): AuditEntry => ({
    kind: 'coach-brain-ask-received',
    category: 'subsystem',
    source: 'coachService.ask',
    summary: 'surface=game-chat …',
    timestamp: 1,
    buildId: 'test',
    askSource,
  } as AuditEntry);

  it('forwards every value verbatim', () => {
    for (const v of ['typed', 'hint', 'canned-best-move', 'internal'] as const) {
      expect(buildEventProps(entry(v)).ask_source).toBe(v);
    }
  });
  it('NEGATIVE CONTROL — an entry without one carries no ask_source key (older rows stay honest)', () => {
    expect('ask_source' in buildEventProps(entry(undefined))).toBe(false);
  });
});
