// Every opening rewritten as a Watch course (WO-OPENINGS-REWRITE-01). A course
// listed here replaces the hand-written lessons for its opening and tabs.
// Kept alphabetical, so courses written in parallel merge cleanly.
import type { WatchCourse } from './watchCourse';
import { BENONI_DEFENCE_WATCH } from './benoniDefence';
import { BIRDS_OPENING_WATCH } from './birdsOpening';
import { BUDAPEST_GAMBIT_WATCH } from './budapestGambit';
import { EVANS_GAMBIT_WATCH } from './evansGambit';
import { GRUNFELD_DEFENCE_WATCH } from './grunfeldDefence';
import { KINGS_INDIAN_DEFENCE_WATCH } from './kingsIndianDefence';
import { OLD_INDIAN_DEFENCE_WATCH } from './oldIndianDefence';
import { PETROV_DEFENCE_WATCH } from './petrovDefence';
import { PRO_GOTHAMCHESS_ITALIAN_WATCH } from './proGothamchessItalian';
import { RETI_OPENING_WATCH } from './retiOpening';
import { SEMI_SLAV_WATCH } from './semiSlav';
import { SICILIAN_NAJDORF_WATCH } from './sicilianNajdorf';
import { SICILIAN_SVESHNIKOV_WATCH } from './sicilianSveshnikov';
import { TROMPOWSKY_ATTACK_WATCH } from './trompowskyAttack';
import { TWO_KNIGHTS_DEFENCE_WATCH } from './twoKnightsDefence';

export const WATCH_COURSES: readonly WatchCourse[] = [
  BENONI_DEFENCE_WATCH,
  BIRDS_OPENING_WATCH,
  BUDAPEST_GAMBIT_WATCH,
  EVANS_GAMBIT_WATCH,
  GRUNFELD_DEFENCE_WATCH,
  KINGS_INDIAN_DEFENCE_WATCH,
  OLD_INDIAN_DEFENCE_WATCH,
  PETROV_DEFENCE_WATCH,
  PRO_GOTHAMCHESS_ITALIAN_WATCH,
  RETI_OPENING_WATCH,
  SEMI_SLAV_WATCH,
  SICILIAN_NAJDORF_WATCH,
  SICILIAN_SVESHNIKOV_WATCH,
  TROMPOWSKY_ATTACK_WATCH,
  TWO_KNIGHTS_DEFENCE_WATCH,
];
