// The single cross-store "due today" scheduler (David 2026-05-25 — the
// cohesion capstone). The app has several independent SRS tracks — tactical
// puzzles, game-mistake puzzles, opening-line cards, setup puzzles, endgame
// positions — each with its own spacing. They used to be invisible side
// doors. This module aggregates every track's due count into ONE board so
// the daily surfaces (Dashboard) show the whole picture, each row routing to
// the surface that drills it.
//
// Thinking-error (misconception) reps are deliberately NOT a row here — the
// Training Plan's curated "Today's reps" feed owns those (weaknesses + SRS-
// due openings + new lines). This board covers the standalone drill stores
// the plan feed doesn't surface, so the two don't double-count.

import { getDuePuzzles } from './puzzleService';
import { getMistakePuzzlesDue } from './mistakePuzzleService';
import { getDueCount as getDueOpeningCardCount } from './srsOpeningService';
import { getDueSetupPuzzleCount } from './tacticSetupService';
import { getDueEndgameCount } from './endgameProgressService';

export interface DueTrack {
  key: string;
  label: string;
  sublabel: string;
  count: number;
  route: string;
}

// Generous cap when we only need a count — the stores are bounded.
const COUNT_CAP = 999;

/** All standalone drill stores with items due now, each as a routable
 *  track (count > 0 only). Ranked most-due first. */
export async function getDueTodayTracks(): Promise<DueTrack[]> {
  const [tactical, mistakes, openings, setup, endgame] = await Promise.all([
    getDuePuzzles(COUNT_CAP).then((p) => p.length),
    getMistakePuzzlesDue(COUNT_CAP).then((p) => p.length),
    getDueOpeningCardCount(),
    getDueSetupPuzzleCount(),
    getDueEndgameCount(),
  ]);

  const tracks: DueTrack[] = [
    { key: 'mistakes', label: 'Game mistakes', sublabel: 'Re-solve the positions you blew.', count: mistakes, route: '/tactics/mistakes' },
    { key: 'tactical', label: 'Tactical puzzles', sublabel: 'Spaced review — keep the patterns sharp.', count: tactical, route: '/tactics/adaptive' },
    { key: 'openings', label: 'Opening reviews', sublabel: 'Lines you learned, due to refresh.', count: openings, route: '/openings/srs' },
    { key: 'setup', label: 'Setup puzzles', sublabel: 'Engineer the tactic — the quiet prep move.', count: setup, route: '/tactics/setup' },
    { key: 'endgame', label: 'Endgame reviews', sublabel: 'Keystone positions, due to refresh.', count: endgame, route: '/coach/endgame' },
  ];

  return tracks.filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
}

/** Total items due across every standalone track. */
export async function getDueTodayTotal(): Promise<number> {
  const tracks = await getDueTodayTracks();
  return tracks.reduce((sum, t) => sum + t.count, 0);
}
