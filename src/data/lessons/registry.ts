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
import repertoire from '../repertoire.json';

import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { RUY_TRAP_LESSONS } from './ruyTrapLessons';
import { PIRC_DEFENCE_LESSON } from './pircDefence';
import { PIRC_VARIATION_LESSONS } from './pircVariations';
import { VIENNA_GAME_LESSON } from './vienna';
import { VIENNA_VARIATION_LESSONS } from './viennaVariations';
import { VIENNA_TRAP_LESSONS } from './viennaTrapLessons';
import { CARO_KANN_LESSON } from './caroKann';
import { CARO_VARIATION_LESSONS } from './caroKannVariations';
import { CARO_TRAP_LESSONS } from './caroKannTrapLessons';
import { ITALIAN_GAME_LESSON } from './italianGame';
import { ITALIAN_GAME_VARIATION_LESSONS } from './italianGameVariations';
import { ITALIAN_GAME_TRAP_LESSONS } from './italianGameTrapLessons';
import { SCOTCH_GAME_LESSON } from './scotchGame';
import { SCOTCH_GAME_VARIATION_LESSONS } from './scotchGameVariations';
import { SCOTCH_GAME_TRAP_LESSONS } from './scotchGameTrapLessons';
import { KINGS_GAMBIT_LESSON } from './kingsGambit';
import { KINGS_GAMBIT_VARIATION_LESSONS } from './kingsGambitVariations';
import { SICILIAN_DRAGON_LESSON } from './sicilianDragon';
import { SICILIAN_DRAGON_VARIATION_LESSONS } from './sicilianDragonVariations';

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

// ── Add a new masterclass opening HERE (and only here) ──────────────────
const OPENINGS: OpeningLessons[] = [
  { main: RUY_LOPEZ_LESSON, variations: RUY_VARIATION_LESSONS, traps: RUY_TRAP_LESSONS },
  { main: PIRC_DEFENCE_LESSON, variations: PIRC_VARIATION_LESSONS },
  { main: VIENNA_GAME_LESSON, variations: VIENNA_VARIATION_LESSONS, traps: VIENNA_TRAP_LESSONS },
  { main: CARO_KANN_LESSON, variations: CARO_VARIATION_LESSONS, traps: CARO_TRAP_LESSONS },
  { main: ITALIAN_GAME_LESSON, variations: ITALIAN_GAME_VARIATION_LESSONS, traps: ITALIAN_GAME_TRAP_LESSONS },
  { main: SCOTCH_GAME_LESSON, variations: SCOTCH_GAME_VARIATION_LESSONS, traps: SCOTCH_GAME_TRAP_LESSONS },
  { main: KINGS_GAMBIT_LESSON, variations: KINGS_GAMBIT_VARIATION_LESSONS },
  { main: SICILIAN_DRAGON_LESSON, variations: SICILIAN_DRAGON_VARIATION_LESSONS },
];

function build(): RegisteredLesson[] {
  const out: RegisteredLesson[] = [];
  for (const op of OPENINGS) {
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

const COLOR_BY_ID = new Map<string, 'white' | 'black'>(
  (repertoire as Array<{ id: string; color: 'white' | 'black' }>).map((o) => [o.id, o.color]),
);

/** The side the student plays for an opening, read from repertoire.json's
 *  `color` field — the DB-driven source of truth. Lessons must orient to
 *  this (white openings white-at-bottom, black openings black-at-bottom).
 *  Returns null when the opening isn't in the repertoire (gate surfaces it). */
export function expectedOrientation(openingId: string): 'white' | 'black' | null {
  return COLOR_BY_ID.get(openingId) ?? null;
}
