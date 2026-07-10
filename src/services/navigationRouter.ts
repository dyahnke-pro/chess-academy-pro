/**
 * navigationRouter — deterministic "take me to X" / "open X" / "go to X".
 *
 * Part of the unified action layer (David: "allow actions like open this tab,
 * take me to X"). The coach resolves a navigation phrase to a REAL app route in
 * code (never invents one), so navigation works identically on every surface
 * via dispatchCoachTurn. Only concrete destinations from the curated alias map
 * match — an unknown target returns null and falls through to the brain, and a
 * content phrase ("show me a fork puzzle") is caught by the training-aid router
 * that runs BEFORE this, so it never mis-fires as navigation.
 *
 * Aliases are ordered most-specific first so "training plan" beats "plan" and
 * "play with coach" beats "play". Parameterized routes (:id/:kind) are excluded
 * — you can't navigate to them without a resource.
 */
export interface NavigationMatch {
  path: string;
  ack: string;
}

interface NavAlias {
  /** Phrases (lowercased, word-boundary matched) that name this destination. */
  names: string[];
  path: string;
  /** Human label for the confirmation ("Opening <label>."). */
  label: string;
}

// Ordered most-specific → least so a longer alias wins.
const NAV_ALIASES: NavAlias[] = [
  { names: ['play with coach', 'play with the coach', 'play a game', 'coach game'], path: '/coach/play', label: 'Play with the Coach' },
  { names: ['coach chat', 'chat with coach', 'chat with the coach'], path: '/coach/chat', label: 'Chat with the Coach' },
  { names: ['analyse a position', 'analyze a position', 'analysis board', 'analyse', 'analyze'], path: '/coach/analyse', label: 'Analyse' },
  { names: ['training plan', 'my plan'], path: '/coach/plan', label: 'Training Plan' },
  { names: ['coach training', 'coach train'], path: '/coach/train', label: 'Coach Training' },
  { names: ['review with coach', 'game review', 'review my games', 'coach review', 'the review page', 'review page', 'review'], path: '/coach/review', label: 'Review with Coach' },
  { names: ['tactics trainer', 'tactics page', 'tactics tab', 'tactics', 'puzzle trainer'], path: '/tactics', label: 'Tactics' },
  { names: ['learn with coach', 'teach me', 'learn tab'], path: '/coach/teach', label: 'Learn with Coach' },
  { names: ['tactical profile', 'my tactical profile'], path: '/tactics/profile', label: 'Tactical Profile' },
  { names: ['daily training', 'classic puzzles', 'daily puzzles'], path: '/tactics/classic', label: 'Daily Training' },
  { names: ['adaptive puzzles'], path: '/tactics/adaptive', label: 'Adaptive Puzzles' },
  { names: ['my mistakes', 'mistake puzzles'], path: '/tactics/mistakes', label: 'My Mistakes' },
  { names: ['calculation', 'calculation training', 'calculation drills'], path: '/tactics/calculation', label: 'Calculation' },
  { names: ['weakness themes', 'weakness drills'], path: '/tactics/weakness-themes', label: 'Weakness Themes' },
  { names: ['tactic setup', 'setup trainer'], path: '/tactics/setup', label: 'Tactic Setup' },
  { names: ['opening traps', 'trap trainer'], path: '/tactics/opening-traps', label: 'Opening Traps' },
  { names: ['find the square', 'board vision', 'coordinate trainer'], path: '/tactics/find-square', label: 'Find the Square' },
  { names: ['opening explorer', 'openings', 'my repertoire', 'repertoire'], path: '/openings', label: 'Opening Explorer' },
  { names: ['game insights', 'my weaknesses', 'weaknesses', 'insights'], path: '/weaknesses', label: 'Game Insights' },
  { names: ['import games', 'import my games'], path: '/games/import', label: 'Import Games' },
  { names: ['game database', 'my games', 'games'], path: '/games', label: 'Game Database' },
  { names: ['settings'], path: '/settings', label: 'Settings' },
  { names: ['tactics', 'puzzles', 'puzzle trainer'], path: '/tactics', label: 'Tactics' },
  { names: ['dashboard', 'home', 'home screen', 'main screen'], path: '/', label: 'Home' },
];

const NAV_INTENT_RE =
  /\b(?:take me (?:over |on )?to|take me home|go to|go home|navigate to|bring up|pull up|jump to|switch to|open(?:\s+up)?|show me)\b/i;

/** Resolve a route TOPIC (the destination named in the text) to a real
 *  route + label, WITHOUT requiring a navigation verb. Used by the app-help
 *  grounding (F15) — "what does the Tactics tab do?" names a route but isn't a
 *  navigation command. Returns null when no curated destination is named. */
export function matchRouteByTopic(text: string): { path: string; label: string } | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const alias of NAV_ALIASES) {
    for (const name of alias.names) {
      // Word-boundary match so "settings" doesn't fire inside "unsettling".
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (re.test(t)) return { path: alias.path, label: alias.label };
    }
  }
  return null;
}

/** Match a navigation command to a real route, or null. Adds the navigation-
 *  verb gate on top of the topic match (so a bare "tactics" mention doesn't
 *  navigate — only "take me to tactics" / "open tactics" does). */
export function matchNavigationRoute(text: string): NavigationMatch | null {
  if (!text || !NAV_INTENT_RE.test(text.toLowerCase())) return null;
  const m = matchRouteByTopic(text);
  return m ? { path: m.path, ack: `Opening ${m.label}.` } : null;
}
