/**
 * feedback — in-app "Feedback" capture (David 2026-07-13).
 * --------------------------------------------------------
 * The general-feedback siblings of `bugReport.ts`. The header "Feedback" pill
 * (QuickFeedbackButton, every screen) and Settings → About "Send feedback"
 * (FeedbackForm) used to be PURE mailto/share — nothing was captured, so a
 * user's note only reached us IF their mail client actually sent it, and the
 * share-sheet path could vanish it entirely. That left David blind: no record,
 * no alert.
 *
 * This rides the SAME rails as bug reports (BRIDGE, DON'T DUPLICATE): it emits
 * a `feedback-submitted` audit which (a) streams to the audit-stream so a
 * session can read it live + alert on it, and (b) flows to PostHog as a
 * `feedback_submitted` event via the allowlist. The mailto/share still fires
 * afterward as a convenience, but capture no longer depends on it.
 *
 * `fetch`-based capture (via logAppAudit's audit-stream POST) is reliable where
 * mailto is not — so this is the load-bearing path now; the mail draft is just
 * a bonus for users who want a reply thread.
 */
import { getBuildId, getSessionId, logAppAudit } from './appAuditor';

const MAX_MESSAGE = 2000;

export type FeedbackCategory = 'bug' | 'feature' | 'praise' | 'other' | 'quick';

export interface FeedbackInput {
  message: string;
  category: FeedbackCategory;
  /** Which surface sent it — for the alert to name the entry point. */
  source: string;
  /** Optional 1-5 rating (FeedbackForm only). */
  rating?: number | null;
  /** Optional reply-to address the user typed. */
  contactEmail?: string;
  /** Optional route the user was on when they sent it (QuickFeedbackButton). */
  route?: string;
  /** Optional profile display name. */
  profileName?: string;
}

/** Submit in-app feedback. Resolves true if the capturing audit was emitted.
 *  Never throws — a failed capture must not break the user's send flow. */
export async function submitFeedback(input: FeedbackInput): Promise<boolean> {
  try {
    const message = input.message.trim().slice(0, MAX_MESSAGE);
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const ratingLine =
      typeof input.rating === 'number' ? `RATING: ${input.rating}/5` : 'RATING: (none)';

    await logAppAudit({
      kind: 'feedback-submitted',
      category: 'app',
      source: input.source,
      // The category + message lead the summary so the audit-stream / PostHog
      // one-liner + the alert read cleanly ("[praise] love the coach voice").
      summary: `[${input.category}] ${message || '(no message)'}`.slice(0, 200),
      // Explicit route: the route the user was ON when they opened QuickFeedback
      // (logAppAudit now accepts an override, else auto-derives from location).
      route: input.route,
      details: [
        `CATEGORY: ${input.category}`,
        ratingLine,
        `FROM: ${input.profileName ?? 'Anonymous'}`,
        `REPLY-TO: ${input.contactEmail?.trim() || '(not provided)'}`,
        `MESSAGE:\n${message || '(none)'}`,
        `BUILD: ${getBuildId()}`,
        `SESSION: ${getSessionId()}`,
        `UA: ${ua}`,
      ].join('\n\n'),
    });
    return true;
  } catch {
    return false;
  }
}
