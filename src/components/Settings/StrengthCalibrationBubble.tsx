import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../stores/appStore';
import { SKILL_BANDS, applyStrength, type SkillBand } from '../../services/strengthCalibrationService';
import { logAppAudit } from '../../services/appAuditor';

/**
 * First-run strength bubble. Same coach-mark look as PageHelp ("How to use
 * this app"), but it's the FIRST bubble to pop and it's blocking — the
 * student answers before anything else, so difficulty is set from move one.
 * Shown once when there is no imported-games signal; imports bypass it
 * entirely (handled at App boot). Picking a band seeds BOTH currentRating
 * and puzzleRating via applyStrength.
 */
export function StrengthCalibrationBubble({ onDone }: { onDone: () => void }): JSX.Element {
  const activeProfile = useAppStore((s) => s.activeProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [saving, setSaving] = useState<SkillBand['id'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (band: SkillBand): Promise<void> => {
    if (!activeProfile || saving) return;
    setSaving(band.id);
    setError(null);
    try {
      const updated = await applyStrength(activeProfile, band.rating);
      setActiveProfile(updated);
      void logAppAudit({
        kind: 'strength-calibrated',
        category: 'app',
        source: 'StrengthCalibrationBubble',
        summary: `skill picker: ${band.id} → ${band.rating}`,
      });
      onDone();
    } catch (e) {
      setError('Could not save — tap to retry.');
      setSaving(null);
      void logAppAudit({
        kind: 'uncaught-error',
        category: 'app',
        source: 'StrengthCalibrationBubble',
        summary: e instanceof Error ? e.message : 'applyStrength failed',
      });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="How strong are you?"
      data-testid="strength-calibration-bubble"
    >
      <div className="w-full sm:max-w-md bg-theme-surface border-t-2 sm:border-2 border-amber-500/40 rounded-t-2xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">♟️</span>
          <h2 className="text-base font-bold text-theme-text">How strong are you?</h2>
        </div>
        <p className="text-xs text-theme-text-muted mb-4 leading-relaxed">
          This sets your starting difficulty — puzzles, tactics, and the coach
          you play against. It keeps adjusting as you play.
        </p>

        <div className="flex flex-col gap-2">
          {SKILL_BANDS.map((band) => (
            <button
              key={band.id}
              type="button"
              onClick={() => void handlePick(band)}
              disabled={saving !== null}
              className="w-full px-4 py-3 rounded-xl border-2 border-theme-border text-left hover:border-amber-500/50 transition-colors disabled:opacity-50"
              data-testid={`skill-band-${band.id}`}
            >
              <div className="text-sm font-semibold text-theme-text">{band.label}</div>
              <div className="text-xs text-theme-text-muted">{band.blurb}</div>
              {saving === band.id && (
                <div className="text-xs mt-1 text-amber-300">Saving…</div>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-center mt-3 text-red-400" data-testid="calibration-error">
            {error}
          </p>
        )}

        <p className="text-[11px] text-center text-theme-text-muted mt-4 leading-relaxed">
          On Lichess or Chess.com? Connect your account in Settings and your
          real rating is used automatically.
        </p>
      </div>
    </div>,
    document.body,
  );
}
