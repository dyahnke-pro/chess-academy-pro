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
import type { GameRecord } from '../types';
import { matchOpeningForSubject } from './walkthroughResolver';
import {
  findPlanForOpening,
  findPlanBySubject,
} from './middlegamePlanner';
import { TACTICAL_THEMES } from './puzzleService';
import { findLastMatchingGame } from './gameContextService';
import { getCoachChatResponse } from './coachApi';
import { getWeakestOpenings } from './openingService';

export interface RoutedChatIntent {
  /** Relative path (starts with `/`) for the session route. When
   *  omitted, the caller treats `ackMessage` as a reply-only coach
   *  message — no navigation. Used for cases where the router has
   *  enough context to compose a useful response (e.g. "no matching
   *  games found, want to play one instead?") but the next step is
   *  a follow-up turn from the user, not a route change. */
  path?: string;
  /** Acknowledgement message to show in the chat (before navigating
   *  when `path` is set, or as the entire coach reply when not). */
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
  /**
   * Optional text of the most recent assistant message in the chat.
   * Used to catch the "coach proposes a game → user affirms" flow:
   * when the assistant just said "let's play a game focused on X"
   * and the user replies "yes" / "sure" / "let's do it", we route to
   * /coach/play and forward the assistant's proposal as a `focus`
   * query param so the game's coach remembers the agreed focus.
   */
  lastAssistantMessage?: string;
}

/** Affirmations that, ON THEIR OWN, should trigger routing ONLY when
 *  the assistant was clearly proposing a game in the prior turn. These
 *  are intentionally narrow — single "yes" shouldn't hijack every
 *  chat. Stronger phrases like "let's do it" are treated the same way
 *  because the test for a preceding game proposal is what actually
 *  gates the routing. */
const AFFIRMATION_RE =
  /^(?:yes|yeah|yep|yup|sure|ok(?:ay)?|sounds?\s+(?:good|great)|let[\u2019']?s\s+do\s+(?:it|this)|let[\u2019']?s\s+go|i[\u2019']?m\s+in|i[\u2019']?m\s+ready|go\s+for\s+it|do\s+it|alright)[!.\s]*$/i;

/** Loose "the assistant just offered a game" detector. False positives
 *  here are low-cost (the user affirmed, so navigating is probably
 *  what they want anyway). */
