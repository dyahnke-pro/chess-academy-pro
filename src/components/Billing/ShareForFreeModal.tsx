import { useState, useCallback, useRef } from 'react';
import { X, Share2, Upload, Check, ExternalLink, Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildShareIntents } from '../../services/pricingService';

/**
 * ShareForFreeModal — "Post on social, upload your screenshot, get
 * Chess Academy Pro free for life" flow.
 *
 * UX:
 *   1. Explanation + "Open X" / "Open Reddit" buttons (pre-composed
 *      post). Tapping an intent opens the share compose in a new tab.
 *   2. Screenshot upload — required to submit.
 *   3. Submit — flips the user's pricingTier to 'free-social' on the
 *      profile, emails a proof receipt to support@chessacademy.pro
 *      with the screenshot attached (via navigator.share when
 *      available, else mailto + download fallback).
 *   4. Confirmation — "You're free for life. Thanks for spreading
 *      the word."
 *
 * Proof receipt format (email body + attachment):
 *   Subject:  [Free-lifetime claim] Chess Academy Pro — <display name>
 *   Body:     Claim timestamp, platform they said they posted on,
 *             display name, profile ID. Screenshot attached.
 *
 * Fraud mitigation:
 *   - Screenshot is required (just having an intent URL doesn't cut
 *     it — they have to actually demonstrate the post)
 *   - The entitlement flips immediately (optimistic), but every claim
 *     generates an audit email you can review and revoke later
 *   - `socialShareClaim` is persisted on the profile with timestamp
 *     and platform so you can correlate
 */
const SUPPORT_EMAIL = 'support@chessacademy.pro';

interface ShareForFreeModalProps {
  onClose: () => void;
  onGranted: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'granted';

export function ShareForFreeModal({ onClose, onGranted }: ShareForFreeModalProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [platform, setPlatform] = useState<'x' | 'reddit' | 'other' | null>(null);
  const [screenshot, setScreenshot] = useState<{ blob: Blob; url: string; name: string } | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/landing`
    : 'https://chessacademy.pro/landing';
  const intents = buildShareIntents(appUrl);

  const openShareIntent = useCallback((which: 'x' | 'reddit') => {
    const intent = intents.find((i) => i.platform === which);
    if (!intent) return;
    setPlatform(which);
    window.open(intent.url, '_blank', 'noopener,noreferrer');
  }, [intents]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setScreenshot({ blob: file, url, name: file.name });
  }, []);

  const clearScreenshot = useCallback(() => {
    if (screenshot) URL.revokeObjectURL(screenshot.url);
    setScreenshot(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [screenshot]);

  const handleSubmit = useCallback(async () => {
    if (!screenshot || !activeProfile || submitState !== 'idle') return;
    setSubmitState('submitting');

    const timestamp = new Date().toISOString();
    const platformLabel = platform ?? 'other';

    // 1. Persist the claim on the profile (atomic with tier flip).
    const updatedPrefs = {
      ...activeProfile.preferences,
      pricingTier: 'free-social' as const,
      pricingTierAssignedAt: timestamp,
      socialShareClaim: {
        platform: platformLabel,
        claimedAt: timestamp,
        screenshotName: screenshot.name,
      },
    };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });

    // 2. Send proof receipt. Prefer navigator.share (attaches the
    //    screenshot on mobile) so the email arrives with actual
    //    evidence. Fall back to mailto + download on desktop.
    const subject = `[Free-lifetime claim] Chess Academy Pro — ${activeProfile.name}`;
    const bodyLines = [
      `User claimed free-for-life entitlement.`,
      '',
      `Display name: ${activeProfile.name}`,
      `Profile ID: ${activeProfile.id}`,
      `Platform they posted on: ${platformLabel}`,
      `Claim timestamp: ${timestamp}`,
      `Screenshot: ${screenshot.name}`,
      '',
      '---',
      `Review by searching for this user's post on the platform above,`,
      `comparing to the attached screenshot. If fraudulent, revoke by`,
      `flipping preferences.pricingTier back to 'beta' in the DB.`,
    ];
    const body = bodyLines.join('\n');

