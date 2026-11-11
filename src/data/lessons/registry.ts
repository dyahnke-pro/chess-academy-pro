// Single source of truth for masterclass-lesson GATING.
//
// Why this exists separately from index.ts: index.ts is the RUNTIME
// registry (what the LessonPlayer launches — main + variation lessons,
// keyed for lookup). This file is the GATE registry — it collects EVERY
// authored lesson (main + variation + trap) into one flat list so the
// content gates sweep all of them. The Hole-2 failure mode (David,
// 2026-05-22): gates that hardcode `[RUY_*, VIENNA_*]` pass VACUOUSLY on a
// newly-built opening because its lessons aren't in the array. Iterating
// ALL_LESSONS instead means: add an opening's lessons HERE once, and every
// gate (legality, arrows, DB-anchor, narration accuracy/grounding, depth,
// orientation) automatically covers it. A new opening cannot ship
// un-gated.

import type { LessonScript } from '../../types';
import { openingRecord } from './openingRecords';
import { WATCH_COURSES } from './watch';
import { watchLessons, type WatchCourse } from './watch/watchCourse';

import { RUY_TRAP_LESSONS } from './ruyTrapLessons';
import { PIRC_DEFENCE_LESSON } from './pircDefence';
import { PIRC_VARIATION_LESSONS } from './pircVariations';
import { VIENNA_TRAP_LESSONS } from './viennaTrapLessons';
import { CARO_KANN_LESSON } from './caroKann';
import { CARO_VARIATION_LESSONS } from './caroKannVariations';
import { CARO_TRAP_LESSONS } from './caroKannTrapLessons';
import { ITALIAN_GAME_TRAP_LESSONS } from './italianGameTrapLessons';
import { SCOTCH_GAME_TRAP_LESSONS } from './scotchGameTrapLessons';
import { FRENCH_DEFENCE_LESSON } from './frenchDefence';
import { FRENCH_DEFENCE_VARIATION_LESSONS } from './frenchDefenceVariations';
import { ALEKHINE_DEFENCE_LESSON } from './alekhineDefence';
import { ALEKHINE_DEFENCE_VARIATION_LESSONS } from './alekhineDefenceVariations';
import { BENKO_GAMBIT_LESSON } from './benkoGambit';
import { BENKO_GAMBIT_VARIATION_LESSONS } from './benkoGambitVariations';
import { NIMZO_INDIAN_LESSON } from './nimzoIndian';
import { NIMZO_INDIAN_VARIATION_LESSONS } from './nimzoIndianVariations';
import { LONDON_SYSTEM_LESSON } from './londonSystem';
import { LONDON_SYSTEM_VARIATION_LESSONS } from './londonSystemVariations';
import { PHILIDOR_DEFENCE_LESSON } from './philidorDefence';
import { PHILIDOR_DEFENCE_VARIATION_LESSONS } from './philidorDefenceVariations';
import { QGA_LESSON } from './queensGambitAccepted';
import { QGA_VARIATION_LESSONS } from './queensGambitAcceptedVariations';
import { SLAV_DEFENCE_LESSON } from './slavDefence';
import { SLAV_DEFENCE_VARIATION_LESSONS } from './slavDefenceVariations';
import { QUEENS_INDIAN_DEFENCE_LESSON } from './queensIndianDefence';
import { QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS } from './queensIndianDefenceVariations';
import { SCHLIEMANN_DEFENCE_LESSON } from './schliemannDefence';
import { SCHLIEMANN_DEFENCE_VARIATION_LESSONS } from './schliemannDefenceVariations';
import { QUEENS_GAMBIT_LESSON } from './queensGambit';
import { QUEENS_GAMBIT_VARIATION_LESSONS } from './queensGambitVariations';
// Gambit-tab lessons that live in gambits.json (not opening-manifests.json,
// so not masterclass-tab openings) but ARE hand-authored curated lessons.
// Registered here so the content gates (accuracy/integrity/depth/grounding/
// sources) sweep them too — David 2026-05-31 gambit-tab audit found they
// were rendering curated Watch lessons but escaping every gate.
import { SCOTCH_GAMBIT_LESSON } from './scotchGambit';
import { SCOTCH_GAMBIT_VARIATION_LESSONS } from './scotchGambitVariations';
import { VIENNA_GAMBIT_LESSON } from './viennaGambit';
import { VIENNA_GAMBIT_VARIATION_LESSONS } from './viennaGambitVariations';
import { DANISH_GAMBIT_LESSON } from './danishGambit';
import { DANISH_GAMBIT_VARIATION_LESSONS } from './danishGambitVariations';
import { SMITH_MORRA_GAMBIT_LESSON } from './smithMorraGambit';
import { SMITH_MORRA_GAMBIT_VARIATION_LESSONS } from './smithMorraGambitVariations';
import { STAFFORD_GAMBIT_LESSON } from './staffordGambit';
import { STAFFORD_GAMBIT_VARIATION_LESSONS } from './staffordGambitVariations';
import { MARSHALL_ATTACK_LESSON } from './marshallAttack';
import { MARSHALL_ATTACK_VARIATION_LESSONS } from './marshallAttackVariations';
import { ENGLUND_GAMBIT_LESSON } from './englundGambit';
import { ENGLUND_GAMBIT_VARIATION_LESSONS } from './englundGambitVariations';

