/**
 * coachIntentRouter
 * -----------------
 * Shared chat → session routing used by BOTH the full coach chat page
 * and the mobile chat drawer. Given a user message, decides whether to
 * hijack the chat and navigate to a dynamic session, or fall through
 * to the normal LLM reply.
 *
 * Pre-validation is the whole point: `parseCoachIntent` is greedy by
 * design (it's also used in SmartSearchBar for live previews), so "teach
 * me about forks" returns kind: 'walkthrough' with subject "about forks"
 * even though no opening matches. Without a resource check we'd dump
 * the user onto a failed session screen instead of answering in chat.
 *
 * Resolution:
 *   - play-against    → always navigates (no lookup needed)
 *   - explain-position → always navigates (uses starting FEN if no ?fen)
 *   - puzzle          → only navigates when a known tactical theme
 *                        resolves from the extracted theme string
 *   - walkthrough     → only navigates when an opening match is found
 *   - continue-middlegame → only navigates when a DB plan or opening
 *                           match is found (Stockfish fallback is for
 *                           URL-driven launches, not chat hijack — chat
 *                           should still prefer a grounded lesson)
 *   - qa              → never navigates
 */
import { parseCoachIntent } from './coachAgent';
import type { CoachIntent, CoachDifficulty } from './coachAgent';
import { matchOpeningForSubject } from './walkthroughResolver';
import {
  findPlanForOpening,
  findPlanBySubject,
} from './middlegamePlanner';
import { TACTICAL_THEMES } from './puzzleService';

export interface RoutedChatIntent {
  /** Relative path (starts with `/`) for the session route. */
  path: string;
  /** Acknowledgement message to show in the chat before navigating. */
  ackMessage: string;
  /** The parsed intent, exposed for analytics / tests. */
  intent: CoachIntent;
}

export interface RouteChatIntentOptions {
  /**
   * Optional current board FEN to forward to explain-position. When
   * omitted, the session page defaults to the starting position. See
   * WO-CURRENT-POSITION for the broader follow-up.
   */
  currentFen?: string;
}

/**
 * Map a user message to a session route, or return null if the message
 * should be handled as normal LLM chat.
 */
export async function routeChatIntent(
  text: string,
  options: RouteChatIntentOptions = {},
): Promise<RoutedChatIntent | null> {
  const intent = parseCoachIntent(text);

  switch (intent.kind) {
    case 'qa':
      return null;

    case 'play-against': {
      const params = new URLSearchParams();
      if (intent.subject) params.set('subject', intent.subject);
      if (intent.side) params.set('side', intent.side);
      if (intent.difficulty) params.set('difficulty', intent.difficulty);
      return {
        path: withQuery('/coach/session/play-against', params),
        ackMessage: buildPlayAckMessage(intent),
        intent,
      };
    }

    case 'explain-position': {
      const params = new URLSearchParams();
      if (options.currentFen) params.set('fen', options.currentFen);
      return {
        path: withQuery('/coach/session/explain-position', params),
        ackMessage: 'Let me analyse this position…',
        intent,
      };
    }

    case 'puzzle': {
      // Only navigate when the theme maps to a known tactic. Otherwise
      // "a puzzle about my weak squares" falls through to normal chat
      // where the LLM can interpret it.
      const theme = resolvePuzzleTheme(intent.theme);
      if (!theme && intent.theme) return null;
      const params = new URLSearchParams();
      if (theme) params.set('theme', theme);
      if (intent.difficulty && intent.difficulty !== 'auto')
        params.set('difficulty', intent.difficulty);
      return {
        path: withQuery('/coach/session/puzzle', params),
        ackMessage: theme
          ? `Loading ${theme} puzzles…`
          : 'Loading puzzle trainer…',
        intent,
      };
    }

    case 'walkthrough': {
      if (!intent.subject) return null;
      const match = await matchOpeningForSubject(intent.subject);
      if (!match) return null;
      const params = new URLSearchParams();
      params.set('subject', intent.subject);
      return {
        path: withQuery('/coach/session/walkthrough', params),
        ackMessage: `Loading the ${match.opening.name} walkthrough…`,
        intent,
      };
    }

    case 'continue-middlegame': {
      // Prefer a DB plan match keyed off the subject. If the user just
      // said "middlegame" with no opening name we fall through to chat
      // — there's nothing to continue without context.
      const subject = intent.subject?.trim() ?? '';
      const plan =
        (subject && (findPlanForOpening(subject) ?? findPlanBySubject(subject))) ||
        null;
      if (!plan && !subject) return null;
      const params = new URLSearchParams();
      if (subject) params.set('subject', subject);
      return {
        path: withQuery('/coach/session/middlegame', params),
        ackMessage: plan
          ? `Loading the middlegame plan for ${plan.title}…`
          : 'Working out a middlegame plan…',
        intent,
      };
    }

    default:
      return null;
  }
}

function withQuery(path: string, params: URLSearchParams): string {
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Match a free-text puzzle theme against the known TACTICAL_THEMES set.
 * Keeps this tight — users who say "fork puzzle" get routed; users who
 * say "endgame study puzzle" also match ("endgame" is a theme).
 */
function resolvePuzzleTheme(theme: string | undefined): string | null {
  if (!theme) return null;
  const lower = theme.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
  for (const t of TACTICAL_THEMES) {
    // Handle camelCase themes (backRankMate → "back rank mate") BEFORE
    // lowercasing so the [A-Z] split still triggers.
    const spaced = t.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
    const tLower = t.toLowerCase();
    const re = new RegExp(`\\b${escapeRegExp(tLower)}\\b`);
    const reSpaced = new RegExp(`\\b${escapeRegExp(spaced)}\\b`);
    if (re.test(lower) || reSpaced.test(lower)) return t;
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPlayAckMessage(intent: CoachIntent): string {
  const parts: string[] = ['Let\'s play!'];
  if (intent.subject) parts.push(`You asked for ${intent.subject}.`);
  if (intent.side) parts.push(`You'll play ${intent.side}.`);
  if (intent.difficulty && intent.difficulty !== 'auto') {
    parts.push(`Difficulty: ${intent.difficulty}.`);
  }
  parts.push('Setting up a game…');
  return parts.join(' ');
}

/** Test hook — exposed for unit tests only. */
export function __test__resolvePuzzleTheme(theme: string | undefined): string | null {
  return resolvePuzzleTheme(theme);
}

export type { CoachDifficulty };
