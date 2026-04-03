import { db } from '../db/schema';
import { getCoachChatResponse } from './coachApi';
import { searchOpenings } from './openingService';
import type {
  SmartSearchResult,
  SmartSearchCategory,
  SearchIntent,
  SearchFilter,
  OpeningRecord,
  GameRecord,
  MistakePuzzle,
} from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_RESULTS = 12;

const SEARCH_SYSTEM_PROMPT = `You are a search intent parser for a chess training app. The user types a natural language query about their chess data.

Parse the query into a JSON object with this exact schema:
{
  "table": "openings" | "games" | "mistakePuzzles" | "puzzles",
  "filters": [{ "field": "fieldName", "op": "eq"|"contains"|"gt"|"lt"|"gte"|"lte", "value": "..." }],
  "sortBy": "fieldName" (optional),
  "sortDirection": "asc" | "desc" (optional),
  "limit": number (optional, max 20)
}

Available tables and fields:
- openings: name (string), eco (string like "B01"), color ("white"|"black"), isRepertoire (boolean), isFavorite (boolean), drillAccuracy (number 0-1), drillAttempts (number), style (string), lastStudied (ISO date string)
- games: white (string), black (string), result ("1-0"|"0-1"|"1/2-1/2"), date (string), eco (string), source ("lichess"|"chesscom"|"coach"|"import"), isMasterGame (boolean)
- mistakePuzzles: classification ("inaccuracy"|"mistake"|"blunder"|"miss"), gamePhase ("opening"|"middlegame"|"endgame"), openingName (string), opponentName (string), playerColor ("white"|"black"), cpLoss (number)
- puzzles: rating (number), themes (string[] — e.g. "fork", "pin", "skewer", "backRankMate", "discoveredAttack", "hangingPiece")

Rules:
- Use "contains" for partial name matches (case-insensitive)
- For "worst openings" → table: openings, sortBy: drillAccuracy, sortDirection: asc, filters: [{field: "isRepertoire", op: "eq", value: true}]
- For "games I lost" → assume the user is the lower-rated player or check result
- For tactical themes like "forks" → use puzzles or mistakePuzzles table
- Return ONLY the JSON object, no markdown, no explanation`;

// ─── ECO Code Pattern ──────────────────────────────────────────────────────

const ECO_PATTERN = /^[A-E]\d{0,2}$/i;

// ─── LLM Intent Parsing ───────────────────────────────────────────────────

async function parseSearchIntent(query: string): Promise<SearchIntent | null> {
  const response = await getCoachChatResponse(
    [{ role: 'user', content: query }],
    SEARCH_SYSTEM_PROMPT,
    undefined,
    'smart_search',
    256,
  );

  try {
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (typeof parsed.table !== 'string' || !Array.isArray(parsed.filters)) return null;
    return parsed as unknown as SearchIntent;
  } catch {
    return null;
  }
}

// ─── Query Execution ──────────────────────────────────────────────────────

function toStr(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function matchesFilter(value: unknown, filter: SearchFilter): boolean {
  if (value === null || value === undefined) return false;

  switch (filter.op) {
    case 'eq':
      return toStr(value).toLowerCase() === toStr(filter.value).toLowerCase();
    case 'contains':
      return toStr(value).toLowerCase().includes(toStr(filter.value).toLowerCase());
    case 'gt':
      return Number(value) > Number(filter.value);
    case 'lt':
      return Number(value) < Number(filter.value);
    case 'gte':
      return Number(value) >= Number(filter.value);
    case 'lte':
      return Number(value) <= Number(filter.value);
    default:
      return false;
  }
}

function applyFilters<T extends Record<string, unknown>>(items: T[], filters: SearchFilter[]): T[] {
  return items.filter((item) =>
    filters.every((f) => {
      const val = item[f.field];
      // Handle array fields (e.g., themes)
      if (Array.isArray(val) && f.op === 'contains') {
        return val.some((v) => String(v).toLowerCase().includes(String(f.value).toLowerCase()));
      }
      return matchesFilter(val, f);
    }),
  );
}

function sortItems<T extends Record<string, unknown>>(items: T[], sortBy: string, direction: 'asc' | 'desc'): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : toStr(aVal).localeCompare(toStr(bVal));
    return direction === 'desc' ? -cmp : cmp;
  });
}

