/**
 * coachCommentaryPolicy
 * ---------------------
 * Resolves the effective in-game commentary verbosity from the student's
 * settings. Pure, synchronous, no side effects.
 *
 * The LLM per-move gate that used to live here (`shouldCallLlmForMove`) is
 * DELETED with the LLM per-move commentary it gated (WO-STORY-MATRIX-01 P1-1,
 * David 2026-10-30): Play volunteers nothing, and the voice phrases computed
 * facts only (G0).
 */
import type { UserProfile } from '../types';

type CommentaryVerbosity = NonNullable<UserProfile['preferences']['coachCommentaryVerbosity']>;

/**
 * Resolve the effective verbosity, defaulting to 'key-moments' for
 * any user who hasn't explicitly picked a mode. This is the setting
 * that protects our unit economics at launch.
 *
 * The unified `coachNarration` preference takes precedence: when set
 * to 'silent' → 'off', 'brief' → 'key-moments', 'full' → 'every-move'.
 * Falls back to the legacy `coachCommentaryVerbosity` for older
 * profiles, then 'key-moments' as the safe default.
 */
export function resolveVerbosity(profile: UserProfile | null | undefined): CommentaryVerbosity {
  const unified = profile?.preferences.coachNarration;
  if (unified === 'silent') return 'off';
  if (unified === 'brief') return 'key-moments';
  if (unified === 'full') return 'every-move';
  return profile?.preferences.coachCommentaryVerbosity ?? 'key-moments';
}
