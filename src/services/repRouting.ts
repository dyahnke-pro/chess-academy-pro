// Where a Today's-Training rep sends the student when tapped. Extracted from
// the (previously duplicated, untested) inline routing in DashboardPage and
// TrainingPlanRolodexPage so every sensor's destination is asserted in one
// place. Pure: returns a path (+ router state) — the caller does the navigate.

import { REP_PUZZLE_CAP } from './repCompletion';
import type { RepCandidate } from './trainingPlanSelector';

export interface RepRoute {
  path: string;
  state?: Record<string, unknown>;
}

const WEAKSPOT_PREFIX = 'analysis:weakspot:';

export function resolveRepRoute(rep: RepCandidate): RepRoute {
  // SRS / new-line reps teach the opening itself.
  if (rep.kind !== 'weakness') {
    return { path: `/openings/${rep.openingId ?? ''}` };
  }
  const tag = rep.tag;

  // Opening weak spots → the opening's own drill (DrillMode resurfaces the
  // failed positions + marks them drilled on a correct move).
  if (tag?.startsWith(WEAKSPOT_PREFIX)) {
    return { path: `/openings/${tag.slice(WEAKSPOT_PREFIX.length)}` };
  }
  // Board-vision blind spots → Find-the-Square trainer (records fresh attempts).
  if (tag === 'analysis:boardvision') {
    return { path: '/tactics/find-square' };
  }
  // Time-trouble blunders → practice under the clock.
  if (tag === 'analysis:timetrouble') {
    return { path: '/coach/play?time=blitz-5-0' };
  }
  // Conversion failures → play out the blown winning position (conv=1 closes it).
  if (tag === 'analysis:conversion' && rep.fen) {
    return { path: `/coach/play?fen=${encodeURIComponent(rep.fen)}&conv=1` };
  }
  // Themed tactical weakness → the adaptive drill, capped as a daily rep.
  if (rep.puzzleThemes && rep.puzzleThemes.length > 0) {
    return {
      path: '/tactics/adaptive',
      state: {
        forcedWeakThemes: rep.puzzleThemes,
        misconceptionTag: tag && !tag.startsWith('analysis:') ? tag : undefined,
        repKey: rep.key,
        repCap: REP_PUZZLE_CAP,
      },
    };
  }
  // No themed drill (e.g. a phase-bucket mistake) → the Weaknesses overview.
  return { path: '/weaknesses' };
}
