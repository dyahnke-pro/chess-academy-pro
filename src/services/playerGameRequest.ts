/**
 * playerGameRequest — deterministic detection of "show me a game that
 * <player> played in <opening>" asks on the coach surfaces.
 *
 * Why this exists (David 2026-06-11): typing "show me a game that magnus
 * played the catalan opening" into /coach/teach got hijacked by the
 * opening-name router — the "show me X" verb captured the WHOLE clause as
 * an opening NAME, fuzzy-matched it, and surfaced a "Did you mean Catalan
 * Opening?" picker. The request never reached the player-game lookup, so
 * the coach never showed the game (it has 5 Carlsen Catalan wins on disk).
 *
 * This parser recognizes the intent up front so the surface can route it
 * to the grounded player-game lookup DETERMINISTICALLY — code decides,
 * the LLM never sees this routing choice and never has to decide to call
 * a tool (G0: "THE LLM DECIDES NOTHING — it voices facts computed in
 * code"). Pure + dependency-free so it's trivially unit-testable.
 */

export interface PlayerGameRequest {
  /** The player span as the user named them, cleaned of leading filler
   *  ("that magnus" → "magnus"). Passed straight to the lookup, which
   *  owns its own name→id / name→Lichess-handle alias resolution. */
  player: string;
  /** The opening span as the user named it ("the catalan opening" →
   *  "catalan opening"). The lookup normalizes + stems this itself, so
   *  we keep type words ("defense", "gambit") that are part of real
   *  names and only strip a trailing bare "opening". */
  openingQuery: string;
}

/** Tokens that are NOT a player — guards against "how does WHITE play the
 *  Catalan" / "how do I play it" matching as a player-game request. */
const PLAYER_STOPWORDS = new Set<string>([
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'one', 'someone', 'somebody',
  'anyone', 'everyone', 'people', 'player', 'players', 'white', 'black',
  'myself', 'yourself', 'this', 'that', 'these', 'those', 'beginner',
  'beginners', 'gm', 'gms', 'engine', 'computer', 'bot', 'coach', 'pro',
  // Game-framing words — "show me a game in the Catalan" must not read
  // "game" as the player.
  'game', 'games', 'match', 'matches', 'lesson', 'line', 'lines',
  'position', 'move', 'moves', 'opening', 'someone',
]);

/** Leading filler stripped off a captured player span. The lazy patterns
 *  can pull "that magnus" / "where carlsen" — drop the relative/article
 *  lead so only the name remains. */
const PLAYER_LEAD_FILLER = /^(?:that|which|who|where|by|of|the|a|an)\s+/i;

/** Leading filler stripped off a captured opening span. "against the
 *  catalan" / "with the catalan" / "the catalan" → "catalan". */
const OPENING_LEAD_FILLER = /^(?:against|versus|vs\.?|in|with|using|on|the|a|an)\s+/i;

/** Ordered, PRECISE patterns. Each requires strong player-game framing —
 *  "how does X play Y", or the word "game" + "X played Y", or a possessive
 *  "X's Y game" — so plain opening asks ("show me the Catalan", "teach me
 *  the Vienna") never match. capture[1] = player, capture[2] = opening. */
const PATTERNS: ReadonlyArray<RegExp> = [
  // "how does magnus play (against) the catalan"
  /\bhow\s+(?:does|do|did|would|should|'s)\s+(.+?)\s+(?:play|approach|handle|tackle|meet|use|do\s+with)\s+(.+?)\s*[?.!]*$/i,
  // "show me a game (that) magnus played (in/with) the catalan"
  /\b(?:show|see|pull\s*up|find|get|give|got|have)\b.*?\b(?:game|games|match|matches)\b.*?\b(.+?)\s+(?:played|plays|playing|won\s+with|win\s+with|used|wielded)\s+(.+?)\s*[?.!]*$/i,
  // "a game (that) magnus played the catalan"
  /\b(?:a|an|any|some|another|one)?\s*(?:game|games|match|matches)\s+(?:that\s+|where\s+|which\s+|of\s+|by\s+|with\s+)?(.+?)\s+(?:played|plays|won\s+with)\s+(.+?)\s*[?.!]*$/i,
  // "magnus's catalan game(s)" / "carlsen's catalan match"
  /^(.+?)'s\s+(.+?)\s+(?:game|games|match|matches)\s*[?.!]*$/i,
  // "show me magnus in/with the catalan"
  /\b(?:show|see|pull\s*up)\s+(?:me\s+)?(.+?)\s+(?:in|with|playing)\s+(?:the\s+|a\s+|an\s+)?(.+?)\s*[?.!]*$/i,
];

function cleanPlayer(raw: string): string {
  let p = raw.trim();
  // Strip repeated leading filler ("that magnus" → "magnus").
  let prev: string;
  do {
    prev = p;
    p = p.replace(PLAYER_LEAD_FILLER, '').trim();
  } while (p !== prev);
  // Drop a trailing possessive that a pattern may have left behind.
  p = p.replace(/'s$/i, '').trim();
  return p;
}

function cleanOpening(raw: string): string {
  let o = raw.trim().replace(/[?.!,]+$/g, '').trim();
  let prev: string;
  do {
    prev = o;
    o = o.replace(OPENING_LEAD_FILLER, '').trim();
  } while (o !== prev);
  // Strip ONLY a trailing bare "opening" — never "defense"/"gambit"/etc.,
  // those are part of real names ("French Defense", "King's Gambit"). The
  // lookup stems the rest itself.
  o = o.replace(/\s+opening$/i, '').trim();
  return o;
}

function isPlausiblePlayer(player: string): boolean {
  if (!player) return false;
  const words = player.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (player.length > 30) return false;
  // Reject when EVERY word is a stopword (e.g. "white", "i", "the engine").
  const allStop = words.every((w) => PLAYER_STOPWORDS.has(w.toLowerCase()));
  if (allStop) return false;
  return true;
}

/**
 * Parse a chat message into a player-game request, or null if it isn't one.
 *
 * Precision over recall: returns null unless the message clearly names a
 * player AND frames a game/play request AND leaves a non-empty opening
 * span. The caller still validates the opening resolves before acting, so
 * a stray match can't surface garbage.
 */
export function parsePlayerGameRequest(text: string): PlayerGameRequest | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 140) return null;
  // A move report ("I played e4.") is never a player-game request.
  if (/^\s*i\s+(?:just\s+)?played\b/i.test(trimmed)) return null;

  for (const re of PATTERNS) {
    const m = trimmed.match(re);
    if (!m) continue;
    const player = cleanPlayer(m[1]);
    const openingQuery = cleanOpening(m[2]);
    if (!isPlausiblePlayer(player)) continue;
    if (!openingQuery || openingQuery.length > 40) continue;
    return { player, openingQuery };
  }
  return null;
}
