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
import { THEMES, getThemeById, applyTheme } from './themeService';

/** Resolve a theme phrase to a real theme id from the registry. "dark"/"light"
 *  map to the premium/minimal defaults; a named theme ("midnight blue", "neon")
 *  matches by id/name. kid-mode is never coach-selectable. */
function resolveThemeId(t: string): string | null {
  if (/\b(dark|night|black|midnight|dim)\b/.test(t)) return 'dark-premium';
  if (/\b(light|day|bright|minimal|white)\b/.test(t)) return 'light-minimal';
  for (const th of THEMES) {
    if (th.id === 'kid-mode') continue;
    const idWords = th.id.replace(/-/g, ' ');
    const nameWords = (th.name ?? '').toLowerCase();
    if ((idWords && t.includes(idWords)) || (nameWords && t.includes(nameWords))) return th.id;
  }
  return null;
}

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

  // ── "stop talking / be quiet / shut up" → voice off ───────────────────────
  // A bare "stop"/"quiet" imperative with a talk/speak/narrate object clearly
  // silences the coach, but names no explicit "voice" noun the structured
  // branch matches (matrix pass 2, 2026-07-10). Handled up front, before the
  // generic command gate (which "stop talking" wouldn't otherwise pass).
  if (
    /\b(?:stop|quit|cut\s+out|knock\s+off|cut)\s+(?:the\s+)?(?:talk(?:ing)?|speak(?:ing)?|narrat(?:ing|ion)|chatter(?:ing)?)\b/.test(t) ||
    /\bbe\s+quiet\b/.test(t) ||
    /\bshut\s+up\b/.test(t)
  ) {
    return {
      key: 'coachVoiceOn',
      confirmation: 'Voice narration is off now.',
      prefsPatch: { coachVoiceOn: false, voiceEnabled: false },
      applyStore: () => useAppStore.getState().setCoachVoiceOn(false),
    };
  }

  // ── Terse noun-first shortcuts ("hints on", "narration to full") ──────────
  // Real users drop the verb (matrix pass 5, 2026-07-10). Handle the
  // unambiguous noun+value forms up front, before the imperative-verb gate.
  {
    const hintsTerse = t.match(/^\s*hints?\s+(on|off)\s*$/);
    if (hintsTerse) {
      const on = hintsTerse[1] === 'on';
      return { key: 'showHints', confirmation: on ? 'Hints are on now.' : 'Hints are off now.', prefsPatch: { showHints: on } };
    }
    const narrTerse = t.match(/^\s*(?:narration|verbosity)\s+(?:to\s+)?(\w+)\s*$/);
    if (narrTerse && NARRATION_WORD[narrTerse[1]]) {
      const value = NARRATION_WORD[narrTerse[1]];
      return { key: 'coachNarration', confirmation: `Narration is set to ${value} now.`, prefsPatch: { coachNarration: value } };
    }
  }

  // Must look like a COMMAND (not a query) — an imperative settings verb.
  const isCommand = /\b(turn|switch|set|enable|disable|make|change|mute|unmute|use|put|silence|activate|deactivate|keep|give|want|go|stop|show)\b/.test(t);
  if (!isCommand) return null;

  const onWord = /\b(on|enable|enabled|start|unmute|use|activate)\b/.test(t);
  const offWord = /\b(off|disable|disabled|stop|mute|muted|silence|deactivate)\b/.test(t);

  // ── Unambiguous "silence/mute the coach" + "make it silent/quiet" ─────────
  // Natural phrasings that name no explicit "voice/narration" noun but clearly
  // silence the coach (matrix audit 2026-07-09: "mute the coach", "make the
  // coach silent"). Handled up front so the structured branches below don't
  // need to over-match on the bare word "coach".
  if (/\b(mute|silence)\b/.test(t) && /\b(coach|voice|narration|audio|it|you|everything)\b/.test(t)) {
    return {
      key: 'coachVoiceOn',
      confirmation: 'Voice narration is off now.',
      prefsPatch: { coachVoiceOn: false, voiceEnabled: false },
      applyStore: () => useAppStore.getState().setCoachVoiceOn(false),
    };
  }
  if (/\b(silent|quiet)\b/.test(t) && /\b(make|set|keep|coach|narration|it|you)\b/.test(t)) {
    return { key: 'coachNarration', confirmation: 'Narration is set to silent now.', prefsPatch: { coachNarration: 'silent' } };
  }

  // ── Voice narration on/off ────────────────────────────────────────────
  // Exclude "premium voice"/"polly"/"natural voice" — those are the Polly
  // branch below, even though they contain the word "voice".
  if (
    /\b(voice|narration|narrate|coach\s+voice|speak|talk|audio)\b/.test(t) &&
    !/\bverbosity\b/.test(t) &&
    !/\b(premium|polly|natural|better|nicer|realistic|human|higher[\s-]quality)\s+voice\b/.test(t) &&
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
  // "premium/polly/natural voice" plus the descriptive synonyms a user reaches
  // for ("the better/nicer/realistic/human voice"). "switch to the better
  // voice" carries no on-word, so treat a "switch/change to" as ON here (a
  // "switch to X voice" means enable X) — matrix pass 2, 2026-07-10.
  if (/\b(premium\s+voice|polly|natural\s+voice|better\s+voice|nicer\s+voice|realistic\s+voice|human\s+voice|higher[\s-]quality\s+voice)\b/.test(t)) {
    const switchTo = /\b(?:switch|change)\s+to\b/.test(t);
    if (onWord || offWord || switchTo) {
      const on = !offWord;
      return {
        key: 'cloudEnabled',
        confirmation: on ? 'The premium voice is on now.' : 'The premium voice is off; narration uses the device voice.',
        prefsPatch: { cloudEnabled: on },
      };
    }
  }

  // ── Theme (dark / light / a named theme) ─────────────────────────────
  if (/\b(theme|mode|dark|light|night|day)\b/.test(t)) {
    const themeId = resolveThemeId(t);
    if (themeId) {
      const theme = getThemeById(themeId);
      return {
        key: 'theme',
        confirmation: `Switched to the ${theme.name ?? themeId} theme.`,
        prefsPatch: { theme: themeId } as PrefsPatch,
        applyStore: () => {
          applyTheme(theme);
          useAppStore.getState().setActiveTheme(theme);
        },
      };
    }
  }

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
        // SYNC THE LIVE STORE (David 2026-07-10 settings audit). The verbosity
        // gate reads `useAppStore.getState().activeProfile` at speak time and
        // voiceService caches prefs — so a Dexie-only write (the case for
        // showHints + coachNarration, which had no `applyStore`) didn't take
        // effect until reload. Update the live profile + drop the voice cache so
        // silent/brief/hints apply IMMEDIATELY, on every surface.
        const store = useAppStore.getState();
        if (store.activeProfile && store.activeProfile.id === profile.id) {
          store.setActiveProfile({ ...store.activeProfile, preferences: { ...store.activeProfile.preferences, ...cmd.prefsPatch } });
        }
      }
    }
    if (cmd.applyStore) cmd.applyStore();
    try { const { voiceService } = await import('./voiceService'); voiceService.clearCache?.(); } catch { /* voice absent (SSR/test) */ }
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
