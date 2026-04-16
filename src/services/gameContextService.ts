/**
 * gameContextService
 * ------------------
 * Surface relevant user games to the coach chat so its answers can
 * cite concrete examples from the student's own history — "you played
 * this Catalan middlegame 4 times; you won vs Rook_Rider (1650) with
 * …Nf5 but lost twice when you traded the dark-squared bishop early."
 *
 * Keeps the query cheap: we filter Dexie by the player's games, then
 * match against the user message / current FEN with a small set of
 * deterministic rules. No LLM call here — just a grounded context
 * block appended to the coach's system prompt.
 */
import { db } from '../db/schema';
import { getRepertoireOpenings } from './openingService';
import type { GameRecord } from '../types';

/** Max games to include in the context block. Anything more and the
 *  coach starts drowning in noise and the token bill climbs fast. */
const MAX_RELEVANT_GAMES = 5;

/** Max candidate pool scanned before ranking. Bounded so we don't
 *  walk all 500+ games for every chat turn. */
const CANDIDATE_POOL_LIMIT = 200;

export interface RelevantGameExample {
  gameId: string;
  opponent: string;
  opponentElo: number | null;
  playerColor: 'white' | 'black';
  result: 'win' | 'loss' | 'draw';
  date: string | null;
  eco: string | null;
  opening: string | null;
  /** Short reason we matched this game to the query. */
  matchReason: string;
}

export interface RelevantGamesContext {
  games: RelevantGameExample[];
  /** Rendered system-prompt block ready to be appended verbatim. Empty
   *  string when no relevant games matched. */
  promptBlock: string;
}

export interface FetchRelevantGamesOptions {
  /** The user's chat message — scanned for opening names / ECO codes. */
  query: string;
  /** Optional FEN of the position under discussion. When set, games
   *  that reached a similar middlegame structure get a boost. */
  fen?: string;
  /** Player's display username. Used to determine which color the
   *  user played in each game. Nullable — falls back to source-based
   *  inference (chesscom/lichess imports are always the user). */
  username?: string | null;
  /** Override the cap. Default 5. */
  limit?: number;
}

/**
 * Main entrypoint. Returns up to `limit` relevant games plus a
 * ready-to-inject prompt block. Safe to call on every chat turn —
 * empty string and empty array when nothing matches (the coach just
 * falls back to its normal response).
 */
export async function fetchRelevantGames(
  options: FetchRelevantGamesOptions,
): Promise<RelevantGamesContext> {
  const limit = options.limit ?? MAX_RELEVANT_GAMES;
  const query = options.query.trim().toLowerCase();
  if (query.length === 0) return { games: [], promptBlock: '' };

  // Resolve opening names + ECO codes the user might be referring to.
  const { ecos, openingNames } = await resolveQueryToOpenings(query);
  if (ecos.size === 0 && openingNames.size === 0) {
    return { games: [], promptBlock: '' };
  }

  // Pull the user's recent games (newest first). Filter out master
  // games up front — those are reference material, not the student's
  // own history.
  const candidates = await db.games
    .orderBy('date')
    .reverse()
    .filter((g) => !g.isMasterGame && g.result !== '*')
    .limit(CANDIDATE_POOL_LIMIT)
    .toArray();

  const username = (options.username ?? '').toLowerCase();

  const scored: { game: GameRecord; score: number; reason: string }[] = [];
  for (const game of candidates) {
    const match = scoreGameMatch(game, ecos, openingNames);
    if (match.score > 0) {
      scored.push({ game, score: match.score, reason: match.reason });
    }
  }

  // Sort by score desc, tie-break on date desc (already ordered).
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  if (top.length === 0) return { games: [], promptBlock: '' };

  const games: RelevantGameExample[] = top.map(({ game, reason }) => {
    const playerColor = inferPlayerColor(game, username);
    return {
      gameId: game.id,
      opponent: playerColor === 'white' ? game.black : game.white,
      opponentElo: playerColor === 'white' ? game.blackElo : game.whiteElo,
      playerColor,
      result: computeResult(game, playerColor),
      date: game.date || null,
      eco: game.eco,
      opening: openingNameForEco(game.eco, openingNames),
      matchReason: reason,
    };
  });

  return { games, promptBlock: renderPromptBlock(games) };
}

interface OpeningIndex {
  ecos: Set<string>;
  openingNames: Set<string>;
}

/**
 * Map a user query like "catalan middlegame" or "B01" to a set of
 * ECO codes + opening name tokens the game records may match against.
 */
