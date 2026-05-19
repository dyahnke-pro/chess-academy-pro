/**
 * Single source of truth for "how much should the coach speak right now."
 *
 * Reads the unified `coachNarration` preference if set; otherwise
 * derives an equivalent value from the three legacy per-surface
 * controls (`coachCommentaryVerbosity`, `phaseNarrationVerbosity`,
 * `coachVerbosity`) so existing user profiles keep their effective
 * verbosity without a one-shot migration.
 *
 * Mapping precedence: any one legacy field at its silent value wins
 * 'silent'. Otherwise any one at a brief-equivalent wins 'brief'.
 * Otherwise 'full'. This intentionally biases toward the quieter end
 * — if a user previously gated even one surface to off/brief, the
 * unified default should respect that, not regress to verbose.
 */
import type { CoachNarration, PhaseNarrationVerbosity, UserPreferences } from '../types';
import { stripScaffolding } from '../services/sanitizeCoachText';

export function resolveCoachNarration(
  prefs: Pick<
    UserPreferences,
    | 'coachNarration'
    | 'coachCommentaryVerbosity'
    | 'phaseNarrationVerbosity'
    | 'coachVerbosity'
  > | undefined
  | null,
): CoachNarration {
  if (!prefs) return 'full';
  if (prefs.coachNarration) return prefs.coachNarration;

  const silentSignals = [
    prefs.coachCommentaryVerbosity === 'off',
    prefs.phaseNarrationVerbosity === 'off',
    prefs.coachVerbosity === 'none',
  ];
  if (silentSignals.some(Boolean)) return 'silent';

  const briefSignals = [
    prefs.coachCommentaryVerbosity === 'key-moments',
    prefs.phaseNarrationVerbosity === 'brief',
    prefs.coachVerbosity === 'fast',
  ];
  if (briefSignals.some(Boolean)) return 'brief';

  return 'full';
}

/**
 * Maps the unified setting back to a narration length for the
 * pickNarrationText helper. 'silent' → caller should skip the speak
 * call entirely; 'brief' → walkthrough steps use shortNarration when
 * present; 'full' → use the long narration text.
 */
export function coachNarrationToLength(
  v: CoachNarration,
): 'silent' | 'short' | 'full' {
  if (v === 'silent') return 'silent';
  if (v === 'brief') return 'short';
  return 'full';
}

/**
 * Resolves the phase-transition narration verbosity. Mirrors
 * `resolveVerbosity` in coachCommentaryPolicy: the unified
 * `coachNarration` preference wins; falls back to the legacy
 * `phaseNarrationVerbosity` field, then 'standard' as default.
 */
export function resolvePhaseNarrationVerbosity(
  prefs: Pick<
    UserPreferences,
    'coachNarration' | 'phaseNarrationVerbosity'
  > | undefined
  | null,
): PhaseNarrationVerbosity {
  if (!prefs) return 'standard';
  if (prefs.coachNarration === 'silent') return 'off';
  if (prefs.coachNarration === 'brief') return 'brief';
  if (prefs.coachNarration === 'full') return 'standard';
  return prefs.phaseNarrationVerbosity ?? 'standard';
}

/**
 * Resolves the LLM-output-length knob (legacy `coachVerbosity`) for
 * per-move commentary on /coach/play. Tied to the unified
 * `coachNarration` setting so Brief actually produces SHORT LLM
 * output instead of full-length prose:
 *
 *   - coachNarration='silent' → 'none'   (short-circuits the LLM call)
 *   - coachNarration='brief'  → 'fast'   (LLM gets the brief-length cap in its prompt)
 *   - coachNarration='full'   → legacy `coachVerbosity` (default 'unlimited')
 *
 * Audit (CoachGamePage.tsx:2662) caught this: `narrationDensity` was
 * being read straight from `coachVerbosity` and defaulted to
 * 'unlimited' on every profile that never touched the legacy dial.
 * That meant Brief-mode key-moment narrations still came back as
 * full-length prose — same three-way-verbosity confusion the unified
 * setting was supposed to fix, just hiding one level deeper.
 */
export function resolveLlmNarrationDensity(
  prefs: Pick<UserPreferences, 'coachNarration' | 'coachVerbosity'> | undefined | null,
): 'none' | 'fast' | 'medium' | 'slow' | 'unlimited' {
  if (!prefs) return 'unlimited';
  if (prefs.coachNarration === 'silent') return 'none';
  if (prefs.coachNarration === 'brief') return 'fast';
  // 'full' or unset → legacy coachVerbosity (for old profiles that
  // touched the dial pre-unification) or 'unlimited' default.
  return prefs.coachVerbosity ?? 'unlimited';
}

/** Hard word-count cap matching the `fast` prompt instruction's
 *  HARD CAP rule. Belt-and-suspenders for when the LLM ignores
 *  the prompt — production audit (2026-05-18, David's report)
 *  caught the brain shipping 497-char responses on "Brief". */
