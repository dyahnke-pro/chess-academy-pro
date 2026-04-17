import { useState, useCallback, useRef } from 'react';
import { X, Share2, Upload, ExternalLink, Loader2, Gift } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { db } from '../../db/schema';
import { buildShareIntents } from '../../services/pricingService';

/**
 * ShareForFreeModal — "Post on social, upload your screenshot, earn
 * another free month." This is a per-post accrual model:
 *
 *   - Each verified share → +1 to `preferences.freeMonthsEarned`
 *   - No cap — user can stack multiple months by posting multiple
 *     times (audit log catches abuse if needed)
 *   - Lemon Squeezy consumes one earned month per renewal cycle
 *     (will be wired when paywall lands)
 *
 * UX:
 *   1. "Post on X" / "Post on Reddit" buttons → open compose in new tab
 *   2. Upload screenshot of the published post (required)
 *   3. Submit → add 1 to freeMonthsEarned + append shareHistory entry
 *      + email proof receipt to support with screenshot attached
 *   4. Confirmation with new running total
 *
 * Proof receipt format: audit email to support@chessacademy.pro with
 * the screenshot attached (via navigator.share or mailto+download).
 * Cross-reference the timestamp + platform against the user's public
 * post history when you want to spot-check.
 */
const SUPPORT_EMAIL = 'support@chessacademy.pro';

interface ShareForFreeModalProps {
  onClose: () => void;
  onGranted?: (newTotal: number) => void;
}

type SubmitState = 'idle' | 'submitting' | 'granted';

export function ShareForFreeModal({ onClose, onGranted }: ShareForFreeModalProps): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [platform, setPlatform] = useState<'x' | 'reddit' | 'other' | null>(null);
  const [screenshot, setScreenshot] = useState<{ blob: Blob; url: string; name: string } | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [newTotal, setNewTotal] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const appUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/landing`
    : 'https://chessacademy.pro/landing';
  const intents = buildShareIntents(appUrl);

  const currentEarned = activeProfile?.preferences.freeMonthsEarned ?? 0;
  const currentUsed = activeProfile?.preferences.freeMonthsUsed ?? 0;
  const currentRemaining = Math.max(0, currentEarned - currentUsed);

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
    const nextEarned = currentEarned + 1;
    const existingHistory = activeProfile.preferences.shareHistory ?? [];

    // Atomic: increment earned counter + append audit entry. We don't
    // touch `pricingTier` — users stay on their base tier, free months
    // stack as a credit on top.
    const updatedPrefs = {
      ...activeProfile.preferences,
      freeMonthsEarned: nextEarned,
      shareHistory: [
        ...existingHistory,
        {
          platform: platformLabel as 'x' | 'reddit' | 'other',
          claimedAt: timestamp,
          screenshotName: screenshot.name,
        },
      ],
    };
    await db.profiles.update(activeProfile.id, { preferences: updatedPrefs });
    setActiveProfile({ ...activeProfile, preferences: updatedPrefs });
    setNewTotal(nextEarned - currentUsed);

    // Audit receipt
    const subject = `[Free-month claim #${nextEarned}] Chess Academy Pro — ${activeProfile.name}`;
    const bodyLines = [
      `User claimed free-month credit #${nextEarned}.`,
      '',
      `Display name: ${activeProfile.name}`,
      `Profile ID: ${activeProfile.id}`,
      `Platform they posted on: ${platformLabel}`,
      `Claim timestamp: ${timestamp}`,
      `Screenshot: ${screenshot.name}`,
      `Running total: ${nextEarned} earned, ${currentUsed} used, ${nextEarned - currentUsed} remaining`,
      '',
      '---',
      'Spot-check by searching for this user\'s post on the platform',
      'above and comparing to the attached screenshot. If fraudulent,',
      'revoke by decrementing preferences.freeMonthsEarned in the DB.',
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
          onGranted?.(nextEarned - currentUsed);
          return;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSubmitState('granted');
        onGranted?.(nextEarned - currentUsed);
        return;
      }
      console.warn('[ShareForFree] navigator.share failed:', err);
    }

    // Fallback: download screenshot + mailto
    const link = document.createElement('a');
    link.href = screenshot.url;
    link.download = screenshot.name || 'chess-academy-proof.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitState('granted');
    onGranted?.(nextEarned - currentUsed);
  }, [screenshot, platform, activeProfile, setActiveProfile, submitState, currentEarned, currentUsed, onGranted]);

  if (submitState === 'granted') {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center text-center gap-3 py-6 px-5">
          <Gift size={36} style={{ color: 'var(--color-accent)' }} />
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
            +1 free month.
          </h3>
          <p className="text-sm max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            You now have <strong style={{ color: 'var(--color-text)' }}>{newTotal} free month{newTotal === 1 ? '' : 's'}</strong> banked. Post again anytime to stack another.
          </p>
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="share-free-done"
          >
            Nice
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
            Earn a free month — post about us
          </h3>
        </div>

        {currentRemaining > 0 && (
          <div
            className="text-xs px-3 py-2 rounded-lg flex items-center gap-2"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-text)',
            }}
            data-testid="share-free-running-total"
          >
            <Gift size={14} style={{ color: 'var(--color-accent)' }} />
            You have {currentRemaining} free month{currentRemaining === 1 ? '' : 's'} banked. Posting again adds one more.
          </div>
        )}

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Post about Chess Academy Pro on X or Reddit, upload a
          screenshot of your post, and we'll add{' '}
          <strong style={{ color: 'var(--color-text)' }}>one month free</strong>{' '}
          to your subscription. Stack as many as you want.
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
            <>
              <Gift size={14} /> Add 1 free month
            </>
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