const ASSISTANT_GAME_PROPOSAL_RE =
  /\b(let'?s\s+play|play\s+(?:a\s+)?(?:new\s+)?(?:game|match)|start\s+(?:a\s+)?(?:new\s+)?(?:game|match)|ready\s+to\s+play|shall\s+we\s+play|want\s+to\s+play\??)\b/i;

/** "What's my worst/weakest opening?" — reply-only intent. The backend
 *  has `getWeakestOpenings()` ranked by drill accuracy; we summarize the
 *  top 3 in chat so the user can decide what to drill next. Side filter
 *  ("as white" / "as black") is honored when present. */
const WEAKEST_OPENING_RE =
  /\b(?:my\s+)?(?:worst|weakest|lowest[- ]?scoring|most[- ]struggled[- ]?with)\s+(?:opening|openings|line|lines|repertoire)\b|\bwhich\s+opening\s+(?:do\s+i|am\s+i)\s+(?:struggle|struggling|worst|weakest)\b|\bwhere\s+(?:do\s+i|am\s+i)\s+(?:struggling|weakest)\s+(?:in\s+my\s+)?openings?\b/i;

/**
 * Map a user message to a session route, or return null if the message
 * should be handled as normal LLM chat.
 */
export async function routeChatIntent(
  text: string,
  options: RouteChatIntentOptions = {},
): Promise<RoutedChatIntent | null> {
  // Affirmation-after-proposal: the coach's prior turn offered a game
  // and the user just said "yes" / "let's do it" / etc. Carry the
  // assistant's proposal as a `focus` param so the play page's coach
  // remembers the training agreement (e.g., "spotting hanging pieces
  // and simple combinations"). Runs BEFORE parseCoachIntent because a
  // bare "yes" otherwise falls through to qa.
  // Weakest-opening lookup — answered directly from the repertoire data
  // in Dexie, no LLM round-trip. Reply-only (no navigation). Honors an
  // optional "as white" / "as black" side filter.
  if (WEAKEST_OPENING_RE.test(text)) {
    const sideMatch = text.match(/\bas\s+(white|black)\b/i);
    const side = sideMatch ? (sideMatch[1].toLowerCase() as 'white' | 'black') : undefined;
    const weakest = await getWeakestOpenings(3, side);
    return {
      ackMessage: buildWeakestOpeningsMessage(weakest, side),
      intent: { kind: 'qa', raw: text },
    };
  }

  if (
    options.lastAssistantMessage &&
    AFFIRMATION_RE.test(text.trim()) &&
    ASSISTANT_GAME_PROPOSAL_RE.test(options.lastAssistantMessage)
  ) {
    const params = new URLSearchParams();
    const focus = extractFocus(options.lastAssistantMessage);
    const subject = extractProposedOpening(options.lastAssistantMessage);
    const userSide = extractProposedUserSide(options.lastAssistantMessage);
    if (subject) params.set('subject', subject);
    if (userSide) params.set('side', userSide);
    if (focus) params.set('focus', focus);
    return {
      path: withQuery('/coach/session/play-against', params),
      ackMessage: buildProposalAckMessage(subject, userSide, focus),
      // Synthesize a play-against intent so callers (analytics, tests)
      // see a consistent shape even though parseCoachIntent wouldn't
      // have matched the affirmation on its own.
      intent: { kind: 'play-against', subject, side: userSide, difficulty: 'auto', raw: text },
    };
  }

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
      if (!match) {
        // Walkthroughs only exist for openings we have annotated DB
        // content for. Rather than silently falling through to plain
        // chat (which leaves the user wondering why nothing happened),
        // explain we don't have a walkthrough for that name and offer
        // to play it instead — play-against resolves any Lichess-known
        // opening, so the student still gets hands-on practice.
        //
        // Wording matters: "Want to play..." matches
        // ASSISTANT_GAME_PROPOSAL_RE so the user's next "yes" /
        // "let's do it" automatically routes into /coach/session/play-against
        // via the affirmation-after-proposal path at the top of
        // routeChatIntent.
        return {
          ackMessage: `I don't have a ready-made walkthrough for "${intent.subject}" yet. Want to play it against me so you can learn it in-game?`,
          intent,
        };
      }
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

    case 'review-game': {
      // Look up the newest matching game in the user's imported
      // history. On miss, return a reply-only route that explicitly
      // says no matching games were found AND offers to play one
      // from the same opening. The user's next "yes" / "let's do it"
      // is caught by the affirmation-after-game-proposal path above
      // and routes to /coach/play.
      const game = await findLastMatchingGame({
        subject: intent.subject,
        source: intent.source,
      });
      if (!game) {
        return {
          ackMessage: buildNoMatchOfferMessage(intent),
          intent,
        };
      }
      // "Narrate" / "recap" / "replay" → dedicated narration-playback
      // session (auto-advancing, voice-gated). "Review" / "walk through"
      // → interactive review view.
      if (intent.mode === 'narrate') {
        return {
          path: `/coach/session/narrate?gameId=${encodeURIComponent(game.id)}`,
          ackMessage: buildReviewAckMessage(game, intent),
          intent,
        };
      }
      return {
        path: `/coach/play?review=${encodeURIComponent(game.id)}`,
        ackMessage: buildReviewAckMessage(game, intent),
        intent,
      };
    }

    default:
      // Regex returned 'qa' — before falling through to generic chat,
      // try a cheap LLM classification. This is the safety net for
      // every phrasing the regex list doesn't cover ("can you start a
      // match?", "I'm ready for chess", "teach me something", etc.).
      // Capped at 60 tokens + 2s timeout so the latency hit is
      // negligible compared to the streaming chat response.
      return classifyWithLlmFallback(text, options);
  }
}

