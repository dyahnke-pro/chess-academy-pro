import { useState, useCallback, useRef } from 'react';
import { MessageSquarePlus, Camera, X, Send, Loader2, Check } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';

/**
 * QuickFeedbackButton — always-on floating feedback surface.
 *
 * Rendered inside AppLayout so it appears on every page. Tapping
 * opens a slide-in panel that lives over the current screen without
 * navigating away — the user keeps their context.
 *
 * The panel supports:
 *   - A one-sentence "what's on your mind" capture
 *   - One-tap screenshot of the current page via html2canvas
 *   - Optional email for reply
 *
 * Submission prefers navigator.share (so screenshots attach on mobile
 * via the native share sheet), falling back to a mailto: link when
 * share-with-files isn't available. This keeps "minimum overhead"
 * intact — no third-party form service, no backend.
 *
 * IMPORTANT: Update SUPPORT_EMAIL when the real address is decided.
 */
const SUPPORT_EMAIL = 'support@chessacademy.pro';

type SubmitState = 'idle' | 'capturing' | 'sending' | 'sent';

export function QuickFeedbackButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [screenshot, setScreenshot] = useState<{ blob: Blob; url: string } | null>(null);
  const activeProfile = useAppStore((s) => s.activeProfile);
  const panelRef = useRef<HTMLDivElement>(null);

  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => {
    setOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setMessage('');
      setEmail('');
      if (screenshot) URL.revokeObjectURL(screenshot.url);
      setScreenshot(null);
      setSubmitState('idle');
    }, 300);
  }, [screenshot]);

  const captureScreenshot = useCallback(async () => {
    setSubmitState('capturing');
    try {
      // html2canvas is client-only and ~48KB gzipped — dynamic-import
      // so it doesn't block the initial app bundle. Panel is closed
      // during capture so it doesn't appear in the screenshot.
      setOpen(false);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(document.body, {
        logging: false,
        useCORS: true,
        backgroundColor: null,
        // Keep the output reasonable — most screens compress fine at
        // half resolution, and mail clients reject huge attachments.
        scale: Math.min(window.devicePixelRatio || 1, 1.5),
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.9);
      });
      if (!blob) {
        setSubmitState('idle');
        setOpen(true);
        return;
      }
      const url = URL.createObjectURL(blob);
      setScreenshot({ blob, url });
      setSubmitState('idle');
      setOpen(true);
    } catch (err) {
      console.warn('[QuickFeedback] screenshot capture failed:', err);
      setSubmitState('idle');
      setOpen(true);
    }
  }, []);

  const removeScreenshot = useCallback(() => {
    if (screenshot) URL.revokeObjectURL(screenshot.url);
    setScreenshot(null);
  }, [screenshot]);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSubmitState('sending');

    const route = typeof window !== 'undefined' ? window.location.pathname : '(unknown)';
    const appVersion = (typeof window !== 'undefined'
      ? window.location.hostname || 'unknown'
      : 'unknown');
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
    const displayName = activeProfile?.name ?? 'Anonymous';
    const subject = 'Quick feedback — Chess Academy Pro';
    const bodyLines = [
      message.trim(),
      '',
      '---',
      `From: ${displayName}`,
      email.trim() ? `Reply to: ${email.trim()}` : 'Reply to: (not provided)',
      `Route: ${route}`,
      `App: ${appVersion}`,
      `Device: ${userAgent}`,
      screenshot ? '(Screenshot attached via share sheet)' : '(No screenshot)',
    ];
    const body = bodyLines.join('\n');

    // Prefer native share sheet on mobile/Safari — it supports files
    // so the screenshot attaches automatically. Fallback to mailto
    // when share-with-files isn't available (desktop browsers
    // mostly). For mailto + screenshot, the user is instructed to
    // attach the downloaded file manually.
    try {
      if (screenshot && typeof navigator.canShare === 'function') {
        const file = new File([screenshot.blob], 'chess-academy-feedback.png', {
          type: 'image/png',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: subject,
            text: body,
            files: [file],
          });
          setSubmitState('sent');
          return;
        }
      }
    } catch (err) {
      // User cancelled the share sheet, or the browser lied about
      // canShare. Fall through to mailto.
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSubmitState('idle');
        return;
      }
      console.warn('[QuickFeedback] share failed, falling back to mailto:', err);
    }

    // Mailto fallback. If there's a screenshot, also trigger a file
    // download so the user can attach it to the email themselves.
    if (screenshot) {
      const link = document.createElement('a');
      link.href = screenshot.url;
      link.download = 'chess-academy-feedback.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitState('sent');
  }, [message, email, screenshot, activeProfile]);

  const isBusy = submitState === 'capturing' || submitState === 'sending';

  return (
    <>
      {/* Floating trigger — top-right of every page, tucked against
          the header so it doesn't compete with content. aria-label so
          screen readers know what it is. */}
      <button
        onClick={openPanel}
        className="fixed top-3 right-3 z-[60] w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-bg)',
        }}
        aria-label="Send quick feedback"
        title="Quick feedback"
        data-testid="quick-feedback-button"
      >
        <MessageSquarePlus size={16} />
      </button>

      {open && (
        <>
          {/* Backdrop — dim but not modal; tapping closes. */}
          <div
            onClick={closePanel}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm animate-fade-in"
            data-testid="quick-feedback-backdrop"
            aria-hidden
          />
          {/* Slide-in panel — bottom sheet on mobile, right panel on
              desktop. Centered content, user can scroll if needed. */}
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Quick feedback"
            className="fixed z-[80] flex flex-col"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              // Mobile: bottom sheet. Desktop: right panel.
              bottom: 0,
              right: 0,
              left: 0,
              maxWidth: '420px',
              marginLeft: 'auto',
              maxHeight: '92vh',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.25)',
            }}
            data-testid="quick-feedback-panel"
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <MessageSquarePlus size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                  Quick feedback
                </h3>
              </div>
              <button
                onClick={closePanel}
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Close feedback panel"
                data-testid="quick-feedback-close"
              >
                <X size={18} />
              </button>
            </div>

            {submitState === 'sent' ? (
              <div className="flex flex-col items-center text-center p-6 gap-3">
                <Check size={32} style={{ color: 'var(--color-accent)' }} />
                <div className="text-sm" style={{ color: 'var(--color-text)' }}>
                  Thanks — your mail app should be open.
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  If nothing happened, email{' '}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </div>
                <button
                  onClick={closePanel}
                  className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                  }}
                  data-testid="quick-feedback-done"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 overflow-y-auto">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's on your mind? Bug, idea, praise — just type."
                  rows={4}
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  data-testid="quick-feedback-message"
                />

                {/* Screenshot row — capture button OR thumbnail preview */}
                {screenshot ? (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-2"
                    style={{
                      background: 'var(--color-bg)',
                      borderColor: 'var(--color-border)',
                    }}
                    data-testid="quick-feedback-screenshot-preview"
                  >
                    <img
                      src={screenshot.url}
                      alt="Screenshot"
                      className="w-14 h-14 object-cover rounded"
                      style={{ borderColor: 'var(--color-border)' }}
                    />
                    <div className="flex-1 min-w-0 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Screenshot attached
                    </div>
                    <button
                      onClick={removeScreenshot}
                      className="p-1 rounded hover:opacity-80"
                      style={{ color: 'var(--color-text-muted)' }}
                      aria-label="Remove screenshot"
                      data-testid="quick-feedback-remove-screenshot"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { void captureScreenshot(); }}
                    disabled={isBusy}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium disabled:opacity-60"
                    style={{
                      background: 'var(--color-bg)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    data-testid="quick-feedback-capture"
                  >
                    {submitState === 'capturing' ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Capturing…
                      </>
                    ) : (
                      <>
                        <Camera size={14} /> Attach screenshot
                      </>
                    )}
                  </button>
                )}

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email (optional, for reply)"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{
                    background: 'var(--color-bg)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)',
                  }}
                  data-testid="quick-feedback-email"
                />

                <button
                  onClick={() => { void handleSubmit(); }}
                  disabled={!message.trim() || isBusy}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40"
                  style={{
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                  }}
                  data-testid="quick-feedback-submit"
                >
                  {submitState === 'sending' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      <Send size={14} /> Send
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Opens your mail or share sheet. Nothing is sent anywhere else.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