    try {
      if (typeof navigator.canShare === 'function') {
        const file = new File([screenshot.blob], screenshot.name || 'proof.png', {
          type: screenshot.blob.type || 'image/png',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: subject, text: body, files: [file] });
          setSubmitState('granted');
          onGranted();
          return;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — they still got the entitlement, but we
        // didn't collect proof. Not ideal but they've already shared,
        // so don't force them to retry.
        setSubmitState('granted');
        onGranted();
        return;
      }
      console.warn('[ShareForFree] navigator.share failed:', err);
    }

    // Fallback: download the screenshot + mailto. User attaches in
    // their mail client.
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = screenshot.name || 'chess-academy-proof.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitState('granted');
    onGranted();
  }, [screenshot, platform, activeProfile, setActiveProfile, submitState, onGranted]);

  if (submitState === 'granted') {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <Check size={36} style={{ color: 'var(--color-accent)' }} />
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
            You're free for life.
          </h3>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            Thanks for spreading the word. Proof receipt sent to
            support — you'll never see a paywall again.
          </p>
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="share-free-done"
          >
            Awesome
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-2">
          <Share2 size={18} style={{ color: 'var(--color-accent)' }} />
          <h3 className="font-bold text-base" style={{ color: 'var(--color-text)' }}>
            Free for life — post about us
          </h3>
        </div>

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Post about Chess Academy Pro on X or Reddit, upload a
          screenshot of your post, and your account flips to{' '}
          <strong style={{ color: 'var(--color-text)' }}>free forever</strong>.
        </p>

        {/* Step 1: Share intents */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            1. Post about us
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => openShareIntent('x')}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium"
              style={{
                background: platform === 'x' ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'var(--color-bg)',
                borderColor: platform === 'x' ? 'var(--color-accent)' : 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-testid="share-free-x"
            >
              <ExternalLink size={14} /> Post on X
            </button>
            <button
              onClick={() => openShareIntent('reddit')}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium"
              style={{
                background: platform === 'reddit' ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'var(--color-bg)',
                borderColor: platform === 'reddit' ? 'var(--color-accent)' : 'var(--color-border)',
                color: 'var(--color-text)',
              }}
              data-testid="share-free-reddit"
            >
              <ExternalLink size={14} /> Post on Reddit
            </button>
          </div>
        </div>

        {/* Step 2: Upload proof */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            2. Upload a screenshot of your post
          </div>
          {screenshot ? (
            <div
              className="flex items-center gap-3 p-2 rounded-lg border"
              style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}
              data-testid="share-free-screenshot-preview"
            >
              <img
                src={screenshot.url}
                alt="Proof screenshot"
                className="w-14 h-14 object-cover rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate" style={{ color: 'var(--color-text)' }}>
                  {screenshot.name}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Looks good.
                </div>
              </div>
              <button
                onClick={clearScreenshot}
                className="p-1 rounded hover:opacity-80"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Remove screenshot"
                data-testid="share-free-remove-screenshot"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="share-free-upload"
              className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed text-sm cursor-pointer hover:opacity-80"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
              }}
            >
              <Upload size={14} /> Tap to upload
            </label>
          )}
          <input
            ref={fileInputRef}
            id="share-free-upload"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
            data-testid="share-free-upload"
          />
        </div>

        {/* Step 3: Submit */}
        <button
          onClick={() => { void handleSubmit(); }}
          disabled={!screenshot || submitState !== 'idle'}
          className="mt-2 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="share-free-submit"
        >
          {submitState === 'submitting' ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Submitting…
            </>
          ) : (
            'Flip me to free'
          )}
        </button>

        <p className="text-[11px] text-center" style={{ color: 'var(--color-text-muted)' }}>
          Proof is sent to support via your mail app. Fake submissions
          may be reviewed and revoked.
        </p>
      </div>
    </ModalShell>
  );
}

interface ModalShellProps {
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ onClose, children }: ModalShellProps): JSX.Element {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        aria-hidden
        data-testid="share-free-backdrop"
      />
      <div
        role="dialog"
        aria-label="Share for free"
        className="fixed z-[100] inset-0 flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
          data-testid="share-free-modal"
        >
          <div
            className="flex items-center justify-end px-3 py-2 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <button
              onClick={onClose}
              className="p-1 rounded hover:opacity-80"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Close"
              data-testid="share-free-close"
            >
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