async function executeIntent(intent: SearchIntent): Promise<SmartSearchResult[]> {
  const limit = Math.min(intent.limit ?? MAX_RESULTS, 20);

  switch (intent.table) {
    case 'openings': {
      let items = await db.openings.toArray();
      items = applyFilters(items as unknown as Record<string, unknown>[], intent.filters) as unknown as OpeningRecord[];
      if (intent.sortBy) {
        items = sortItems(items as unknown as Record<string, unknown>[], intent.sortBy, intent.sortDirection ?? 'asc') as unknown as OpeningRecord[];
      }
      return items.slice(0, limit).map((o) => openingToResult(o));
    }
    case 'games': {
      let items = await db.games.toArray();
      items = applyFilters(items as unknown as Record<string, unknown>[], intent.filters) as unknown as GameRecord[];
      if (intent.sortBy) {
        items = sortItems(items as unknown as Record<string, unknown>[], intent.sortBy, intent.sortDirection ?? 'desc') as unknown as GameRecord[];
      }
      return items.slice(0, limit).map((g) => gameToResult(g));
    }
    case 'mistakePuzzles': {
      let items = await db.mistakePuzzles.toArray();
      items = applyFilters(items as unknown as Record<string, unknown>[], intent.filters) as unknown as MistakePuzzle[];
      if (intent.sortBy) {
        items = sortItems(items as unknown as Record<string, unknown>[], intent.sortBy, intent.sortDirection ?? 'desc') as unknown as MistakePuzzle[];
      }
      return items.slice(0, limit).map((m) => mistakeToResult(m));
    }
    case 'puzzles': {
      let items = await db.puzzles.toArray();
      items = applyFilters(items as unknown as Record<string, unknown>[], intent.filters) as unknown as typeof items;
      if (intent.sortBy) {
        items = sortItems(items as unknown as Record<string, unknown>[], intent.sortBy, intent.sortDirection ?? 'desc') as unknown as typeof items;
      }
      return items.slice(0, limit).map((p) => ({
        category: 'puzzle' as SmartSearchCategory,
        id: p.id,
        title: `Puzzle ${p.id}`,
        subtitle: `Rating ${p.rating} · ${p.themes.slice(0, 3).join(', ')}`,
        route: `/puzzles/${p.id}`,
      }));
    }
    default:
      return [];
  }
}

// ─── Result Mappers ───────────────────────────────────────────────────────

function openingToResult(o: OpeningRecord): SmartSearchResult {
  const accuracy = o.drillAttempts > 0 ? `${Math.round(o.drillAccuracy * 100)}% accuracy` : 'Not studied';
  return {
    category: 'opening',
    id: o.id,
    title: o.name,
    subtitle: `${o.eco} · ${o.color} · ${accuracy}`,
    route: `/openings/${o.id}`,
  };
}

function gameToResult(g: GameRecord): SmartSearchResult {
  return {
    category: 'game',
    id: g.id,
    title: `${g.white} vs ${g.black}`,
    subtitle: `${g.result} · ${g.date || 'Unknown date'}${g.eco ? ` · ${g.eco}` : ''}`,
    route: `/games/${g.id}`,
  };
}

function mistakeToResult(m: MistakePuzzle): SmartSearchResult {
  return {
    category: 'mistake',
    id: m.id,
    title: `${m.classification} — move ${m.moveNumber}`,
    subtitle: `${m.openingName ?? 'Unknown opening'} · ${m.gamePhase} · ${m.cpLoss}cp loss`,
    route: `/tactics/drill?mistake=${m.id}`,
  };
}

// ─── Basic Text Search (Fallback) ─────────────────────────────────────────

async function basicTextSearch(query: string, scope?: SmartSearchCategory): Promise<SmartSearchResult[]> {
  const results: SmartSearchResult[] = [];
  const lower = query.toLowerCase();

  // Openings
  if (!scope || scope === 'opening') {
    const openings = await searchOpenings(query);
    results.push(...openings.slice(0, 8).map(openingToResult));
  }

  // Games (search by player name)
  if (!scope || scope === 'game') {
    const games = await db.games
      .filter((g) =>
        g.white.toLowerCase().includes(lower) ||
        g.black.toLowerCase().includes(lower) ||
        (g.eco ?? '').toLowerCase().includes(lower),
      )
      .limit(6)
      .toArray();
    results.push(...games.map(gameToResult));
  }

  // Mistakes (search by opening name or opponent)
  if (!scope || scope === 'mistake') {
    const mistakes = await db.mistakePuzzles
      .filter((m) =>
        (m.openingName ?? '').toLowerCase().includes(lower) ||
        (m.opponentName ?? '').toLowerCase().includes(lower),
      )
      .limit(6)
      .toArray();
    results.push(...mistakes.map(mistakeToResult));
  }

  return results.slice(0, MAX_RESULTS);
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Perform an AI-powered search. Falls back to basic text search
 * if the LLM is unavailable or fails to parse the query.
 */
export async function smartSearch(
  query: string,
  scope?: SmartSearchCategory,
): Promise<SmartSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Fast path: ECO code queries go straight to basic search
  if (ECO_PATTERN.test(trimmed)) {
    return basicTextSearch(trimmed, scope);
  }

  // Fast path: very short queries (1-2 words) use basic search
  if (trimmed.split(/\s+/).length <= 2) {
    return basicTextSearch(trimmed, scope);
  }

  // Try LLM intent parsing for natural language queries
  try {
    const intent = await parseSearchIntent(trimmed);
    if (intent) {
      // If a scope is set, override the table
      if (scope === 'opening') intent.table = 'openings';
      const results = await executeIntent(intent);
      if (results.length > 0) return results;
    }
  } catch {
    // LLM failed — fall through to basic search
  }

  return basicTextSearch(trimmed, scope);
}

/**
 * Basic text search without LLM. Used for short queries or as fallback.
 */
export { basicTextSearch };
