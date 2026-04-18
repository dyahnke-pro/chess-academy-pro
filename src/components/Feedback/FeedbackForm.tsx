import { useState, useCallback } from 'react';
import { MessageSquare, X, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

/**
 * FeedbackForm — in-app feedback surface, mailto-based submission.
 *
 * Why mailto (not a third-party form service) at launch:
 *   - Zero backend, zero signup, zero ongoing fee
 *   - Works offline (the form captures; email client queues)
 *   - Privacy-preserving — no intermediate service sees the message
 *   - Upgradeable to Formspree / Resend / custom endpoint later
 *     without changing the user-facing flow
 *
 * User flow:
 *   1. Tap "Send Feedback" from Settings → About
 *   2. Pick category + rating + type message
 *   3. Tap Submit → opens their mail client with subject + body
 *      pre-filled and addressed to support@chessacademy.pro
 *
 * IMPORTANT: Update SUPPORT_EMAIL before launch if you change
 * support addresses.
 */
const SUPPORT_EMAIL = 'support@chessacademy.pro';

type FeedbackCategory = 'bug' | 'feature' | 'praise' | 'other';

interface FeedbackFormProps {
  onClose: () => void;
}

export function FeedbackForm({ onClose }: FeedbackFormProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback((): void => {
    const appVersion = (typeof window !== 'undefined'
      ? (window.location.hostname || 'unknown')
      : 'unknown');
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const displayName = activeProfile?.name ?? 'Anonymous';

    const subjectMap: Record<FeedbackCategory, string> = {
      bug: 'Bug report',
      feature: 'Feature request',
      praise: 'Kind words',
      other: 'Feedback',
    };

    const subject = `[${subjectMap[category]}] Chess Academy Pro`;

    const lines = [
      message.trim() || '(no message)',
      '',
      '---',
      `From: ${displayName}`,
      contactEmail.trim() ? `Reply to: ${contactEmail.trim()}` : 'Reply to: (not provided)',
      rating !== null ? `Rating: ${rating}/5` : 'Rating: (not provided)',
      `App: ${appVersion}`,
      `Device: ${userAgent}`,
    ];
    const body = lines.join('\n');

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  }, [category, rating, message, contactEmail, activeProfile]);

  if (submitted) {
    return (
      <div className="p-6 text-center" data-testid="feedback-submitted">
        <Check
          size={40}
          className="mx-auto mb-3"
          style={{ color: 'var(--color-accent)' }}
        />
        <h3 className="font-semibold text-lg mb-2">Thanks — your mail app is opening.</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Hit send once your message composes. If nothing opened, email us
          directly at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="underline"
            style={{ color: 'var(--color-accent)' }}
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="feedback-close"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-4" data-testid="feedback-form">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} style={{ color: 'var(--color-accent)' }} />
          <h3 className="font-semibold text-base">Send feedback</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
          aria-label="Close feedback form"
          data-testid="feedback-cancel"
        >
          <X size={18} />
        </button>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        Found a bug, have an idea, or just want to say hi? The fastest way
        to shape this app is to tell us directly.
      </p>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Category
        </label>
        <div className="grid grid-cols-4 gap-2">
          {(['bug', 'feature', 'praise', 'other'] as FeedbackCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg capitalize border"
              style={{
                background: category === c ? 'var(--color-accent)' : 'var(--color-bg)',
                color: category === c ? 'var(--color-bg)' : 'var(--color-text)',
                borderColor: category === c ? 'var(--color-accent)' : 'var(--color-border)',
              }}
              data-testid={`feedback-category-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Rating (optional)
        </label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(rating === n ? null : n)}
              className="flex-1 py-2 rounded-lg font-semibold text-sm border"
              style={{
                background: rating !== null && n <= rating ? 'var(--color-accent)' : 'var(--color-bg)',
                color: rating !== null && n <= rating ? 'var(--color-bg)' : 'var(--color-text)',
                borderColor: 'var(--color-border)',
              }}
              data-testid={`feedback-rating-${n}`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Your message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={categoryPlaceholder(category)}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
          style={{
            background: 'var(--color-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          data-testid="feedback-message"
        />
      </div>

      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
          Your email (optional — so we can reply)
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            background: 'var(--color-bg)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          data-testid="feedback-email"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!message.trim()}
        className="py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40"
        style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
        data-testid="feedback-submit"
      >
        Open mail to send
      </button>

      <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
        Your feedback opens in your mail app, addressed to {SUPPORT_EMAIL}. No
        data is sent anywhere else.
      </p>
    </div>
  );
}

function categoryPlaceholder(c: FeedbackCategory): string {
  switch (c) {
    case 'bug':
      return 'What went wrong? Steps to reproduce help a lot — "I did X, expected Y, got Z."';
    case 'feature':
      return 'What would you like the coach to do that it currently doesn\'t?';
    case 'praise':
      return 'What\'s working well? What made you smile? What would you tell a chess friend?';
    case 'other':
    default:
      return 'Tell us anything — a question, a concern, a thought.';
  }
}
