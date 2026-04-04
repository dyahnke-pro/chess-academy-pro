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

// ─── Settings Search Index ───────────────────────────────────────────────

interface SettingsEntry {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  tab: string;
  section: string;
}

const SETTINGS_INDEX: SettingsEntry[] = [
  // Profile tab
  { id: 'profile-name', title: 'Display Name', subtitle: 'Profile — change your player name', keywords: ['name', 'display name', 'player name', 'username'], tab: 'profile', section: 'profile' },
  { id: 'profile-elo', title: 'ELO Rating', subtitle: 'Profile — set your current chess rating', keywords: ['elo', 'rating', 'rank', 'level'], tab: 'profile', section: 'profile' },
  { id: 'profile-session', title: 'Daily Session Duration', subtitle: 'Profile — how long to train each day', keywords: ['session', 'daily', 'duration', 'minutes', 'time', 'training time'], tab: 'profile', section: 'profile' },
  { id: 'profile-export', title: 'Export Data', subtitle: 'Profile — download your data as JSON', keywords: ['export', 'backup', 'download', 'data'], tab: 'profile', section: 'profile' },
  { id: 'profile-sync', title: 'Cloud Sync', subtitle: 'Profile — Supabase cloud sync settings', keywords: ['sync', 'cloud', 'supabase', 'backup'], tab: 'profile', section: 'sync' },
  { id: 'profile-lichess', title: 'Lichess Integration', subtitle: 'Profile — Lichess API token for puzzle dashboard', keywords: ['lichess', 'token', 'integration', 'api', 'puzzle dashboard'], tab: 'profile', section: 'lichess' },

  // Board tab — Display
  { id: 'board-highlight', title: 'Highlight Last Move', subtitle: 'Board — show highlight on last move squares', keywords: ['highlight', 'last move', 'move highlight', 'yellow highlight'], tab: 'board', section: 'board-display' },
  { id: 'board-legal', title: 'Show Legal Moves', subtitle: 'Board — show dots on valid squares', keywords: ['legal moves', 'valid moves', 'move dots', 'show moves'], tab: 'board', section: 'board-display' },
  { id: 'board-coords', title: 'Show Coordinates', subtitle: 'Board — display rank/file labels', keywords: ['coordinates', 'rank', 'file', 'labels', 'a-h', '1-8', 'numbers', 'letters'], tab: 'board', section: 'board-display' },
  { id: 'board-animation', title: 'Piece Animation Speed', subtitle: 'Board — speed of piece movement', keywords: ['animation', 'speed', 'piece movement', 'move speed', 'fast', 'slow'], tab: 'board', section: 'board-display' },
  { id: 'board-orientation', title: 'White on Bottom', subtitle: 'Board — board orientation', keywords: ['orientation', 'white on bottom', 'flip board', 'board direction', 'rotate'], tab: 'board', section: 'board-display' },

  // Board tab — Appearance
  { id: 'board-color', title: 'Board Color', subtitle: 'Board — color scheme for squares', keywords: ['board color', 'board theme', 'square color', 'color scheme', 'classic', 'tournament', 'green', 'blue', 'purple', 'wood', 'ice', 'coral', 'change color', 'board colour'], tab: 'board', section: 'board-appearance' },
  { id: 'board-pieces', title: 'Piece Set', subtitle: 'Board — visual style of chess pieces', keywords: ['piece set', 'pieces', 'piece style', 'staunton', 'neo', 'alpha', 'merida', 'california', 'pixel', 'horsey', 'piece theme'], tab: 'board', section: 'board-appearance' },

  // Board tab — Audio
  { id: 'board-sound', title: 'Sound Effects', subtitle: 'Board — sounds on moves, captures, and checks', keywords: ['sound', 'audio', 'effects', 'mute', 'volume', 'sounds'], tab: 'board', section: 'audio' },

  // Board tab — Engine
  { id: 'board-eval', title: 'Eval Bar', subtitle: 'Board — Stockfish evaluation bar', keywords: ['eval bar', 'evaluation', 'stockfish', 'engine bar', 'analysis bar'], tab: 'board', section: 'engine' },
  { id: 'board-lines', title: 'Engine Lines', subtitle: 'Board — computer analysis lines', keywords: ['engine lines', 'analysis lines', 'computer lines', 'variations'], tab: 'board', section: 'engine' },

  // Board tab — Feedback & Coaching
  { id: 'board-flash', title: 'Move Quality Flash', subtitle: 'Board — flash border based on move quality', keywords: ['move quality', 'flash', 'quality flash', 'green red', 'move feedback'], tab: 'board', section: 'feedback' },
  { id: 'board-hints', title: 'Show Hints', subtitle: 'Board — allow hint button during play', keywords: ['hints', 'hint button', 'help', 'show hints', 'assistance'], tab: 'board', section: 'feedback' },
  { id: 'board-voice', title: 'Voice Narration', subtitle: 'Board — spoken coach commentary', keywords: ['voice', 'narration', 'speech', 'spoken', 'commentary', 'talk', 'speak'], tab: 'board', section: 'feedback' },

  // Board tab — Game Behavior
  { id: 'board-move-method', title: 'Move Method', subtitle: 'Board — drag, click, or both', keywords: ['move method', 'drag', 'click', 'drag and drop', 'how to move'], tab: 'board', section: 'game-behavior' },
  { id: 'board-confirm', title: 'Move Confirmation', subtitle: 'Board — require confirmation before each move', keywords: ['confirmation', 'confirm move', 'move confirmation', 'confirm'], tab: 'board', section: 'game-behavior' },
  { id: 'board-promote', title: 'Auto-Promote to Queen', subtitle: 'Board — auto promote pawns to queen', keywords: ['promote', 'queen', 'auto promote', 'pawn promotion', 'promotion'], tab: 'board', section: 'game-behavior' },
  { id: 'board-master-off', title: 'Master All Off', subtitle: 'Board — disable all feedback features at once', keywords: ['master', 'all off', 'disable all', 'turn off everything', 'minimal'], tab: 'board', section: 'master-off' },

  // Coach tab
  { id: 'coach-provider', title: 'AI Provider', subtitle: 'Coach — DeepSeek or Anthropic', keywords: ['provider', 'ai provider', 'deepseek', 'anthropic', 'claude', 'ai', 'llm'], tab: 'coach', section: 'coach' },
  { id: 'coach-api-key', title: 'API Key', subtitle: 'Coach — set your AI provider API key', keywords: ['api key', 'key', 'secret key', 'authentication', 'api'], tab: 'coach', section: 'coach' },
  { id: 'coach-budget', title: 'Monthly Budget Cap', subtitle: 'Coach — spending limit for AI usage', keywords: ['budget', 'spending', 'cost', 'money', 'limit', 'monthly', 'cap'], tab: 'coach', section: 'coach' },
  { id: 'coach-commentary-model', title: 'Commentary Model', subtitle: 'Coach — AI model for narration', keywords: ['commentary model', 'narration model', 'model', 'haiku', 'sonnet', 'opus'], tab: 'coach', section: 'coach' },
  { id: 'coach-analysis-model', title: 'Analysis Model', subtitle: 'Coach — AI model for game analysis', keywords: ['analysis model', 'model', 'analysis', 'haiku', 'sonnet', 'opus'], tab: 'coach', section: 'coach' },
  { id: 'coach-reports-model', title: 'Reports Model', subtitle: 'Coach — AI model for report generation', keywords: ['reports model', 'report model', 'model', 'reports'], tab: 'coach', section: 'coach' },
  { id: 'coach-voice', title: 'Voice Settings', subtitle: 'Coach — speech voice and speed preferences', keywords: ['voice settings', 'speech', 'voice', 'tts', 'text to speech', 'voice speed'], tab: 'coach', section: 'voice-settings' },

  // Appearance tab
  { id: 'appearance-theme', title: 'App Theme', subtitle: 'Appearance — light, dark, or custom theme', keywords: ['theme', 'dark mode', 'light mode', 'appearance', 'dark', 'light', 'color theme', 'app color', 'app theme'], tab: 'appearance', section: 'appearance' },

  // About tab
  { id: 'about-version', title: 'App Version', subtitle: 'About — current app version info', keywords: ['version', 'about', 'app info'], tab: 'about', section: 'about' },
  { id: 'about-reset', title: 'Reset All Data', subtitle: 'About — delete all data and start fresh', keywords: ['reset', 'delete data', 'clear data', 'start over', 'factory reset', 'wipe'], tab: 'about', section: 'about' },
];