export type LessonScope = 'main' | 'variation' | 'trap';

export interface RegisteredLesson {
  scope: LessonScope;
  /** Human-readable key for test output: the lesson title (main/trap) or
   *  the `${openingId}::${variation}` registry key (variation). */
  key: string;
  openingId: string;
  lesson: LessonScript;
}

interface OpeningLessons {
  main: LessonScript;
  variations: Record<string, LessonScript>;
  traps?: Record<string, LessonScript>;
}

/** A Watch course (one beat a move, WO-OPENINGS-REWRITE-01) as the gate
 *  registry reads an opening: every course is gated the day it is written. */
function watchOpening(course: WatchCourse): OpeningLessons {
  const { main, variations } = watchLessons(course);
  if (!main) throw new Error(`${course.openingId}: a Watch course needs its main line`);
  return { main, variations };
}

// ── Add a new masterclass opening HERE (and only here) ──────────────────
// An opening rewritten as a Watch course leaves this list: its course is
// gated from `WATCH_COURSES` below.
const HAND_WRITTEN: OpeningLessons[] = [
  { main: PIRC_DEFENCE_LESSON, variations: PIRC_VARIATION_LESSONS },
  { main: CARO_KANN_LESSON, variations: CARO_VARIATION_LESSONS },
  { main: FRENCH_DEFENCE_LESSON, variations: FRENCH_DEFENCE_VARIATION_LESSONS },
  { main: ALEKHINE_DEFENCE_LESSON, variations: ALEKHINE_DEFENCE_VARIATION_LESSONS },
  { main: BENKO_GAMBIT_LESSON, variations: BENKO_GAMBIT_VARIATION_LESSONS },
  { main: LONDON_SYSTEM_LESSON, variations: LONDON_SYSTEM_VARIATION_LESSONS },
  { main: NIMZO_INDIAN_LESSON, variations: NIMZO_INDIAN_VARIATION_LESSONS },
  { main: PHILIDOR_DEFENCE_LESSON, variations: PHILIDOR_DEFENCE_VARIATION_LESSONS },
  { main: QGA_LESSON, variations: QGA_VARIATION_LESSONS },
  { main: SLAV_DEFENCE_LESSON, variations: SLAV_DEFENCE_VARIATION_LESSONS },
  { main: QUEENS_INDIAN_DEFENCE_LESSON, variations: QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS },
  { main: SCHLIEMANN_DEFENCE_LESSON, variations: SCHLIEMANN_DEFENCE_VARIATION_LESSONS },
  { main: QUEENS_GAMBIT_LESSON, variations: QUEENS_GAMBIT_VARIATION_LESSONS },
];

// An opening's named-trap lessons, by opening id. They stay hand-written beat
// lessons whether the opening's main line and tabs are hand-written or a Watch
// course, so they are joined here, once, for both (a course rewrite must not
// drop its traps out of the gates).
const TRAP_LESSONS: Readonly<Record<string, Record<string, LessonScript>>> = {
  'ruy-lopez': RUY_TRAP_LESSONS,
  'vienna-game': VIENNA_TRAP_LESSONS,
  'caro-kann': CARO_TRAP_LESSONS,
  'italian-game': ITALIAN_GAME_TRAP_LESSONS,
  'scotch-game': SCOTCH_GAME_TRAP_LESSONS,
};

