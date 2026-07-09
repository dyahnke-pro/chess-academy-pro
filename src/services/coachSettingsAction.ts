/**
 * coachSettingsAction — the MUTATE half of settings-as-actions (David: "the
 * coach should turn settings on and off for the user!!").
 *
 * The coach can change the user's SAFE preferences on command ("turn on voice",
 * "set my narration to brief", "switch to dark theme", "enable hints"). The
 * setting + value are resolved in CODE from a fixed whitelist — the LLM never
 * decides which pref to flip or to what. Applied to the profile (Dexie) AND the
 * runtime store, then the coach CONFIRMS.
 *
 * SAFETY: only the whitelist below is mutable. API keys, cloud-sync creds,
 * backup/restore, and data deletion are NEVER reachable here — an unrecognized
 * or unsafe command resolves to null and the coach says it can't change that.
 *
 * Non-React: reads/writes Dexie directly and mirrors into the Zustand store via
 * `useAppStore.getState()`, so it runs from any surface (chat, mic, teach).
 */
import { db } from '../db/schema';
import { useAppStore } from '../stores/appStore';
import type { CoachNarration, UserProfile } from '../types';
import { logAppAudit } from './appAuditor';

export interface SettingsCommandResult {
  /** Human confirmation the coach voices ("Voice narration is on now."). */
  confirmation: string;
  /** The setting key that changed (for audit). */
  key: string;
}

type PrefsPatch = Partial<UserProfile['preferences']>;

/** A resolved, whitelisted settings command: how to describe it, what Dexie
 *  pref patch to write, and an optional runtime-store mirror. */
interface ResolvedCommand {
  key: string;
  confirmation: string;
  prefsPatch?: PrefsPatch;
  applyStore?: () => void;
}

const NARRATION_WORD: Record<string, CoachNarration> = {
  silent: 'silent', none: 'silent', off: 'silent', mute: 'silent', muted: 'silent',
  brief: 'brief', short: 'brief', quick: 'brief', concise: 'brief',
  full: 'full', long: 'full', detailed: 'full', complete: 'full', verbose: 'full',
};

/** Resolve a natural-language settings command to a whitelisted mutation.
 *  Returns null when the command isn't a safe, recognized settings change
 *  (the caller then declines rather than guessing). Pure + testable. */
export function resolveSettingsCommand(text: string): ResolvedCommand | null {
  const t = text.toLowerCase().trim();

  // Must look like a COMMAND (not a query) — an imperative settings verb.
  const isCommand = /\b(turn|switch|set|enable|disable|make|change|mute|unmute)\b/.test(t);
  if (!isCommand) return null;

  const onWord = /\b(on|enable|enabled|start|unmute)\b/.test(t);
  const offWord = /\b(off|disable|disabled|stop|mute|muted|silence)\b/.test(t);

  // ── Voice narration on/off ────────────────────────────────────────────
  // Exclude "premium voice"/"polly"/"natural voice" — those are the Polly
  // branch below, even though they contain the word "voice".
  if (
    /\b(voice|narration|narrate|coach\s+voice|speak|talk|audio)\b/.test(t) &&
    !/\bverbosity\b/.test(t) &&
    !/\b(premium|polly|natural)\b/.test(t)
  ) {
    // Narration LEVEL takes priority when a level word is present.
    const lvl = Object.keys(NARRATION_WORD).find((w) => new RegExp(`\\b${w}\\b`).test(t));
    if (/\b(narration|verbosity)\b/.test(t) && lvl && !onWord && !offWord) {
      const value = NARRATION_WORD[lvl];
      return {
        key: 'coachNarration',
        confirmation: `Narration is set to ${value} now.`,
        prefsPatch: { coachNarration: value },
      };
    }
    if (onWord || offWord) {
      const on = onWord && !offWord;
      return {
        key: 'coachVoiceOn',
        confirmation: on ? 'Voice narration is on now.' : 'Voice narration is off now.',
        prefsPatch: { coachVoiceOn: on, voiceEnabled: on },
        applyStore: () => useAppStore.getState().setCoachVoiceOn(on),
      };
    }
  }

  // ── Narration LEVEL (silent / brief / full) ───────────────────────────
  if (/\b(narration|verbosity)\b/.test(t)) {
    const lvl = Object.keys(NARRATION_WORD).find((w) => new RegExp(`\\b${w}\\b`).test(t));
    if (lvl) {
      const value = NARRATION_WORD[lvl];
      return {
        key: 'coachNarration',
        confirmation: `Narration is set to ${value} now.`,
        prefsPatch: { coachNarration: value },
      };
    }
  }

  // ── Hints ─────────────────────────────────────────────────────────────
  if (/\bhints?\b/.test(t) && (onWord || offWord)) {
    const on = onWord && !offWord;
    return {
      key: 'showHints',
      confirmation: on ? 'Hints are on now.' : 'Hints are off now.',
      prefsPatch: { showHints: on },
    };
  }

  // ── Premium voice (Polly) ─────────────────────────────────────────────
  if (/\b(premium\s+voice|polly|natural\s+voice)\b/.test(t) && (onWord || offWord)) {
    const on = onWord && !offWord;
    return {
      key: 'pollyEnabled',
      confirmation: on ? 'The premium voice is on now.' : 'The premium voice is off; narration uses the device voice.',
      prefsPatch: { pollyEnabled: on },
    };
  }

  // NOTE: theme switching ("dark/light") is deferred — AppTheme is a full theme
  // OBJECT resolved from the theme registry, not a 'dark'|'light' string, so it
  // needs the registry wired in. Voice/narration/hints/premium-voice cover the
  // common asks; theme lands in a follow-up.

  return null;
}

/**
 * Apply a settings command. Returns the confirmation to voice, or null when the
 * command isn't a safe recognized settings change (caller declines). Persists to
 * Dexie + mirrors the runtime store, and audits every mutation.
 */
export async function applyCoachSetting(text: string): Promise<SettingsCommandResult | null> {
  const cmd = resolveSettingsCommand(text);
  if (!cmd) return null;
  try {
    if (cmd.prefsPatch) {
      const profile = await db.profiles.get('main');
      if (profile) {
        const updatedPrefs = { ...profile.preferences, ...cmd.prefsPatch };
        await db.profiles.update(profile.id, { preferences: updatedPrefs });
      }
    }
    if (cmd.applyStore) cmd.applyStore();
    void logAppAudit({
      kind: 'coach-setting-changed',
      category: 'subsystem',
      source: 'coachSettingsAction.applyCoachSetting',
      summary: `key=${cmd.key} — ${cmd.confirmation}`,
      details: JSON.stringify({ key: cmd.key, command: text.slice(0, 120) }),
    });
    return { confirmation: cmd.confirmation, key: cmd.key };
  } catch (err) {
    console.warn('[coachSettingsAction] apply failed:', err);
    return null;
  }
}
