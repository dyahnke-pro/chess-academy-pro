import { describe, it, expect } from 'vitest';
import {
  auditKindToEvent,
  buildEventProps,
  captureEvent,
  captureException,
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
    expect(() => captureException(new Error('boom'), { surface: 'coach' })).not.toThrow();
    expect(() => identifyUser('user-123', { email: 'x@y.z' })).not.toThrow();
    expect(() => resetAnalytics()).not.toThrow();
    expect(() => mirrorAuditEvent(entry())).not.toThrow();
  });

  it('crash kinds route through the exception bridge without throwing', () => {
    for (const kind of ['uncaught-error', 'unhandled-rejection', 'error-boundary'] as const) {
      expect(() =>
        mirrorAuditEvent(entry({ kind, category: 'runtime', details: 'Error: x\n  at y' })),
      ).not.toThrow();
    }
  });
});

describe('crash kinds are NOT in the product-event allowlist', () => {
  it('error kinds are exceptions, not funnel events', () => {
    expect(auditKindToEvent('uncaught-error')).toBeUndefined();
    expect(auditKindToEvent('unhandled-rejection')).toBeUndefined();
    expect(auditKindToEvent('error-boundary')).toBeUndefined();
  });
});

describe('stockfish defects route to Error Tracking (David 2026-06-15)', () => {
  it('engine error + stall route through the exception bridge (→ error report → autofix build)', () => {
    for (const kind of ['stockfish-error', 'stockfish-analysis-stalled'] as const) {
      expect(() =>
        mirrorAuditEvent(entry({ kind, category: 'subsystem', summary: 'engine dead' })),
      ).not.toThrow();
      // Defects are $exceptions, never funnel events.
      expect(auditKindToEvent(kind)).toBeUndefined();
    }
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

  it('mirrors voice / narration kinds so voice bugs are diagnosable in PostHog', () => {
    // David 2026-06-04 ("can we add voice events to hog?"). The summary
    // carries the gate that fired (brief-cap N→0 / silenced / no-content),
    // which is how a Brief-silence bug gets diagnosed without the app open.
    expect(auditKindToEvent('voice-speak-invoked')).toBe('voice_spoken');
    expect(auditKindToEvent('coach-narration-spoken')).toBe('coach_narration_spoken');
    expect(auditKindToEvent('coach-move-narration-fired')).toBe('coach_narration_fired');
    expect(auditKindToEvent('coach-move-narration-skipped')).toBe('coach_narration_skipped');
    // The actual playback failure (iOS autoplay rejection / decode / non-200)
    // must reach PostHog so "no voice" reports are diagnosable (David 2026-06-06).
    expect(auditKindToEvent('tts-failure')).toBe('tts_failure');
  });

  it('returns undefined for forensic/high-volume kinds that should NOT mirror', () => {
    // Per the doctrine: per-move noise + crash forensics stay out of PostHog.
    expect(auditKindToEvent('move-attempt')).toBeUndefined();
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

  it('forwards the FULL narration text (not the 40-char summary preview) to PostHog', () => {
    // David 2026-06-06: the full spoken line must reach PostHog for narration-
    // accuracy review. summary stays a short preview; narration_text is the
    // complete line (bounded at 2000, well above any single sentence).
    const full = 'The knight on f6 defends e4 and eyes the d5 outpost while the bishop pins nothing here.';
    const props = buildEventProps(entry({ kind: 'coach-narration-spoken', narrationText: full }));
    expect(props.narration_text).toBe(full);
  });

  it('bounds narration_text at 2000 chars', () => {
    const props = buildEventProps(entry({ kind: 'coach-narration-spoken', narrationText: 'x'.repeat(5000) }));
    expect((props.narration_text as string).length).toBe(2000);
  });
});