const OPENINGS: OpeningLessons[] = [...HAND_WRITTEN, ...WATCH_COURSES.map(watchOpening)].map((o) => ({
  ...o,
  traps: TRAP_LESSONS[o.main.openingId],
}));
for (const id of Object.keys(TRAP_LESSONS)) {
  if (!OPENINGS.some((o) => o.main.openingId === id)) throw new Error(`${id}: trap lessons for an opening the registry does not have`);
}
{
  const seen = new Set<string>();
  for (const o of OPENINGS) {
    if (seen.has(o.main.openingId)) throw new Error(`${o.main.openingId}: registered twice (hand-written and a Watch course)`);
    seen.add(o.main.openingId);
  }
}

// Gambit-tab curated lessons (gambits.json source). All 7 hand-authored
// curated lessons that render on the Gambit tab — NOT masterclass-tab openings
// (no opening-manifests.json entry, not in repertoire.json). They are swept by
// the CONTENT gates (ALL_LESSONS → accuracy / integrity / depth / §5b grounding
// / sources) but are deliberately kept OUT of FIRST_CLASS_OPENING_IDS so the
// masterclass-manifest gate doesn't require a manifest for them. David
// 2026-05-31 gambit-tab audit: these were rendering curated lessons while
// escaping every content gate. (vienna-gambit's "Gambit Accepted (…exf4)"
// variation needed the real C29 main line — 3…exf4 4.e5 Ng8 5.Nf3 — added to
// openings-lichess.json so its spine clears the G3 ≥6-ply DB anchor; done the
// same audit per David's call. Verified vs Wikipedia / Chess.com Vienna Gambit
// theory; the deeper lesson moves are legal continuation past the anchor.)
const GAMBIT_TAB_OPENINGS: OpeningLessons[] = [
  { main: SCOTCH_GAMBIT_LESSON, variations: SCOTCH_GAMBIT_VARIATION_LESSONS },
  { main: VIENNA_GAMBIT_LESSON, variations: VIENNA_GAMBIT_VARIATION_LESSONS },
  { main: DANISH_GAMBIT_LESSON, variations: DANISH_GAMBIT_VARIATION_LESSONS },
  { main: SMITH_MORRA_GAMBIT_LESSON, variations: SMITH_MORRA_GAMBIT_VARIATION_LESSONS },
  { main: STAFFORD_GAMBIT_LESSON, variations: STAFFORD_GAMBIT_VARIATION_LESSONS },
  { main: MARSHALL_ATTACK_LESSON, variations: MARSHALL_ATTACK_VARIATION_LESSONS },
  { main: ENGLUND_GAMBIT_LESSON, variations: ENGLUND_GAMBIT_VARIATION_LESSONS },
];

function build(): RegisteredLesson[] {
  const out: RegisteredLesson[] = [];
  // Masterclass openings + gambit-tab lessons are both content-gated.
  for (const op of [...OPENINGS, ...GAMBIT_TAB_OPENINGS]) {
    out.push({ scope: 'main', key: op.main.title, openingId: op.main.openingId, lesson: op.main });
    for (const [key, lesson] of Object.entries(op.variations)) {
      out.push({ scope: 'variation', key, openingId: lesson.openingId, lesson });
    }
    for (const [key, lesson] of Object.entries(op.traps ?? {})) {
      out.push({ scope: 'trap', key, openingId: lesson.openingId, lesson });
    }
  }
  return out;
}

/** Every authored masterclass lesson, flat. The gate registry. */
export const ALL_LESSONS: RegisteredLesson[] = build();

/** Opening IDs that have a first-class (main) masterclass lesson. The
 *  manifest gate uses this to require a manifest entry per first-class
 *  opening — so a new opening can't ship without declared content floors. */
export const FIRST_CLASS_OPENING_IDS: string[] = OPENINGS.map((o) => o.main.openingId);

/** The side the student plays for an opening, read from the opening's
 *  `color` field — repertoire.json, gambits.json or pro-repertoires.json, the
 *  DB-driven source of truth (`openingRecords`). Lessons must orient to this
 *  (white openings white-at-bottom, black openings black-at-bottom). Returns
 *  null when the opening is in none of them (gate surfaces it). */
export function expectedOrientation(openingId: string): 'white' | 'black' | null {
  return openingRecord(openingId)?.color ?? null;
}
