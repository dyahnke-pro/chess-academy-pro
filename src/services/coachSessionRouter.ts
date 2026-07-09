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
import { Chess } from 'chess.js';
import { parseCoachIntent } from './coachAgent';
import type { CoachIntent, CoachDifficulty } from './coachAgent';
import { matchTrainingAidRoute } from './trainingAidRouter';
import type { GameRecord } from '../types';
import { matchOpeningForSubject } from './walkthroughResolver';
import {
  findPlanForOpening,
  findPlanBySubject,
} from './middlegamePlanner';
import { TACTICAL_THEMES } from './puzzleService';
import { findLastMatchingGame } from './gameContextService';
import { getWeakestOpenings } from './openingService';
import { applyCoachSetting } from './coachSettingsAction';
import { matchNavigationRoute } from './navigationRouter';

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
  // Settings-as-actions — "turn on voice", "set narration to brief", "enable
  // hints", "disable the premium voice". The coach mutates a SAFE whitelisted
  // preference in code and confirms. Runs FIRST so a settings command never
  // falls through to a lookup/chat. Reply-only (no navigation). A non-settings
  // message resolves to null and is a no-op here.
  const settingResult = await applyCoachSetting(text);
  if (settingResult) {
    return {
      ackMessage: settingResult.confirmation,
      intent: { kind: 'qa', raw: text },
    };
  }

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

  // Training-aid drills — calculation, mating patterns, endgame,
  // tactics/puzzles, weaknesses, etc. Deterministic route to the real
  // code-driven surface (G0: the LLM invents no drills). Runs before
  // parseCoachIntent so "drill tactics" / "practice mating patterns" /
  // "work on my calculation" route instead of falling to the brain.
  // A themed puzzle ("give me a fork puzzle") lands on the same
  // /coach/session/puzzle route the puzzle intent uses below.
  const aid = matchTrainingAidRoute(text);
  if (aid) {
    return {
      path: aid.path,
      ackMessage: aid.ack,
      intent: { kind: 'qa', raw: text },
    };
  }

  // Generic navigation — "take me to Tactics", "open Settings", "go to my
  // weaknesses". Resolved deterministically to a real route (unified action
  // layer, David: "allow actions like open this tab / take me to X"). Runs
  // AFTER training-aids so "show me a fork puzzle" stays a drill, not a nav.
  const nav = matchNavigationRoute(text);
  if (nav) {
    return {
      path: nav.path,
      ackMessage: nav.ack,
      intent: { kind: 'qa', raw: text },
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
      // Only route to the explain-position session when there's an actual
      // board FEN to explain. On a board-less surface (e.g. /coach/chat)
      // there is no `currentFen`, so navigating would land the user on the
      // session page showing the STARTING position — which is never what
      // they asked about. Audit 2026-06-02: "evaluate this position
      // <prose piece list>" misrouted to /coach/session/explain-position
      // with the start board. Fall through to plain chat so the brain
      // answers in-place (and can ask for a FEN / offer to set the board).
      if (!options.currentFen) return null;
      const params = new URLSearchParams();
      params.set('fen', options.currentFen);
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
        // Don't imply the name IS a real opening (audit 2026-06-02: a
        // FAKE opening like "Fischer-Spassky Quantum Attack" got
        // "...yet. Want to play it?", which reads as if it exists). Keep
        // the "Want to play..." hook (ASSISTANT_GAME_PROPOSAL_RE routes
        // the next "yes" into play-against) but qualify it.
        return {
          ackMessage: `I don't have a guided walkthrough for "${intent.subject}", and I'm not sure it's a standard opening I recognize. If it is a real line, want to play it against me so you can learn it in-game?`,
          intent,
        };
      }
      // Route STRAIGHT to the main Learn-with-Coach surface (in-place
      // walkthrough). The legacy /coach/session/walkthrough page no longer
      // exists; /coach/teach reads ?opening= and auto-kicks the walkthrough
      // with its own DB-narration pipeline + chat + voice + picker chips.
      const params = new URLSearchParams();
      params.set('opening', intent.subject);
      return {
        path: withQuery('/coach/teach', params),
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
      // Regex returned 'qa'. parseCoachIntent (deterministic) is now the
      // ONLY router path — the LLM intent-classify fallback was DELETED
      // (grounding inversion STEP D: the LLM decides nothing, not even
      // routing; deleting it also saved a 60-token classify call on every
      // qa turn). A phrasing the regex doesn't catch is handled as normal
      // chat; when a real miss surfaces, extend parseCoachIntent's
      // deterministic patterns — never re-add an LLM guess.
      return null;
  }
}

