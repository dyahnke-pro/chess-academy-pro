import { describe, it, expect } from 'vitest';
import {
  auditKindToEvent,
  buildEventProps,
  captureEvent,
  identifyUser,
  resetAnalytics,
  mirrorAuditEvent,
  isAnalyticsEnabled,
  initAnalytics,
} from './analytics';
import type { AuditEntry } from './appAuditor';

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    timestamp: 1,
    kind: 'lesson-completed',
    category: 'app',
    summary: 'finished the Caro-Kann main line',
    source: 'LessonPlayer',
    ...overrides,
  };
}

describe('analytics — no-op without a PostHog key', () => {
  it('initAnalytics + isAnalyticsEnabled stays false when no key is configured', () => {
    // No VITE_POSTHOG_KEY in the test env → analytics is a hard no-op.
    initAnalytics({ optedOut: false });
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('every public function is total — never throws when disabled', () => {
    expect(() => captureEvent('checkout_started', { plan: 'annual' })).not.toThrow();
    expect(() => identifyUser('user-123', { email: 'x@y.z' })).not.toThrow();
    expect(() => resetAnalytics()).not.toThrow();
    expect(() => mirrorAuditEvent(entry())).not.toThrow();
  });
});

describe('auditKindToEvent — curated allowlist', () => {
  it('maps high-signal product kinds to event names', () => {
    expect(auditKindToEvent('app-boot')).toBe('app_opened');
    expect(auditKindToEvent('lesson-completed')).toBe('lesson_completed');
    expect(auditKindToEvent('llm-token-usage')).toBe('llm_call');
    expect(auditKindToEvent('opening-cache-miss')).toBe('opening_generated');
    expect(auditKindToEvent('coach-brain-ask-received')).toBe('coach_question_asked');
  });

  it('returns undefined for forensic/high-volume kinds that should NOT mirror', () => {
    // Per the doctrine: per-move + raw voice noise stays out of PostHog.
    expect(auditKindToEvent('move-attempt')).toBeUndefined();
    expect(auditKindToEvent('voice-speak-invoked')).toBeUndefined();
    expect(auditKindToEvent('tts-failure')).toBeUndefined();
    expect(auditKindToEvent('uncaught-error')).toBeUndefined();
  });
});

describe('buildEventProps — lean, safe payloads', () => {
  it('projects the safe field subset and never includes raw details dumps', () => {
    const props = buildEventProps(
      entry({
        route: '/openings/caro-kann',
        context: 'tab=main',
        buildId: 'abc123+1700000000000',
        details: 'a'.repeat(5000), // stack-trace-sized blob must be dropped
      }),
    );
    expect(props.audit_kind).toBe('lesson-completed');
    expect(props.source).toBe('LessonPlayer');
    expect(props.route).toBe('/openings/caro-kann');
    expect(props.context).toBe('tab=main');
    expect(props.build_id).toBe('abc123+1700000000000');
    expect(props).not.toHaveProperty('details');
  });

  it('truncates oversized summary/context to 200 chars', () => {
    const props = buildEventProps(entry({ summary: 's'.repeat(400), context: 'c'.repeat(400) }));
    expect((props.summary as string).length).toBe(200);
    expect((props.context as string).length).toBe(200);
  });
});
