// Every opening rewritten as a Watch course (WO-OPENINGS-REWRITE-01). A course
// listed here replaces the hand-written lessons for its opening and tabs.
// Kept alphabetical, so courses written in parallel merge cleanly.
import type { WatchCourse } from './watchCourse';
import { BENONI_DEFENCE_WATCH } from './benoniDefence';
import { PETROV_DEFENCE_WATCH } from './petrovDefence';
import { SEMI_SLAV_WATCH } from './semiSlav';
import { TROMPOWSKY_ATTACK_WATCH } from './trompowskyAttack';
import { TWO_KNIGHTS_DEFENCE_WATCH } from './twoKnightsDefence';

export const WATCH_COURSES: readonly WatchCourse[] = [
  BENONI_DEFENCE_WATCH,
  PETROV_DEFENCE_WATCH,
  SEMI_SLAV_WATCH,
  TROMPOWSKY_ATTACK_WATCH,
  TWO_KNIGHTS_DEFENCE_WATCH,
];
