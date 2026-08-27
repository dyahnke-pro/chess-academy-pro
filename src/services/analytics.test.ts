import { describe, it, expect } from 'vitest';
import {
  auditKindToEvent,
  buildEventProps,
  captureEvent,
  captureException,
  identifyUser,
  setUserProperties,
  resetAnalytics,
  mirrorAuditEvent,
  isAnalyticsEnabled,
  initAnalytics,
  resolvePlatformSuperProps,
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
    expect(() => setUserProperties({ is_pro: true }, { first_seen_at: 'now' })).not.toThrow();
    expect(() => setUserProperties()).not.toThrow();
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

describe('platform super-properties (the "real downloaders" filter)', () => {
  it('tags web in a plain (non-native, non-standalone) env', () => {
    const props = resolvePlatformSuperProps();
    // jsdom test env: not Capacitor-native, not display-mode standalone.
    expect(props.platform).toBe('web');
    expect(props.is_native).toBe(false);
    expect(props).not.toHaveProperty('native_platform');
  });

  it('always returns the three core keys, never throws', () => {
    let props: Record<string, unknown> = {};
    expect(() => {
      props = resolvePlatformSuperProps();
    }).not.toThrow();
    expect(props).toHaveProperty('platform');
    expect(props).toHaveProperty('is_native');
    expect(props).toHaveProperty('is_standalone');
    expect(['native', 'pwa', 'web']).toContain(props.platform);
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

describe('defect-kind exceptions carry the diagnostic text (David: unreproducible sanitizer-leak)', () => {
  // A real `sanitizer-leak` fired in prod with nothing but the generic
  // "Piece-letter shorthand survived sanitizeForTTS" summary — the actual
  // leaked TEXT lived only in `details`, which this exception path used to
  // drop entirely (only summary/route/fen/build_id survived), and the
  // audit-stream buffer that held it had already rotated by the time anyone
  // looked. `details` and `narrationText` now ride along on every
  // DEFECT_KINDS/CRASH_KINDS exception so the next one is reproducible.
  it('mirrorAuditEvent does not throw with details/narrationText present on an exception-class kind', () => {
    expect(() =>
      mirrorAuditEvent(
        entry({
          kind: 'sanitizer-leak',
          category: 'subsystem',
          summary: 'Piece-letter shorthand survived sanitizeForTTS',
          details: 'text: The N on f6 hangs to the bishop.',
          narrationText: 'The N on f6 hangs to the bishop.',
        }),
      ),
    ).not.toThrow();
    // sanitizer-leak is a defect (exception), never a funnel event.
    expect(auditKindToEvent('sanitizer-leak')).toBeUndefined();
  });
});

describe('auditKindToEvent — curated allowlist', () => {
  it('maps high-signal product kinds to event names', () => {
    expect(auditKindToEvent('app-boot')).toBe('app_opened');
    expect(auditKindToEvent('lesson-completed')).toBe('lesson_completed');
    expect(auditKindToEvent('llm-token-usage')).toBe('llm_call');
    expect(auditKindToEvent('opening-cache-miss')).toBe('opening_generated');
    expect(auditKindToEvent('coach-brain-ask-received')).toBe('coach_question_asked');
    // Full ask→answer capture (David 2026-07-10: "full access to the
    // conversations") mirrors as its own queryable product event.
    expect(auditKindToEvent('coach-brain-answered')).toBe('coach_answer');
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
    // The in-flow Polly → Web Speech demotion — the every-line no-sound
    // signal on iOS — must be visible in durable analytics (David 2026-06-27).
    expect(auditKindToEvent('voice-fallover')).toBe('voice_fallover');
    expect(auditKindToEvent('polly-fallback')).toBe('polly_fallback');
  });

  it('routes a caught grounding-gate trip to an event, NOT an $exception', () => {
    // A `claim-validator-trip` = the guardrail CAUGHT the LLM inventing chess
    // and dropped the sentence — a success, not a defect. It must mirror as a
    // queryable event (rate = the G0 "LLM still deciding" signal) and NOT hit
    // the exception bridge / autofix cron (David 2026-07-04). The exhaustion
    // fallback stays a defect and is asserted below.
    expect(auditKindToEvent('claim-validator-trip')).toBe('coach_grounding_gate_tripped');
    expect(auditKindToEvent('master-play-enforcement-fallback')).toBeUndefined();
    expect(auditKindToEvent('coach-board-claim-blocked')).toBeUndefined();
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

  it('forwards the FULL ask + answer for durable conversation capture', () => {
    // David 2026-07-10: "add the audit tools to tell what the asks are — full
    // access to the conversations". The whole turn (ask + reply) reaches
    // PostHog as ask_text / answer_text, not the 60-char summary preview.
    const ask = 'why is knight to d5 the best move here and what does it threaten?';
    const answer = 'The knight to d5 forks the queen on c7 and the bishop on e7 — it wins material.';
    const props = buildEventProps(entry({ kind: 'coach-brain-answered', askText: ask, answerText: answer }));
    expect(props.ask_text).toBe(ask);
    expect(props.answer_text).toBe(answer);
  });

  it('forwards the feedback reply-to + rating durably (so we can respond)', () => {
    // David 2026-08-27: a native-iOS user typed an email asking for a reply,
    // but only summary/details reached us and details isn't forwarded — so the
    // address was lost. These fields carry it to PostHog on feedback events.
    const props = buildEventProps(
      entry({ kind: 'feedback-submitted', feedbackEmail: 'reply@me.com', feedbackRating: 4 }),
    );
    expect(props.feedback_email).toBe('reply@me.com');
    expect(props.feedback_rating).toBe(4);
  });

  it('omits feedback_email / feedback_rating when the user gave neither', () => {
    const props = buildEventProps(entry({ kind: 'feedback-submitted' }));
    expect(props).not.toHaveProperty('feedback_email');
    expect(props).not.toHaveProperty('feedback_rating');
  });

  it('bounds ask_text / answer_text at 4000 chars', () => {
    const props = buildEventProps(
      entry({ kind: 'coach-brain-answered', askText: 'a'.repeat(9000), answerText: 'b'.repeat(9000) }),
    );
    expect((props.ask_text as string).length).toBe(4000);
    expect((props.answer_text as string).length).toBe(4000);
  });
});
