import { createPortal } from 'react-dom';
import { Crown } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { SKILL_BANDS, applySkillBand, needsStrengthQuestion } from '../../services/strengthCalibrationService';
import { captureEvent } from '../../services/analytics';
import { logAppAudit } from '../../services/appAuditor';
import type { SelfReportedBand } from '../../services/ratingBands';

/**
 * FirstRunStrength — the one-time "how much chess have you played?" screen
 * (David 2026-10-02: "make sure the strength question is still available
 * first time you open the app", skippable).
 *
 * Shown after the AI-consent prompt, once. A pick seeds the first opponent's
 * strength and, for "New to chess" / "Beginner", turns on beginner mode
 * (`isBeginnerMode`) until their own games show they have outgrown it. Skip
 * keeps the app fully adaptive. Mounted once at the app root.
 */
export function FirstRunStrength(): JSX.Element | null {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  if (!needsStrengthQuestion(activeProfile) || !activeProfile) return null;

  const choose = (band: SelfReportedBand): void => {
    // In-memory first, so the screen closes even if the Dexie write is slow.
    setActiveProfile({ ...activeProfile, skillBand: band });
    void applySkillBand(activeProfile, band).then((p) => setActiveProfile(p)).catch(() => undefined);
    captureEvent('strength_band_picked', { band });
    void logAppAudit({ kind: 'strength-band-picked', category: 'app', source: 'FirstRunStrength', summary: band });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="How much chess have you played?"
      data-testid="first-run-strength"
    >
      <div className="w-full sm:max-w-md bg-theme-surface border-t-2 sm:border-2 border-cyan-500/40 rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={20} className="text-cyan-400" />
          <h2 className="text-base font-bold text-theme-text">How much chess have you played?</h2>
        </div>
        <p className="text-sm text-theme-text-muted mb-4 leading-relaxed">
          Your coach starts at your level and adjusts from your very first move.
        </p>
        <div className="flex flex-col gap-2">
          {SKILL_BANDS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => choose(b.id)}
              className="w-full text-left px-4 py-3 rounded-xl border-2 border-cyan-500/30 bg-cyan-500/10 hover:opacity-80 transition-opacity"
              data-testid={`first-run-band-${b.id}`}
            >
              <span className="block text-sm font-semibold text-theme-text">{b.label}</span>
              <span className="block text-xs text-theme-text-muted">{b.blurb}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => choose('skipped')}
          className="w-full mt-3 py-2 text-sm text-theme-text-muted hover:opacity-80"
          data-testid="first-run-skip"
        >
          Skip — let my games decide
        </button>
      </div>
    </div>,
    document.body,
  );
}