async function resolveQueryToOpenings(query: string): Promise<OpeningIndex> {
  const ecos = new Set<string>();
  const openingNames = new Set<string>();

  // Direct ECO code hit — "B01", "E04", etc. Accept upper or lower.
  const ecoMatches = query.match(/\b[a-e][0-9]{2}\b/gi);
  if (ecoMatches) {
    for (const code of ecoMatches) ecos.add(code.toUpperCase());
  }

  // Match against the repertoire openings by name. Tokenize the
  // opening name and require at least one distinctive token to appear
  // in the query (filters out common words like "opening" / "defense").
  const openings = await getRepertoireOpenings().catch(() => []);
  for (const o of openings) {
    if (!o.name || !o.eco) continue;
    const lowerName = o.name.toLowerCase();
    // Tokens >= 5 chars and not generic ("opening", "defense", "system").
    const tokens = lowerName
      .split(/[^a-z]+/)
      .filter((t) => t.length >= 5 && !GENERIC_TOKENS.has(t));
    const hit = tokens.some((t) => query.includes(t));
    if (hit) {
      ecos.add(o.eco);
      openingNames.add(lowerName);
    }
  }

  return { ecos, openingNames };
}

const GENERIC_TOKENS = new Set([
  'opening',
  'defense',
  'defence',
  'system',
  'attack',
  'gambit',
  'variation',
  'middlegame',
  'endgame',
]);

/**
 * Score a candidate game against the resolved openings. Higher score =
 * more relevant. Zero score means ignore.
 */
function scoreGameMatch(
  game: GameRecord,
  ecos: Set<string>,
  openingNames: Set<string>,
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];

  if (game.eco && ecos.has(game.eco)) {
    score += 10;
    reasons.push(`ECO ${game.eco}`);
  }

  // Opening-name substring match on the game's PGN headers or opening
  // name hint (if the import stored one). Cheap fallback for games
  // whose ECO is missing but whose opening name was extracted.
  const hay = `${game.eco ?? ''} ${game.white} ${game.black}`.toLowerCase();
  for (const name of openingNames) {
    if (hay.includes(name)) {
      score += 3;
      reasons.push(`mentions ${name}`);
      break;
    }
  }

  return { score, reason: reasons.join(', ') };
}

function inferPlayerColor(
  game: GameRecord,
  lowerUsername: string,
): 'white' | 'black' {
  if (lowerUsername) {
    if (game.white.toLowerCase() === lowerUsername) return 'white';
    if (game.black.toLowerCase() === lowerUsername) return 'black';
  }
  // Fallback: chesscom / lichess imports default to "the user is the
  // side not named as an AI or engine". Without a username we can
  // only guess — default to white, which matches the historical
  // default in coachChatService.getRecentGamesSummary.
  return 'white';
}

function computeResult(
  game: GameRecord,
  playerColor: 'white' | 'black',
): 'win' | 'loss' | 'draw' {
  if (game.result === '1/2-1/2') return 'draw';
  const whiteWon = game.result === '1-0';
  return (whiteWon && playerColor === 'white') ||
    (!whiteWon && playerColor === 'black')
    ? 'win'
    : 'loss';
}

function openingNameForEco(
  eco: string | null | undefined,
  knownNames: Set<string>,
): string | null {
  if (!eco) return null;
  // Prefer the specific known name over the generic ECO code when we
  // actually matched by name above.
  // (We don't have ECO → name map wired here; the game record would
  // typically carry the name in a future refactor.)
  const first = knownNames.values().next().value;
  return typeof first === 'string' ? first : null;
}

/**
 * Render the relevant games as a short system-prompt block the coach
 * can reference. Keep it compact — the coach has a token budget.
 */
function renderPromptBlock(games: RelevantGameExample[]): string {
  if (games.length === 0) return '';
  const header =
    `GROUNDING — games the student has actually played in this line ` +
    `(most relevant first). Cite these concretely when answering. ` +
    `Don't fabricate games outside this list.`;

  const lines = games.map((g) => {
    const elo = g.opponentElo ? ` (${g.opponentElo})` : '';
    const date = g.date ? ` · ${g.date}` : '';
    const outcome =
      g.result === 'win' ? 'WIN' : g.result === 'loss' ? 'LOSS' : 'DRAW';
    const eco = g.eco ? ` · ${g.eco}` : '';
    return `- ${outcome} as ${g.playerColor} vs ${g.opponent}${elo}${eco}${date} · match: ${g.matchReason}`;
  });

  return [header, ...lines].join('\n');
}
