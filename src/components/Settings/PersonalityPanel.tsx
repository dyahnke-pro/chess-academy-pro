/**
 * PersonalityPanel — coach personality picker + dial controls.
 *
 * Renders as a single row in CoachTab (Settings → Coach) with the
 * current personality summary; tapping opens a modal sub-panel with:
 *   - 5-card picker (default / soft / edgy / flirtatious / drill-sergeant)
 *   - 3 segmented dials (Profanity / Mockery / Flirt, each none / medium / hard)
 *   - "Reset dials to personality defaults" button
 *   - Live one-line tone preview
 *   - Save / Cancel actions
 *
 * On Save:
 *   1. Persist to db.profiles
 *   2. Mirror to the in-memory profile via setProfile
 *   3. Fire `coach-personality-changed` audit
 *
 * Per WO-COACH-PERSONALITIES (PR C). Personality + dial fields live on
 * UserPreferences (added in PR B). Prompt-assembly machinery shipped
 * in PR A.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { db } from '../../db/schema';
import { logAppAudit } from '../../services/appAuditor';
import {
  PERSONALITY_DIAL_DEFAULTS,
  type CoachPersonality,
  type IntensityLevel,
} from '../../coach/types';
import { POLLY_VOICES, PERSONALITY_VOICE_DEFAULTS, PERSONALITY_SECONDARY_VOICE_DEFAULTS, voiceService } from '../../services/voiceService';
import type { UserProfile } from '../../types';

interface PersonalityOption {
  id: CoachPersonality;
  label: string;
  blurb: string;
}

const PERSONALITY_OPTIONS: readonly PersonalityOption[] = [
  {
    id: 'default',
    label: 'Default',
    blurb: 'Calm, present, observant. Brief unless asked.',
  },
  {
    id: 'soft',
    label: 'Soft',
    blurb: 'Warm and encouraging — frames mistakes as growth.',
  },
  {
    id: 'edgy',
    label: 'Edgy',
    blurb: 'Sharp, sarcastic. Calls bullshit on hopeful moves.',
  },
  {
    id: 'flirtatious',
    label: 'Flirtatious',
    blurb: 'Playful and teasing — chess as a flirtation.',
  },
  {
    id: 'drill-sergeant',
    label: 'Drill Sergeant',
    blurb: 'Loud, urgent, no-bullshit. Move now, soldier.',
  },
];

const INTENSITY_LEVELS: readonly IntensityLevel[] = ['none', 'medium', 'hard'];

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  none: 'None',
  medium: 'Medium',
  hard: 'Hard',
};

interface PersonalityPanelProps {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
}

export function PersonalityPanel({ profile, setProfile }: PersonalityPanelProps): JSX.Element {
  const [open, setOpen] = useState(false);

  // Per-personality voice override map. Empty / missing entries fall
  // back to PERSONALITY_VOICE_DEFAULTS at speak time. Stored as a full
  // map in draft state for UI simplicity (every card always shows a
  // selected voice) but only the entries that DIFFER from defaults
  // need to persist.
  const currentVoiceMap: Record<CoachPersonality, string> = useMemo(() => {
    const stored = profile.preferences.coachPersonalityVoices ?? {};
    return {
      default: stored.default ?? PERSONALITY_VOICE_DEFAULTS.default,
      soft: stored.soft ?? PERSONALITY_VOICE_DEFAULTS.soft,
      edgy: stored.edgy ?? PERSONALITY_VOICE_DEFAULTS.edgy,
      flirtatious: stored.flirtatious ?? PERSONALITY_VOICE_DEFAULTS.flirtatious,
      'drill-sergeant': stored['drill-sergeant'] ?? PERSONALITY_VOICE_DEFAULTS['drill-sergeant'],
    };
  }, [profile.preferences.coachPersonalityVoices]);

  // WO-VOICE-LAYER-01 (b): per-personality SECONDARY voice — used
  // for short tactic alerts and interjections so they cut through
  // main narration with a different timbre.
  const currentSecondaryVoiceMap: Record<CoachPersonality, string> = useMemo(() => {
    const stored = profile.preferences.coachPersonalitySecondaryVoices ?? {};
    return {
      default: stored.default ?? PERSONALITY_SECONDARY_VOICE_DEFAULTS.default,
      soft: stored.soft ?? PERSONALITY_SECONDARY_VOICE_DEFAULTS.soft,
      edgy: stored.edgy ?? PERSONALITY_SECONDARY_VOICE_DEFAULTS.edgy,
      flirtatious: stored.flirtatious ?? PERSONALITY_SECONDARY_VOICE_DEFAULTS.flirtatious,
      'drill-sergeant': stored['drill-sergeant'] ?? PERSONALITY_SECONDARY_VOICE_DEFAULTS['drill-sergeant'],
    };
  }, [profile.preferences.coachPersonalitySecondaryVoices]);

  // Read current settings from profile, defaulting to 'default' / 'none'.
  const currentPersonality: CoachPersonality =
    profile.preferences.coachPersonality ?? 'default';
  const currentProfanity: IntensityLevel =
    profile.preferences.coachProfanity ?? 'none';
  const currentMockery: IntensityLevel =
    profile.preferences.coachMockery ?? 'none';
  const currentFlirt: IntensityLevel =
    profile.preferences.coachFlirt ?? 'none';

  // WO-AUTOSAVE-01: drop the draft / Save-button gate. Settings now
  // persist on every change (debounced 250ms). The local state still
  // exists for instant UI feedback; the autosave effect below mirrors
  // it back into Dexie + the parent profile store.
  const [draftPersonality, setDraftPersonality] = useState<CoachPersonality>(currentPersonality);
  const [draftProfanity, setDraftProfanity] = useState<IntensityLevel>(currentProfanity);
  const [draftMockery, setDraftMockery] = useState<IntensityLevel>(currentMockery);
  const [draftFlirt, setDraftFlirt] = useState<IntensityLevel>(currentFlirt);
  const [draftVoiceMap, setDraftVoiceMap] = useState<Record<CoachPersonality, string>>(currentVoiceMap);
  const [draftSecondaryVoiceMap, setDraftSecondaryVoiceMap] = useState<Record<CoachPersonality, string>>(currentSecondaryVoiceMap);

  // Re-seed drafts every time the panel opens so a previous Cancel
  // doesn't leak stale draft values into the next open.
  useEffect(() => {
    if (open) {
      setDraftPersonality(currentPersonality);
      setDraftProfanity(currentProfanity);
      setDraftMockery(currentMockery);
      setDraftFlirt(currentFlirt);
      setDraftVoiceMap(currentVoiceMap);
      setDraftSecondaryVoiceMap(currentSecondaryVoiceMap);
    }
  }, [open, currentPersonality, currentProfanity, currentMockery, currentFlirt, currentVoiceMap, currentSecondaryVoiceMap]);

  const summaryLabel = PERSONALITY_OPTIONS.find((p) => p.id === currentPersonality)?.label ?? 'Default';
  const summaryDials =
    currentProfanity === 'none' && currentMockery === 'none' && currentFlirt === 'none'
      ? 'all dials off'
      : `P:${INTENSITY_LABELS[currentProfanity]} M:${INTENSITY_LABELS[currentMockery]} F:${INTENSITY_LABELS[currentFlirt]}`;

  const pickPersonality = (id: CoachPersonality): void => {
    setDraftPersonality(id);
    // Auto-seed the dials to the picked personality's defaults — the
    // user can still override individually before saving.
    const defaults = PERSONALITY_DIAL_DEFAULTS[id];
    setDraftProfanity(defaults.profanity);
    setDraftMockery(defaults.mockery);
    setDraftFlirt(defaults.flirt);
  };

  const resetDialsToPersonalityDefaults = (): void => {
    const defaults = PERSONALITY_DIAL_DEFAULTS[draftPersonality];
    setDraftProfanity(defaults.profanity);
    setDraftMockery(defaults.mockery);
    setDraftFlirt(defaults.flirt);
  };

  // Auto-save effect: persist every change to draft state with a
  // 250ms debounce so a rapid sequence of toggles doesn't fan out
  // into N Dexie writes. Skips the initial mount (where draft state
  // is just mirroring loaded prefs) via skipFirstSaveRef.
  const skipFirstSaveRef = useRef(true);
  useEffect(() => {
    if (skipFirstSaveRef.current) {
      skipFirstSaveRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void persistPersonality();
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPersonality, draftProfanity, draftMockery, draftFlirt, draftVoiceMap, draftSecondaryVoiceMap]);

  const persistPersonality = async (): Promise<void> => {
    const before = {
      personality: currentPersonality,
      profanity: currentProfanity,
      mockery: currentMockery,
      flirt: currentFlirt,
    };
    const after = {
      personality: draftPersonality,
      profanity: draftProfanity,
      mockery: draftMockery,
      flirt: draftFlirt,
    };
    // Only persist voice-map entries that DIFFER from defaults so the
    // stored object stays compact and a future default change picks up
    // automatically for users who never overrode that personality.
    const voiceOverrides: Partial<Record<CoachPersonality, string>> = {};
    for (const [key, value] of Object.entries(draftVoiceMap) as [CoachPersonality, string][]) {
      if (value !== PERSONALITY_VOICE_DEFAULTS[key]) voiceOverrides[key] = value;
    }
    const secondaryVoiceOverrides: Partial<Record<CoachPersonality, string>> = {};
    for (const [key, value] of Object.entries(draftSecondaryVoiceMap) as [CoachPersonality, string][]) {
      if (value !== PERSONALITY_SECONDARY_VOICE_DEFAULTS[key]) secondaryVoiceOverrides[key] = value;
    }
    const updatedPrefs = {
      ...profile.preferences,
      coachPersonality: draftPersonality,
      coachProfanity: draftProfanity,
      coachMockery: draftMockery,
      coachFlirt: draftFlirt,
      coachPersonalityVoices: voiceOverrides,
      coachPersonalitySecondaryVoices: secondaryVoiceOverrides,
    };
    await db.profiles.update(profile.id, { preferences: updatedPrefs });
    setProfile({ ...profile, preferences: updatedPrefs });
    // Invalidate the voice cache so the new pairings take effect on
    // the next coach speak() without waiting for the 5-min TTL.
    voiceService.clearCache();
    void logAppAudit({
      kind: 'coach-personality-changed',
      category: 'subsystem',
      source: 'PersonalityPanel.autosave',
      summary: `${before.personality} (${before.profanity}/${before.mockery}/${before.flirt}) → ${after.personality} (${after.profanity}/${after.mockery}/${after.flirt}); voice@active=${draftVoiceMap[draftPersonality]}`,
      details: JSON.stringify({ before, after, voiceOverrides, voiceMap: draftVoiceMap }),
    });
  };

  const handleClose = (): void => {
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-between py-2 px-3 w-full rounded-lg border hover:bg-theme-surface transition-colors"
        style={{ borderColor: 'var(--color-border)' }}
        data-testid="personality-row"
        aria-label="Open coach personality settings"
      >
        <div className="flex flex-col items-start text-left">
          <span className="text-sm font-medium">Coach Personality</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {summaryLabel} · {summaryDials}
          </span>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            data-testid="personality-panel-backdrop"
          >
            <motion.div
              className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border-2 p-4"
              style={{
                background: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="personality-panel"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Coach Personality</h2>
                <button
                  onClick={handleClose}
                  className="p-1 rounded-lg hover:bg-theme-surface"
                  aria-label="Close personality settings"
                  data-testid="personality-panel-close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Picker grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {PERSONALITY_OPTIONS.map((opt) => {
                  const selected = draftPersonality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => pickPersonality(opt.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-colors ${
                        selected ? 'bg-theme-surface' : 'hover:bg-theme-surface'
                      }`}
                      style={{
                        borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                      }}
                      data-testid={`personality-card-${opt.id}`}
                      aria-pressed={selected}
                    >
                      <div className="text-sm font-semibold mb-1">{opt.label}</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {opt.blurb}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Per-personality voice picker — voice and personality
                  are orthogonal, so any voice can be paired with any
                  personality. WO-COACH-PERSONALITY-VOICE. */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Primary voice (main narration)</div>
                <div className="space-y-1.5" data-testid="personality-voice-list">
                  {PERSONALITY_OPTIONS.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="text-xs flex-shrink-0 w-28" style={{ color: 'var(--color-text-muted)' }}>
                        {opt.label}
                      </span>
                      <select
                        value={draftVoiceMap[opt.id]}
                        onChange={(e) =>
                          setDraftVoiceMap((prev) => ({ ...prev, [opt.id]: e.target.value }))
                        }
                        className="flex-1 px-2 py-1 rounded-md border text-xs"
                        style={{
                          background: 'var(--color-bg)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                        data-testid={`personality-voice-${opt.id}`}
                        aria-label={`${opt.label} primary voice`}
                      >
                        {POLLY_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secondary voice picker — a contrasting timbre used for
                  short tactic alerts and live-coach interjections so
                  warnings cut through the main narration. Same voice
                  list; defaults pair a different gender / engine.
                  WO-VOICE-LAYER-01 (b). */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Secondary voice (alerts &amp; interjections)</div>
                <div className="space-y-1.5" data-testid="personality-secondary-voice-list">
                  {PERSONALITY_OPTIONS.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="text-xs flex-shrink-0 w-28" style={{ color: 'var(--color-text-muted)' }}>
                        {opt.label}
                      </span>
                      <select
                        value={draftSecondaryVoiceMap[opt.id]}
                        onChange={(e) =>
                          setDraftSecondaryVoiceMap((prev) => ({ ...prev, [opt.id]: e.target.value }))
                        }
                        className="flex-1 px-2 py-1 rounded-md border text-xs"
                        style={{
                          background: 'var(--color-bg)',
                          borderColor: 'var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                        data-testid={`personality-secondary-voice-${opt.id}`}
                        aria-label={`${opt.label} secondary voice`}
                      >
                        {POLLY_VOICES.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dial controls */}
              <div className="space-y-3 mb-4">
                <DialRow
                  label="Profanity"
                  hint="How freely the coach swears."
                  value={draftProfanity}
                  onChange={setDraftProfanity}
                  testIdPrefix="dial-profanity"
                />
                <DialRow
                  label="Mockery"
                  hint="How hard the coach roasts bad moves."
                  value={draftMockery}
                  onChange={setDraftMockery}
                  testIdPrefix="dial-mockery"
                />
                <DialRow
                  label="Flirt"
                  hint="How much sexual subtext the coach leans into."
                  value={draftFlirt}
                  onChange={setDraftFlirt}
                  testIdPrefix="dial-flirt"
                />
                <button
                  onClick={resetDialsToPersonalityDefaults}
                  className="text-xs underline"
                  style={{ color: 'var(--color-text-muted)' }}
                  data-testid="personality-reset-dials"
                >
                  Reset dials to {PERSONALITY_OPTIONS.find((p) => p.id === draftPersonality)?.label ?? 'Default'} defaults
                </button>
              </div>

              {/* Done — settings auto-save on change, this just closes
                  the modal. Single full-width button for tap clarity on
                  mobile. WO-AUTOSAVE-01. */}
              <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-xl border-2 text-sm font-semibold"
                  style={{
                    borderColor: 'var(--color-accent)',
                    background: 'var(--color-accent)',
                    color: 'var(--color-bg)',
                  }}
                  data-testid="personality-done"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface DialRowProps {
  label: string;
  hint: string;
  value: IntensityLevel;
  onChange: (value: IntensityLevel) => void;
  testIdPrefix: string;
}

function DialRow({ label, hint, value, onChange, testIdPrefix }: DialRowProps): JSX.Element {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {INTENSITY_LEVELS.map((level) => {
          const selected = value === level;
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className="flex-1 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors"
              style={{
                borderColor: selected ? 'var(--color-accent)' : 'var(--color-border)',
                background: selected ? 'var(--color-surface)' : 'transparent',
              }}
              data-testid={`${testIdPrefix}-${level}`}
              role="radio"
              aria-checked={selected}
            >
              {INTENSITY_LABELS[level]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
