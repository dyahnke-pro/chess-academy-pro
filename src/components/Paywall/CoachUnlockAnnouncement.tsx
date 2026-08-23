import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useFreeTierStore } from '../../stores/freeTierStore';
import { needsCoachUnlockAnnouncement } from '../../services/freeTierService';
import { captureEvent } from '../../services/analytics';

/**
 * CoachUnlockAnnouncement — the one-time "the AI coach is free to try" toast.
 * --------------------------------------------------------------------------
 * David 2026-08-06: "Make sure the update informs them they get the coach for
 * free." Fires ONCE for every non-Pro user with the gate live — including
 * EXISTING users, whose `freeTier` row predates the coach fields and so
 * backfills `coachUnlockSeenAt: null` via `loadFreeTier` (see the
 * FreeTierRecord doc comment) — they see it exactly like a brand-new install.
 *
 * A non-blocking bottom-sheet, not a full-screen modal: it must not fight the
 * first-run strength-calibration bubble or the AI-consent modal for the first
 * tap (both are full-screen + blocking; this sits at a lower z-index and
 * simply waits its turn — most users who'd see this are already past both).
 *
 * Mounted globally in App.tsx next to ReviewPrompt; renders only when the
 * gate is live, the user isn't Pro, the ledger has hydrated, and the
 * announcement hasn't been seen yet.
 */
export function CoachUnlockAnnouncement(): JSX.Element | null {
  const { isPro, gateEnabled, isResolving } = useEntitlement();
  const { row, hydrated, markCoachUnlockSeen } = useFreeTierStore();
  const navigate = useNavigate();

  const shouldShow =
    gateEnabled && !isPro && !isResolving && hydrated && needsCoachUnlockAnnouncement(row);

  if (!shouldShow) return null;

  function dismiss(): void {
    captureEvent('coach_unlock_announcement_dismissed');
    void markCoachUnlockSeen();
  }

  function tryIt(): void {
    captureEvent('coach_unlock_announcement_cta_tapped');
    void markCoachUnlockSeen();
    void navigate('/coach/home');
  }

  return (
    <div
      role="dialog"
      aria-label="The AI coach is free to try"
      data-testid="coach-unlock-announcement"
      className="fixed inset-x-0 bottom-0 z-[90] flex justify-center p-4 sm:bottom-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="w-full max-w-sm rounded-2xl border-2 border-[#c9a84c]/40 bg-[#1a1a1a] p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#c9a84c]/15">
            <Sparkles className="h-5 w-5 text-[#c9a84c]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-zinc-100">The AI coach is free to try</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Hundreds of free lessons and chat turns to try — no card, no trial to start. Ask it anything.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            data-testid="coach-unlock-dismiss"
            className="shrink-0 text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={tryIt}
          data-testid="coach-unlock-try"
          className="mt-3 w-full rounded-xl bg-[#c9a84c] py-2.5 text-sm font-bold text-[#0f0f0f] transition active:scale-[0.99]"
        >
          Try the coach
        </button>
      </div>
    </div>
  );
}
