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
import { Chess } from 'chess.js';
import { parseCoachIntent } from './coachAgent';
import { getOpeningMoves } from './openingDetectionService';

export type InGameChatIntent =
  | { kind: 'restart' }
  | { kind: 'play-opening'; openingName: string }
  | { kind: 'set-board'; fen: string }
  | { kind: 'narrate' }
  | { kind: 'mute' };

/** Match a FEN-shaped token: 8 ranks of piece-placement separated by
 *  "/", optionally followed by the turn / castling / en-passant /
 *  clock fields. "set the board to <FEN>" used to depend on the LLM
 *  emitting the set_board_position tool — which it skipped intermittently,
 *  leaving the board at the starting position (response-loop audit
 *  2026-06-05, set_board tool-flake). Detecting + chess.js-validating the
 *  FEN here makes board-setting deterministic, the same way restart /
 *  play-opening short-circuit the LLM. */
const FEN_RE =
  /([pnbrqkPNBRQK1-8]+(?:\/[pnbrqkPNBRQK1-8]+){7})(?:\s+([wb])\s+(-|[KQkq]+)\s+(-|[a-h][36])(?:\s+(\d+)\s+(\d+))?)?/;

/** Extract + validate a FEN from a chat message, returning the
 *  normalized full FEN (placement-only inputs get the default side /
 *  castling / clock fields) or null if no legal position is present. */
export function detectFenInText(text: string): string | null {
  const m = FEN_RE.exec(text);
  if (!m) return null;
  const placement = m[1];
  // Reject a bare "8/8" style fragment that is really prose (needs all
  // 8 ranks AND at least one king to be a plausible position).
  if (!/k/i.test(placement)) return null;
  const turn = m[2] ?? 'w';
  const castling = m[3] ?? '-';
  const ep = m[4] ?? '-';
  const halfmove = m[5] ?? '0';
  const fullmove = m[6] ?? '1';
  const full = `${placement} ${turn} ${castling} ${ep} ${halfmove} ${fullmove}`;
  try {
    new Chess(full);
    return full;
  } catch {
    return null;
  }
}

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

  // Deterministic board-set: a chat message carrying a legal FEN sets the
  // board directly instead of relying on the LLM to emit set_board_position
  // (which it skipped intermittently — board stayed at the start). Checked
  // before the opening-play matchers because a FEN is unambiguous.
  const fen = detectFenInText(trimmed);
  if (fen) {
    return { kind: 'set-board', fen };
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