function searchSettings(query: string): SmartSearchResult[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  const words = lower.split(/\s+/).filter(Boolean);

  const scored = SETTINGS_INDEX.map((entry) => {
    let score = 0;
    // Check title match
    if (entry.title.toLowerCase().includes(lower)) score += 10;
    // Check keyword matches
    for (const kw of entry.keywords) {
      if (kw.includes(lower)) score += 8;
      for (const word of words) {
        if (kw.includes(word)) score += 3;
      }
    }
    // Check subtitle
    if (entry.subtitle.toLowerCase().includes(lower)) score += 4;
    for (const word of words) {
      if (entry.subtitle.toLowerCase().includes(word)) score += 1;
    }
    return { entry, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return scored.map(({ entry }) => ({
    category: 'setting' as SmartSearchCategory,
    id: entry.id,
    title: entry.title,
    subtitle: entry.subtitle,
    route: `/settings?tab=${entry.tab}&section=${entry.section}`,
  }));
}

const SEARCH_SYSTEM_PROMPT = `You are a search intent parser for a chess training app. The user types a natural language query about their chess data or app settings.

Parse the query into a JSON object with this exact schema:
{
  "table": "openings" | "games" | "mistakePuzzles" | "puzzles" | "settings",
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
- settings: keyword (string) — use this table when user wants to change, configure, or find a setting. Filter by keyword with "contains" operator. Keywords: board color, piece set, theme, dark mode, sound, voice, hints, eval bar, engine lines, animation, coordinates, orientation, api key, provider, budget, model, name, elo, rating, reset, export, sync, lichess, move method, confirmation, promote, master off

Rules:
- Use "contains" for partial name matches (case-insensitive)
- For queries about changing settings, preferences, or configuration → use table: "settings"
- For "change the color of the board" → table: settings, filters: [{field: "keyword", op: "contains", value: "board color"}]
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

  if (intent.table === 'settings') {
    const keyword = intent.filters.find((f) => f.field === 'keyword')?.value ?? '';
    return searchSettings(String(keyword));
  }

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

  // Settings
  if (!scope || scope === 'setting') {
    results.push(...searchSettings(lower));
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
export { basicTextSearch, searchSettings };
