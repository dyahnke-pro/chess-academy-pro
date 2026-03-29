import type { LichessPuzzleActivityEntry, LichessPuzzleDashboard } from '../types';

const LICHESS_API_BASE = 'https://lichess.org/api';
const FETCH_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Fetch the authenticated user's recent puzzle solve history from Lichess.
 * Requires a personal API token with puzzle:read scope.
 */
export async function fetchPuzzleActivity(
  token: string,
  max: number = 100,
): Promise<LichessPuzzleActivityEntry[]> {
  const params = new URLSearchParams({ max: String(max) });
  const url = `${LICHESS_API_BASE}/puzzle/activity?${params.toString()}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Lichess token — check your token in Settings');
    if (response.status === 429) throw new Error('Rate limited by Lichess — try again in a minute');
    throw new Error(`Puzzle activity API error: ${response.status}`);
  }
  const text = await response.text();
  const lines = text.split('\n').filter((l) => l.trim());
  const results: LichessPuzzleActivityEntry[] = [];
  for (const line of lines) {
    try {
      results.push(JSON.parse(line) as LichessPuzzleActivityEntry);
    } catch {
      // Skip malformed NDJSON lines
    }
  }
  return results;
}

/**
 * Fetch the authenticated user's puzzle dashboard from Lichess.
 * Shows performance broken down by theme over the last N days.
 * Requires a personal API token with puzzle:read scope.
 */
export async function fetchPuzzleDashboard(
  token: string,
  days: number = 30,
): Promise<LichessPuzzleDashboard> {
  const url = `${LICHESS_API_BASE}/puzzle/dashboard/${days}`;
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid Lichess token — check your token in Settings');
    if (response.status === 429) throw new Error('Rate limited by Lichess — try again in a minute');
    throw new Error(`Puzzle dashboard API error: ${response.status}`);
  }
  return response.json() as Promise<LichessPuzzleDashboard>;
}

/**
 * Returns the N weakest themes from a Lichess puzzle dashboard,
 * sorted by first-attempt win rate ascending (lowest = weakest).
 * Only includes themes with at least minAttempts attempts.
 */
export function getWeakestThemesFromDashboard(
  dashboard: LichessPuzzleDashboard,
  limit: number = 5,
  minAttempts: number = 3,
): string[] {
  return Object.entries(dashboard.themes)
    .filter(([, data]) => data.results.nb >= minAttempts)
    .map(([theme, data]) => ({
      theme,
      winRate: data.results.nb > 0 ? data.results.firstWins / data.results.nb : 0,
    }))
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, limit)
    .map((t) => t.theme);
}

/**
 * Format a Lichess camelCase theme name into a human-readable label.
 * e.g. "mateIn2" → "Mate In 2", "rookEndgame" → "Rook Endgame"
 */
export function formatThemeName(theme: string): string {
  return theme
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}