// The LLM intent-classify fallback (`classifyWithLlmFallback`) was DELETED in
// the grounding inversion (STEP D, 2026-06-10). The LLM decides nothing —
// including routing. `parseCoachIntent`'s deterministic regexes are the only
// path; a phrasing they don't catch is handled as normal chat. This also
// removed a 60-token `intent_classify` LLM call on every qa turn. To catch a
// new routable phrasing, extend `parseCoachIntent` — never re-add an LLM guess.

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

// ═══════════════════════════════════════════════════════════════════════
// BOARD-COMMAND MATCHER (relocated from the former coachIntentRouter.ts,
// 2026-07-09). Deterministic "fine motor control" — a high-confidence board
// command (play X / take back / reset / capture on Y) is matched here BEFORE
// the LLM, so it dispatches a tool instead of the brain freelancing chat
// ABOUT the action (April 26 audit: brain emitted stockfish_eval instead of
// play_move). Kept in the SAME module as routeChatIntent (one router home;
// coachIntentRouter deleted, remove-old-wiring rule). VoiceChatMic +
// GameChatPanel run this as their own instrumented pre-pass; the pipelines
// (move-count verification + staged audits) stay surface-side.
// ═══════════════════════════════════════════════════════════════════════
export type RoutedIntent =
  | { kind: 'play_move'; san: string }
  | { kind: 'take_back_move'; count: number }
  | { kind: 'reset_board' }
  | { kind: 'set_board_position'; fen: string }
  | { kind: 'navigate_to_route'; route: string };

export interface IntentRouterContext {
  /** Current FEN of the live board, used for SAN validation when
   *  matching `play_move`. When omitted, the router still matches but
   *  defers legality validation to the surface callback. */
  currentFen?: string;
  /** Whose move was the most recent half-ply. Used by `take_back_move`
   *  to map "take back my move" / "take back your move" onto a
   *  ply-count: when the user asks to undo their own move and the
   *  most-recent move was the coach's, we have to walk back 2 plies
   *  (their move + the user's prior move) to land on the user's
   *  previous turn. Symmetrical for "your move". When omitted (no
   *  game context, e.g. chat-only surfaces), the target distinction
   *  collapses back to the legacy 1-ply default. */
  lastMoveBy?: 'user' | 'coach';
}

/**
 * Try to match the user's text against a known command pattern.
 * Returns a `RoutedIntent` if matched, `null` if no pattern matched.
 * The caller (coachService.ask) dispatches the matched tool directly
 * via ToolExecutionContext callbacks.
 */
export function tryRouteIntent(
  text: string,
  ctx: IntentRouterContext = {},
): RoutedIntent | null {
  const intent = computeRoutedIntent(text, ctx);
  // Single diagnostic line per call — input + ctx + resolved intent.
  // Audit cycle 8 follow-up: the prior version emitted only `text=...`
  // before routing ran, so a "did the router pick count=2 because of
  // `lastMoveBy=coach` or because of the literal word `both`?" question
  // had to be answered by joining downstream audits. Now one entry
  // tells you exactly what came in and what came out.
  void import('./appAuditor').then(({ logAppAudit }) => {
    void logAppAudit({
      kind: 'coach-intent-router-input',
      category: 'subsystem',
      source: 'coachIntentRouter.tryRouteIntent',
      summary: `text="${text.slice(0, 60)}" lastMoveBy=${ctx.lastMoveBy ?? 'unknown'} → ${formatIntentSummary(intent)}`,
      details: JSON.stringify({
        text,
        lastMoveBy: ctx.lastMoveBy ?? null,
        currentFen: ctx.currentFen ?? null,
        intent,
      }),
    });
  });
  return intent;
}

/** Short rendering of a `RoutedIntent` (or null) for the audit summary
 *  line. Kept inline so the audit log reads as one self-contained
 *  string rather than requiring a second hop into `details`. */
function formatIntentSummary(intent: RoutedIntent | null): string {
  if (!intent) return 'matched=none';
  switch (intent.kind) {
    case 'play_move':
      return `matched=play_move san=${intent.san}`;
    case 'take_back_move':
      return `matched=take_back_move count=${intent.count}`;
    case 'reset_board':
      return 'matched=reset_board';
    case 'set_board_position':
      return `matched=set_board_position fen=${intent.fen.slice(0, 40)}`;
    case 'navigate_to_route':
      return `matched=navigate_to_route route=${intent.route}`;
  }
}

/** The actual matching logic — extracted so `tryRouteIntent` can
 *  audit a single line with both the input and the resolved intent. */