const BRIEF_VOICE_WORD_CAP = 30;
/** Sentence-count cap for `fast` — first 2 sentences only, even if
 *  the brain ships 5. */
const BRIEF_VOICE_SENTENCE_CAP = 2;

/**
 * Enforce the verbosity cap on text that's about to be spoken /
 * shown. When the user set coachNarration='brief', truncate the
 * text to the brief budget (≤2 sentences, ≤30 words) so the spoken
 * narration matches the user's preference even if the LLM ignored
 * the prompt cap. Idempotent — short text passes through unchanged.
 *
 * The chat bubble may show the full text (it's silent prose the user
 * reads on demand). The VOICE always speaks the truncated version.
 * Callers should pass the same prefs they already use for the
 * voiceEnabled / pollyEnabled gates.
 *
 * Returns `{ text, truncated, originalLength }` so the call site can
 * emit a `voice-truncated-by-verbosity` audit when truncated=true —
 * lets us observe how often the LLM violates the cap in prod.
 */
export function applyBriefVoiceCap(
  text: string,
  verbosity: CoachNarration,
): { text: string; truncated: boolean; originalLength: number } {
  const originalLength = text.length;
  if (verbosity !== 'brief') return { text, truncated: false, originalLength };
  // Strip leading scaffolding ("Great question — ", "Let me show you …")
  // BEFORE the cap counts words. The LLM ignores the prompt ban; this
  // strip recovers the chess content that would otherwise get clipped
  // off the back when the cap fires. Live audit 2026-05-19 (Bug I).
  const trimmed = stripScaffolding(text.trim()).text;
  if (!trimmed) return { text: trimmed, truncated: false, originalLength };

  // Sentence-split — scan for `. ! ?` terminators followed by
  // whitespace OR end-of-string, AND not preceded by a digit (digits
  // before periods are SAN-disambiguation like "Nbd7." or "f3.", not
  // sentence ends). Each sentence keeps its trailing terminator so
  // joining preserves the period/question/exclamation between
  // sentences.
  //
  // Bug F regression (audit 2026-05-19): the previous greedy regex
  // `/[^.!?\n]+(?<!\d)[.!?]?/g` backtracked when the lookbehind
  // failed, eating the trailing digit of any SAN ending in [1-8]
  // followed by a period. "Nbd7." became "Nbd" in the sentence
  // boundary, and the join-with-space dropped the period too — so
  // "Correct, Nbd7. Nbd7 gets..." spoke as "Correct, Nbd Nbd7
  // gets..." and "Nb4. Your..." spoke as "knight to b Your...".
  // Same bug, two visible failure modes. Scan-and-skip below avoids
  // the backtracking entirely.
  const sentences: string[] = [];
  {
    const SENTENCE_TERMINATOR_RE = /[.!?]+(?=\s|$)/g;
    let cursor = 0;
    let m: RegExpExecArray | null;
    SENTENCE_TERMINATOR_RE.lastIndex = 0;
    while ((m = SENTENCE_TERMINATOR_RE.exec(trimmed)) !== null) {
      const beforeIdx = m.index - 1;
      // SAN-disambiguation guard: "Nbd7." — the period is part of
      // the move number, not a sentence end. Skip this terminator
      // and let the next one (or the end of string) close the
      // sentence.
      if (beforeIdx >= 0 && /\d/.test(trimmed[beforeIdx])) continue;
      const end = m.index + m[0].length;
      sentences.push(trimmed.slice(cursor, end).trim());
      cursor = end;
    }
    if (cursor < trimmed.length) sentences.push(trimmed.slice(cursor).trim());
  }
  const filteredSentences = sentences.filter((s) => s.length > 0);
  const sentencesForCap = filteredSentences.length > 0 ? filteredSentences : [trimmed];

  // Early-out: input already obeys both caps → return it unchanged.
  const totalWords = trimmed.split(/\s+/).length;
  if (sentencesForCap.length <= BRIEF_VOICE_SENTENCE_CAP && totalWords <= BRIEF_VOICE_WORD_CAP) {
    return { text: trimmed, truncated: false, originalLength };
  }

  // Join with a single space — each kept sentence still carries its
  // own terminator from the slice above, so the result reads as
  // separate sentences instead of a run-on.
  let chosen = sentencesForCap.slice(0, BRIEF_VOICE_SENTENCE_CAP).join(' ').trim();

  // Word-count cap. When the kept sentences still exceed the word
  // budget, truncate to the cap and close cleanly with a period.
  const words = chosen.split(/\s+/);
  if (words.length > BRIEF_VOICE_WORD_CAP) {
    chosen = words.slice(0, BRIEF_VOICE_WORD_CAP).join(' ');
    // Strip trailing comma / dangling preposition; close with a period.
    chosen = chosen.replace(/[,;:\s]+$/, '').replace(/\b(and|but|or|because|so|that|the|a|of|to|in)$/, '').trim();
    if (!/[.!?]$/.test(chosen)) chosen += '.';
  }

  return {
    text: chosen,
    truncated: chosen.length < trimmed.length,
    originalLength,
  };
}