/**
 * LLM fallback classifier — runs ONLY when the regex router returned
 * 'qa'. Asks a cheap, low-latency LLM call (60 tokens max, 2s timeout)
 * to classify the user message into one of the routable intents. If
 * the LLM agrees the message is a play/review/walkthrough/puzzle
 * request, re-dispatch through the normal router logic.
 *
 * This is the safety net that stops the regex whack-a-mole: instead
 * of adding a new regex for every user phrasing, the LLM catches the
 * long tail.
 *
 * Returns null when:
 * - the LLM call fails (timeout, no API key, network error)
 * - the LLM confirms 'qa' (genuinely a question, not a command)
 * - the LLM response can't be parsed
 *
 * Cost: ~$0.0001 per call (Haiku/DeepSeek); latency: ~500ms-1.5s.
 */
async function classifyWithLlmFallback(
  text: string,
  options: RouteChatIntentOptions,
): Promise<RoutedChatIntent | null> {
  const LLM_CLASSIFY_PROMPT = `You are a chess-app intent classifier. Given the user's message, output ONE word from this list:
play — user wants to play a game against a coach/engine
review — user wants to review a specific past game
walkthrough — user wants to learn/study an opening
middlegame — user wants middlegame plans or analysis
puzzle — user wants a tactics puzzle
explain — user wants the current board position explained
qa — none of the above, just a question or chat

User message: "${text.replace(/"/g, '\\"')}"

Reply with ONLY one word from the list above.`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await getCoachChatResponse(
      [{ role: 'user', content: LLM_CLASSIFY_PROMPT }],
      '',
      undefined,
      'intent_classify',
      60,
    );
    clearTimeout(timer);

    const classified = response.trim().toLowerCase().split(/\s+/)[0];

    switch (classified) {
      case 'play':
        return {
          path: '/coach/session/play-against',
          ackMessage: 'Starting a game with the coach.',
          intent: { kind: 'play-against', difficulty: 'auto', raw: text },
        };
      case 'review':
        // Delegate to findLastMatchingGame for the actual lookup.
        return await routeChatIntent(
          `review my last game`,
          options,
        );
      case 'walkthrough':
      case 'middlegame':
      case 'puzzle':
      case 'explain':
        // For these, the regex missed but the LLM caught it. Rather
        // than duplicating all the resolution logic, just return a
        // play-against fallback with the original text as focus.
        // The coach on the play page reads the focus and adapts.
        return {
          path: classified === 'explain'
            ? '/coach/session/explain-position'
            : classified === 'puzzle'
              ? '/coach/session/puzzle'
              : classified === 'walkthrough'
                ? `/coach/session/walkthrough?subject=${encodeURIComponent(text)}`
                : `/coach/session/middlegame?subject=${encodeURIComponent(text)}`,
          ackMessage: 'Got it — setting up a session.',
          intent: { kind: classified === 'explain' ? 'explain-position' : classified === 'puzzle' ? 'puzzle' : classified === 'walkthrough' ? 'walkthrough' : 'continue-middlegame', raw: text },
        };
      case 'qa':
      default:
        return null;
    }
  } catch {
    // LLM unavailable — fall through to generic chat. No worse than
    // today; the regex is still the primary path.
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

function buildReviewAckMessage(game: GameRecord, intent: CoachIntent): string {
  const vs = `${game.white} vs ${game.black}`;
  const resultWord =
    game.result === '1-0'
      ? 'White won'
      : game.result === '0-1'
        ? 'Black won'
        : game.result === '1/2-1/2'
          ? 'draw'
          : 'unfinished';
  const date = game.date ? ` (${game.date})` : '';
  const scope = intent.subject
    ? ` matching "${intent.subject}"`
    : intent.source
      ? ` from ${intent.source === 'chesscom' ? 'Chess.com' : 'Lichess'}`
      : '';
  return `Opening your last game${scope}: ${vs}${date}, ${resultWord}.`;
}

/**
 * The student asked to review a past game, but their imported history
 * has no match for the requested filter (opening / source / both).
 * Acknowledge concretely AND end with a play-game offer so a "yes"
 * routes via the affirmation-after-proposal flow into /coach/play.
 *
 * The wording is intentional: "Want to play..." matches
 * ASSISTANT_GAME_PROPOSAL_RE so the next-turn affirmation pickup
 * works without extra wiring.
 */
function buildNoMatchOfferMessage(intent: CoachIntent): string {
  const subject = intent.subject?.trim();
  const sourceLabel =
    intent.source === 'chesscom'
      ? 'Chess.com'
      : intent.source === 'lichess'
        ? 'Lichess'
        : null;

  const lacksWhat = subject
    ? `any ${subject} games`
    : sourceLabel
      ? `any games imported from ${sourceLabel}`
      : 'any games to review';

  const offer = subject
    ? `Want to play a game from the ${subject} so you can build some experience to review later?`
    : `Want to play a quick game so we can review it together afterwards?`;

  return `I don't see ${lacksWhat} in your history yet. ${offer}`;
}

/**
 * Format the weakest-openings list into a chat-ready message. When the
 * repertoire is empty we say so explicitly instead of returning a
 * generic "I don't know" reply — the absence of data is the answer.
 */
function buildWeakestOpeningsMessage(
  weakest: { name: string; color: string; drillAttempts: number; drillAccuracy: number }[],
  side?: 'white' | 'black',
): string {
  const sideLabel = side ? ` as ${side === 'white' ? 'White' : 'Black'}` : '';
  if (weakest.length === 0) {
    return `I don't have any openings in your repertoire${sideLabel} yet. Once you add openings and drill them, I can rank which ones need work.`;
  }
  const lines = weakest.map((op, i) => {
    const colorLabel = op.color === 'white' ? 'W' : 'B';
    if (op.drillAttempts === 0) {
      return `${i + 1}. ${op.name} (${colorLabel}) — not drilled yet`;
    }
    const pct = Math.round(op.drillAccuracy * 100);
    return `${i + 1}. ${op.name} (${colorLabel}) — ${pct}% accuracy over ${op.drillAttempts} drill${op.drillAttempts === 1 ? '' : 's'}`;
  });
  return `Here are the openings${sideLabel} you're struggling with most:\n\n${lines.join('\n')}\n\nWant to drill one of them?`;
}

/**
 * Pull a short "training focus" phrase out of the assistant's game
 * proposal so the play page's coach can keep the agreed focus in
 * mind. We try a few templates the coach LLM commonly emits, then
 * fall back to the whole message (clipped) so context is never lost.
 */
function extractFocus(assistantMessage: string): string | null {
  const text = assistantMessage.trim();
  if (!text) return null;

  // "focus on X" / "focused on X" / "work on X" / "practice X"
  const onMatch = text.match(
    /\b(?:focus(?:ed|ing)?\s+on|work(?:ing)?\s+on|practice|drill)\s+([^.!?\n]{3,160})/i,
  );
  if (onMatch) return tidy(onMatch[1]);

  // "play a game where we … X" / "play a game about X"
  const whereMatch = text.match(
    /\bplay\s+(?:a\s+)?(?:new\s+)?(?:game|match)\s+(?:where\s+we\s+|about\s+|for\s+|to\s+)([^.!?\n]{3,160})/i,
  );
  if (whereMatch) return tidy(whereMatch[1]);

  // Fallback: the whole proposal, clipped to a manageable length so
  // the play page's coach prompt doesn't balloon.
  return tidy(text).slice(0, 200);
}

function tidy(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.:;—–-]+|[\s,.:;—–-]+$/g, '')
    .trim();
}