function computeRoutedIntent(
  text: string,
  ctx: IntentRouterContext,
): RoutedIntent | null {
  const lowered = text.trim().toLowerCase();
  if (!lowered) return null;

  // ─── take_back_move ─────────────────────────────────────────────
  // Checked BEFORE play_move so "take it back" / "take that move back"
  // doesn't get caught by the new "take" capture verb in matchPlayMove.
  // Window widened to 15 chars so phrasings like "take both back" /
  // "take that move back" / "take the move back" all match.
  if (
    /\b(take.{0,15}back|undo|let me try (that |this )?again|go back|rewind)\b/i.test(text)
  ) {
    // "two" / "both" / "2" / "two moves" / "both moves" / "whole exchange" → count=2
    const twoBack = /\b(both|two|2|two\s+moves|both\s+moves|whole\s+exchange)\b/i.test(text);
    if (twoBack) return { kind: 'take_back_move', count: 2 };

    // Target detection: "your move" / "the coach('s) move" / "opponent's
    // move" → undo the coach's last move; "my move" / "the user('s)
    // move" / "the move I made" → undo the student's last move. When
    // we know `lastMoveBy`, we can produce the precise count to land
    // on the requested player's prior turn:
    //
    //   target = mine,     lastMoveBy = user  → 1 (most recent IS mine)
    //   target = mine,     lastMoveBy = coach → 2 (skip coach + user)
    //   target = opponent, lastMoveBy = coach → 1 (most recent IS theirs)
    //   target = opponent, lastMoveBy = user  → 2 (skip user + coach)
    //
    // Without `lastMoveBy` we fall back to the legacy 1-ply behavior
    // — the surface still gets the takeback, just on the most-recent
    // half-move regardless of side.
    const targetMine = /\b(my (last\s+)?move|the move (i|i'?ve|i\s+just)\s+\w+|user'?s?\s+move)\b/i.test(text);
    const targetOpponent = /\b(your (last\s+)?move|the (coach|opponent)'?s?\s+move|opponent'?s?\s+move|coach'?s?\s+move)\b/i.test(text);
    if (targetMine && ctx.lastMoveBy === 'coach') return { kind: 'take_back_move', count: 2 };
    if (targetOpponent && ctx.lastMoveBy === 'user') return { kind: 'take_back_move', count: 2 };
    return { kind: 'take_back_move', count: 1 };
  }

  // ─── play_move ──────────────────────────────────────────────────
  // "play e4", "play knight to f3", "move bishop c4", "i'll play Nf6",
  // "make the move Nc3", "push pawn to e4", "take the knight on e5",
  // "capture on f3", "grab the bishop", etc.
  const playMoveSan = matchPlayMove(text, ctx.currentFen);
  if (playMoveSan) {
    return { kind: 'play_move', san: playMoveSan };
  }

  // ─── reset_board ────────────────────────────────────────────────
  // Note: GameChatPanel.tsx already runs `detectInGameChatIntent`
  // BEFORE coachService.ask — its `RESTART_RE` matches a superset of
  // these phrases and short-circuits via `onRestartGame()` before the
  // spine ever sees the text. This match is a backstop for chat
  // surfaces that don't run the in-game intercept first.
  if (
    /\b(reset|start over|new (game|board)|fresh (board|start)|from the beginning|wipe (the )?board)\b/i.test(text)
  ) {
    return { kind: 'reset_board' };
  }

  // ─── training-aid drills (navigate_to_route) ────────────────────
  // "drill calculation", "give me a fork puzzle", "practice mating
  // patterns", "endgame drill", "work on my weaknesses". A HARD
  // requirement of G0 (the LLM decides no chess content): before this
  // route existed, a training-drill request fell through to the brain,
  // which INVENTED fake drills (David's report: "drill calculation" →
  // the LLM declared "the purest calculation drill is finding the best
  // first move from the starting position" — chess nonsense). Route to
  // the REAL, code-driven training surface instead (puzzles from the
  // Lichess DB, mating-pattern lessons, endgame drills, the weakness
  // analyzer). Shared matcher so every chat surface behaves the same;
  // see `trainingAidRouter.ts`. Opening drills ("drill the Vienna") and
  // bare questions ("how do I calculate?") do NOT match here.
  const aid = matchTrainingAidRoute(text);
  if (aid) {
    return { kind: 'navigate_to_route', route: aid.path };
  }

  // No deterministic match — fall through to LLM.
  return null;
}

/**
 * Match a `play_move` command. Looks for explicit "play X" / "make X"
 * / "move X" / "push X" framing followed by something that resembles
 * a chess move. Validates the candidate SAN against the current FEN
 * if provided — if the move is illegal from this position, returns
 * null (let the LLM handle it; might be a question about the move,
 * not a command).
 *
 * Also handles natural-language piece names: "play knight to f3",
 * "move the bishop to c4", "play pawn to e4" → translates to SAN.
 */
function matchPlayMove(text: string, currentFen?: string): string | null {
  // `take|capture|grab` are capture-intent verbs — when they fire, we
  // try the SAN with an `x` (capture form) before the move form, so
  // "take the knight on f3" → Nxf3 rather than Nf3 (which chess.js
  // rejects when the destination is occupied).
  const VERB_RE = /\b(play|move|make|do|push|take|capture|grab)\b/i;
  if (!VERB_RE.test(text)) return null;

  const verbMatch = text.match(VERB_RE);
  const verb = verbMatch ? verbMatch[1].toLowerCase() : '';
  const isCaptureVerb = verb === 'take' || verb === 'capture' || verb === 'grab';

  // Strip everything up to and including the verb (and an optional "the").
  const afterVerb = text
    .replace(/^.*?\b(play|move|make|do|push|take|capture|grab)\b\s+/i, '')
    .trim();
  if (!afterVerb) return null;

  const cleanedAfterVerb = afterVerb.replace(/^(the|my|an)\s+|^a\s+(?=[a-z])/i, '');

  // Pattern 1: bare SAN. "play Nf3", "play e4", "play O-O", "play exd5".
  const SAN_RE = /^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQ])?[+#]?|O-O(?:-O)?)\b/;
  const sanMatch = cleanedAfterVerb.match(SAN_RE);
  if (sanMatch) {
    const candidate = sanMatch[1];
    if (validateSan(candidate, currentFen)) return candidate;
  }

  // Pattern 2: natural language. "knight to f3", "the bishop to c4",
  // "pawn to e4", "queen on h5". Capture verbs accept "knight on f3"
  // / "bishop f3" / "knight at f3" too — they imply the destination
  // even without "to".
  const NL_PIECE_RE = isCaptureVerb
    ? /^(?:(?:my|the)\s+)?(knight|bishop|rook|queen|king|pawn)\s+(?:(?:to|on|at)\s+)?([a-h][1-8])\b/i
    : /^(?:(?:my|the)\s+)?(knight|bishop|rook|queen|king|pawn)\s+(?:to|on)\s+([a-h][1-8])\b/i;
  const nlMatch = cleanedAfterVerb.match(NL_PIECE_RE);
  if (nlMatch) {
    const piece = nlMatch[1].toLowerCase();
    const square = nlMatch[2].toLowerCase();
    const pieceLetter: Record<string, string> = {
      knight: 'N',
      bishop: 'B',
      rook: 'R',
      queen: 'Q',
      king: 'K',
      pawn: '',
    };
    const letter = pieceLetter[piece] ?? '';
    if (isCaptureVerb) {
      // Try capture form first (Nxf3, exd5), then non-capture as a
      // fallback in case the move actually isn't a capture but the
      // user phrased it that way.
      const captureSan = letter ? `${letter}x${square}` : `x${square}`;
      if (validateSan(captureSan, currentFen)) return captureSan;
      const moveSan = `${letter}${square}`;
      if (validateSan(moveSan, currentFen)) return moveSan;
    } else {
      const candidate = `${letter}${square}`;
      if (validateSan(candidate, currentFen)) return candidate;
    }
  }

  // Pattern 3 (capture-only): bare destination square. "take on f3",
  // "capture e5", "grab f7". Tries every legal capture into that
  // square from the current FEN — if exactly one legal move lands
  // there, route it; otherwise let the LLM disambiguate.
  if (isCaptureVerb) {
    // Strip a leading preposition first so "on e5" / "at e5" both
    // reduce to "e5" before the square match.
    const stripped = cleanedAfterVerb.replace(/^(on|at|to)\s+/i, '');
    const BARE_SQ_RE = /^([a-h][1-8])\b/i;
    const sqMatch = stripped.match(BARE_SQ_RE);
    if (sqMatch && currentFen) {
      const target = sqMatch[1].toLowerCase();
      const legal = listLegalMovesTo(target, currentFen);
      if (legal.length === 1) return legal[0];
    }
  }

  return null;
}

/** Enumerate every legal CAPTURE SAN that lands on `target` from the
 *  given FEN. Used by the bare-square capture path ("take on e5") to
 *  pick a unique move when the user doesn't name the piece. We filter
 *  to captures only — "take on e4" from the starting position should
 *  NOT route to the e4 pawn push, since the user clearly meant to
 *  capture something. */
function listLegalMovesTo(target: string, fen: string): string[] {
  try {
    const chess = new Chess(fen);
    return chess
      .moves({ verbose: true })
      .filter((m) => m.to === target && (m.captured !== undefined || m.isEnPassant()))
      .map((m) => m.san);
  } catch {
    return [];
  }
}

/**
 * Validate that a SAN move is legal from the given FEN. If no FEN is
 * provided, return true (the surface will validate at dispatch time).
 */
function validateSan(san: string, fen?: string): boolean {
  if (!fen) return true;
  try {
    const chess = new Chess(fen);
    chess.move(san);
    return true;
  } catch {
    return false;
  }
}
