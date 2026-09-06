import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gift, X, Share2, Check } from 'lucide-react';
import { getStatus, claimCode, type ClaimOutcome } from '../../services/referralService';

/**
 * ReferralPanel — "invite a friend, you both get a free opening class"
 * (David 2026-09-06). Opened from anywhere via a window `open-referral` event
 * (same decoupled pattern as `open-feedback`); mounted once at the app root.
 *
 * The reward has real value only on native (App Store paywall); on the
 * permanently-unlocked web app it's a harmless no-op. The friend enters the
 * code on THEIR device, and the reward unlocks for both only after they play
 * their first lesson — see referralService / docs/plans/2026-09-06-referral-rewards.md.
 *
 * Portalled to document.body so a transformed ancestor can't clip it.
 */
const APP_STORE_URL = 'https://apps.apple.com/app/id6776418777';

const OUTCOME_COPY: Record<ClaimOutcome, string> = {
  ok: "You're in! Play your first lesson and you'll both get a free opening class.",
  'already-claimed': "You've already redeemed a friend's code.",
  'unknown-code': "That code isn't right — double-check it with your friend.",
  'own-code': "That's your own code — share it with a friend instead.",
  error: 'Something went wrong. Try again in a moment.',
};

export function ReferralPanel(): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [recruits, setRecruits] = useState(0);
  const [copied, setCopied] = useState(false);
  const [entry, setEntry] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [outcome, setOutcome] = useState<ClaimOutcome | null>(null);

  const refresh = useCallback(async () => {
    const status = await getStatus();
    if (status) { setCode(status.code); setCredits(status.credits); setRecruits(status.recruits); }
  }, []);

  useEffect(() => {
    const onOpen = (): void => { setOpen(true); setOutcome(null); void refresh(); };
    window.addEventListener('open-referral', onOpen);
    return () => window.removeEventListener('open-referral', onOpen);
  }, [refresh]);

  const shareMessage = code
    ? `Learn chess with me on Chess Academy Pro. Enter my code ${code} when you start and we both get a free opening masterclass. ${APP_STORE_URL}`
    : '';

  const share = useCallback(async () => {
    if (!code) return;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Chess Academy Pro', text: shareMessage });
        return;
      }
    } catch { /* user cancelled or unsupported — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the code is visible on screen regardless */ }
  }, [code, shareMessage]);

  const redeem = useCallback(async () => {
    const c = entry.trim();
    if (!c || redeeming) return;
    setRedeeming(true);
    const result = await claimCode(c);
    setOutcome(result);
    if (result === 'ok') setEntry('');
    setRedeeming(false);
    void refresh();
  }, [entry, redeeming, refresh]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/40 p-4 pt-16"
      onClick={() => setOpen(false)}
      data-testid="referral-overlay"
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl shadow-xl"
        style={{ background: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="referral-panel"
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="flex items-center gap-2 font-bold text-theme-text"><Gift size={20} className="text-theme-accent" /> Invite a friend</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded p-1 text-theme-text hover:opacity-70"><X size={20} /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-theme-text">
            Share your code. When a friend enters it and plays their first lesson, you <strong>both</strong> get a free opening masterclass.
          </p>

          {credits > 0 && (
            <div className="rounded-xl px-3 py-2 text-sm font-semibold" data-testid="referral-credits" style={{ background: 'var(--color-bg)', color: 'var(--color-accent)' }}>
              🎉 You've earned {credits} free opening{credits === 1 ? '' : 's'}
              {recruits > 0 ? ` — ${recruits} friend${recruits === 1 ? '' : 's'} joined` : ''}. Open any opening masterclass to claim.
            </div>
          )}

          <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
            <div className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Your code</div>
            <div className="mt-1 font-mono text-2xl font-bold tracking-widest text-theme-text" data-testid="referral-code">{code ?? '……'}</div>
            <button
              type="button" onClick={() => void share()} disabled={!code}
              data-testid="referral-share"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-theme-accent py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {copied ? <><Check size={16} /> Copied</> : <><Share2 size={16} /> Share invite</>}
            </button>
          </div>

          <div className="rounded-xl p-3" style={{ background: 'var(--color-bg)' }}>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }} htmlFor="referral-entry">Got a friend's code?</label>
            <div className="mt-1 flex gap-2">
              <input
                id="referral-entry" value={entry} onChange={(e) => setEntry(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') void redeem(); }}
                placeholder="ABC123" maxLength={12} autoCapitalize="characters" autoCorrect="off"
                data-testid="referral-entry"
                className="flex-1 rounded-lg px-3 py-2 font-mono text-sm tracking-widest" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              />
              <button type="button" onClick={() => void redeem()} disabled={!entry.trim() || redeeming} data-testid="referral-redeem" className="rounded-lg bg-theme-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {redeeming ? '…' : 'Redeem'}
              </button>
            </div>
            {outcome && (
              <p className={`mt-2 text-xs ${outcome === 'ok' ? 'text-theme-accent' : 'text-red-500'}`} data-testid="referral-outcome">{OUTCOME_COPY[outcome]}</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