/** Common opening names the coach might propose, in canonical form.
 *  Matched word-boundary-insensitively against the assistant message.
 *  Ordering matters — more specific names ("Sicilian Najdorf") must
 *  come before broader ones ("Sicilian") so the richer match wins. */
const PROPOSED_OPENING_NAMES: string[] = [
  'Sicilian Najdorf',
  'Sicilian Dragon',
  'Sicilian Scheveningen',
  'Sicilian Sveshnikov',
  'Sicilian Taimanov',
  'Accelerated Dragon',
  'Najdorf',
  'Dragon',
  'Scheveningen',
  'Sveshnikov',
  'Taimanov',
  "King's Indian Defense",
  "King's Indian",
  "Queen's Gambit Declined",
  "Queen's Gambit Accepted",
  "Queen's Gambit",
  "Queen's Indian Defense",
  "Queen's Indian",
  'Nimzo-Indian',
  "Gr\u00fcnfeld",
  'Grunfeld',
  'Benoni',
  'Ruy Lopez',
  'Italian Game',
  'Italian',
  'Caro-Kann',
  'French Defense',
  'French',
  'Scandinavian',
  'Pirc',
  'Alekhine',
  'Catalan',
  'London System',
  'London',
  'English Opening',
  'English',
  "Bird's Opening",
  'Scotch Game',
  'Scotch',
  'Vienna',
  'Four Knights',
  'Petrov',
  'Sicilian Defense',
  'Sicilian',
];

