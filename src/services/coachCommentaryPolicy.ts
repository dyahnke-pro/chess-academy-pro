/**
 * coachCommentaryPolicy
 * ---------------------
 * Decides whether the coach should invoke the LLM for per-move
 * commentary during a play-against game. Pure, synchronous, no side
 * effects — safe to call from the hot path after every move.
 *
 * Why gate? Every move firing generateMoveCommentary quickly becomes
 * the largest unit cost of a play session. Most moves don't need
 * LLM-generated commentary — users want rich feedback on the
 * interesting moments (blunders, brilliants, turning points) and
 * brief deterministic feedback on routine moves. Gating cuts
 * per-game LLM spend ~60% without losing the pedagogically valuable
 * commentary.
 */
import type { MoveClassification, UserProfile } from '../types';

/** Move classifications that ALWAYS get LLM commentary in
 *  'key-moments' mode. These are the moves a learner actually gains
 *  from discussing — mistakes that need correction and moments of
 *  brilliance that reinforce good patterns. */
const KEY_MOMENT_CLASSIFICATIONS: ReadonlySet<MoveClassification> = new Set<MoveClassification>([
  'blunder',
  'mistake',
  'brilliant',
  'great',
]);

export type CommentaryVerbosity = NonNullable<UserProfile['preferences']['coachCommentaryVerbosity']>;

/**
 * Resolve the effective verbosity, defaulting to 'key-moments' for
 * any user who hasn't explicitly picked a mode. This is the setting
 * that protects our unit economics at launch.
 */
export function resolveVerbosity(profile: UserProfile | null | undefined): CommentaryVerbosity {
  return profile?.preferences.coachCommentaryVerbosity ?? 'key-moments';
}

/**
 * Should we invoke the LLM for this particular move?
 *
 * Rules:
 *   - 'off'         — never. Commentary comes purely from the local
 *                     tactic classifier (tacticSuffix in CoachGamePage).
 *   - 'key-moments' — only when the move classification is blunder /
 *                     mistake / brilliant / great.
 *   - 'every-move'  — always (legacy, expensive).
 */
export function shouldCallLlmForMove(
  verbosity: CommentaryVerbosity,
  classification: MoveClassification,
): boolean {
  if (verbosity === 'off') return false;
  if (verbosity === 'every-move') return true;
  return KEY_MOMENT_CLASSIFICATIONS.has(classification);
}
