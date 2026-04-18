/**
 * inGameChatIntent
 * ----------------
 * Detects chat messages that should mutate the live game (restart,
 * play a specific opening) so we can short-circuit the LLM round-trip
 * and actually touch the board.
 *
 * This is narrower than `coachIntentRouter`, which only runs when the
 * game is over (it navigates to new session routes). During an active
 * game we only care about two actions: restart in place, and load an
 * opening book line for the coach to play.
 */
import { parseCoachIntent } from './coachAgent';
import { getOpeningMoves } from './openingDetectionService';

export type InGameChatIntent =
  | { kind: 'restart' }
  | { kind: 'play-opening'; openingName: string }
  | { kind: 'narrate' }
  | { kind: 'mute' };

/** Chess opening abbreviations people actually type. Expanded to a
 *  canonical name that `getOpeningMoves` can resolve against the
 *  openings trie. Names use ASCII apostrophes to match the source
 *  data (`openings-lichess.json`). */
const OPENING_ALIASES: Record<string, string> = {
  kid: "King's Indian Defense",
  kia: "King's Indian Attack",
  qgd: "Queen's Gambit Declined",
  qga: "Queen's Gambit Accepted",
  qg: "Queen's Gambit",
  qid: "Queen's Indian Defense",
  'ruy lopez': 'Ruy Lopez',
  najdorf: 'Sicilian Defense: Najdorf Variation',
  grunfeld: "Gr\u00fcnfeld Defense",
  'gr\u00fcnfeld': "Gr\u00fcnfeld Defense",
  benoni: 'Benoni Defense',
  nimzo: 'Nimzo-Indian Defense',
  caro: 'Caro-Kann Defense',
  'caro-kann': 'Caro-Kann Defense',
  french: 'French Defense',
  sicilian: 'Sicilian Defense',
  london: 'London System',
  scandi: 'Scandinavian Defense',
  scandinavian: 'Scandinavian Defense',
  pirc: 'Pirc Defense',
  alekhine: 'Alekhine Defense',
  "king's indian": "King's Indian Defense",
  "kings indian": "King's Indian Defense",
};

function expandAlias(subject: string): string {
  const key = subject
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z'\u00fc\u00e4\u00f6\s-]/g, '')
    .replace(/\s+/g, ' ');
  return OPENING_ALIASES[key] ?? subject;
}

const RESTART_RE =
  /\b(?:restart|reset|new\s+game|start\s+over|start\s+(?:a\s+)?new|fresh\s+(?:game|start|board)|from\s+the\s+start|back\s+to\s+(?:the\s+)?start(?:ing\s+position)?|take\s+back\s+to\s+(?:the\s+)?start(?:ing\s+position)?)\b/i;

/** Voice narration toggle — "narrate for me", "read it out loud",
 *  "speak to me", "turn on voice", "use text to speech", etc. The LLM
 *  has no tool to flip the voice toggle on its own, so without this
 *  intent it just claims narration is "enabled" in text and the user
 *  hears nothing. */
const NARRATE_RE =
  /\b(?:narrate|read\s+(?:it\s+)?(?:out\s+)?(?:aloud|out\s+loud)|speak\s+(?:to\s+me|aloud|out\s+loud)|talk\s+(?:to\s+me|through)|say\s+it\s+out\s+loud|out\s+loud|voice\s+(?:on|narration)|turn\s+on\s+(?:the\s+)?voice|enable\s+(?:voice|tts|text[- ]to[- ]speech|narration)|use\s+(?:voice|tts|text[- ]to[- ]speech)|text[- ]to[- ]speech)\b/i;

const MUTE_RE =
  /\b(?:mute|be\s+quiet|stop\s+talking|shut\s+up|silence|silent|turn\s+off\s+(?:the\s+)?voice|voice\s+off|disable\s+(?:voice|tts|narration|text[- ]to[- ]speech))\b/i;

/** Fallback "play <opening>" matcher for phrasings parseCoachIntent
 *  doesn't cover — e.g. "play the KID", "play a Sicilian", "let's try
 *  the London". parseCoachIntent requires "against me" / "game" /
 *  "match" / an explicit "let's play" lead-in, which misses bare
 *  openings. */
const PLAY_OPENING_RE =
  /^\s*(?:let'?s\s+)?(?:play|try|do|use|go\s+with|switch\s+to)\s+(?:the\s+|a\s+|an\s+)?([a-z][a-z\s'\u2019\u00fc\u00e4\u00f6-]{1,40}?)(?:\s+(?:against\s+me|now|please))?\s*[.!?]*\s*$/i;

/**
 * Given a user chat message during an active game, return an in-game
 * intent if one matches, or null to fall through to the normal LLM
 * chat flow.
 */
export function detectInGameChatIntent(text: string): InGameChatIntent | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Mute checked BEFORE narrate — "turn off voice" contains "voice"
  // which would otherwise false-positive into the narrate branch.
  if (MUTE_RE.test(trimmed)) {
    return { kind: 'mute' };
  }

  if (NARRATE_RE.test(trimmed)) {
    return { kind: 'narrate' };
  }

  if (RESTART_RE.test(trimmed)) {
    return { kind: 'restart' };
  }

  // Opening-play requests — "play the KID against me", "let's play the
  // French", "play the Sicilian". Reuse parseCoachIntent so we pick up
  // the same phrasings the voice mic and SmartSearchBar already cover,
  // then validate that the subject actually resolves to a book line.
  const intent = parseCoachIntent(trimmed);
  if (
    (intent.kind === 'play-against' || intent.kind === 'walkthrough') &&
    intent.subject
  ) {
    const expanded = expandAlias(intent.subject);
    const moves = getOpeningMoves(expanded);
    if (moves && moves.length > 0) {
      return { kind: 'play-opening', openingName: expanded };
    }
  }

  // Fallback for bare "play <opening>" phrasings parseCoachIntent
  // doesn't catch.
  const bare = PLAY_OPENING_RE.exec(trimmed);
  if (bare) {
    const expanded = expandAlias(bare[1]);
    const moves = getOpeningMoves(expanded);
    if (moves && moves.length > 0) {
      return { kind: 'play-opening', openingName: expanded };
    }
  }

  return null;
}