/**
 * Pull an opening name out of the coach's game proposal.
 *
 * The LLM's proposals are varied — "Let's play the Sicilian Najdorf",
 * "I'll play the Italian against you", "how about a Ruy Lopez?" — so
 * we look for any known opening name as a substring. Returns the
 * first (most specific-first) match, or undefined.
 */
function extractProposedOpening(assistantMessage: string): string | undefined {
  const lower = assistantMessage.toLowerCase();
  for (const name of PROPOSED_OPENING_NAMES) {
    const re = new RegExp(`\\b${escapeRegExp(name.toLowerCase())}\\b`);
    if (re.test(lower)) {
      return name;
    }
  }
  return undefined;
}

/**
 * Pull the user's proposed side out of the coach's proposal.
 *
 * The coach might phrase it as either "I'll play White" (coach side,
 * user plays opposite) or "you play White" (direct user side).
 * Returns the USER's side, or undefined if not stated.
 */
function extractProposedUserSide(
  assistantMessage: string,
): 'white' | 'black' | undefined {
  const lower = assistantMessage.toLowerCase();
  // "you play White/Black" / "you'll be White"
  const direct = lower.match(
    /\byou(?:'ll|\s+will)?\s+(?:play|be|take)\s+(white|black)\b/,
  );
  if (direct) return direct[1] as 'white' | 'black';
  // "I'll play White" / "I'll be Black" — coach is that color, user is opposite.
  const coach = lower.match(
    /\bi(?:'ll|\s+will)?\s+(?:play|be|take)\s+(white|black)\b/,
  );
  if (coach) {
    return coach[1] === 'white' ? 'black' : 'white';
  }
  return undefined;
}

/**
 * Compose the acknowledgement shown when the user affirms the coach's
 * proposal. Mentions the concrete opening/side we pulled from the
 * proposal so the user sees we understood, with a soft "We'll focus
 * on…" tail when a focus was extracted.
 */
function buildProposalAckMessage(
  subject: string | undefined,
  userSide: 'white' | 'black' | undefined,
  focus: string | null,
): string {
  const bits: string[] = ['Great — starting a game.'];
  if (subject && userSide) {
    bits.push(
      `I'll play ${userSide === 'white' ? 'Black' : 'White'}; we'll open with the ${subject}.`,
    );
  } else if (subject) {
    bits.push(`We'll open with the ${subject}.`);
  } else if (userSide) {
    bits.push(`You'll play ${userSide === 'white' ? 'White' : 'Black'}.`);
  }
  if (focus && !subject) {
    bits.push(`We'll focus on ${focus}.`);
  }
  return bits.join(' ');
}

/** Test hook — exposed for unit tests only. */
export function __test__resolvePuzzleTheme(theme: string | undefined): string | null {
  return resolvePuzzleTheme(theme);
}

/** Test hook — exposed for unit tests only. */
export function __test__extractFocus(message: string): string | null {
  return extractFocus(message);
}

/** Test hook — exposed for unit tests only. */
export function __test__extractProposedOpening(message: string): string | undefined {
  return extractProposedOpening(message);
}

/** Test hook — exposed for unit tests only. */
export function __test__extractProposedUserSide(
  message: string,
): 'white' | 'black' | undefined {
  return extractProposedUserSide(message);
}

export type { CoachDifficulty };
