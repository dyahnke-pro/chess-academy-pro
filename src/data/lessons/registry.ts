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
import gambits from '../gambits.json';

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
import { FRENCH_DEFENCE_LESSON } from './frenchDefence';
import { FRENCH_DEFENCE_VARIATION_LESSONS } from './frenchDefenceVariations';
import { SCANDINAVIAN_DEFENCE_LESSON } from './scandinavianDefence';
import { SCANDINAVIAN_DEFENCE_VARIATION_LESSONS } from './scandinavianDefenceVariations';
import { ALEKHINE_DEFENCE_LESSON } from './alekhineDefence';
import { ALEKHINE_DEFENCE_VARIATION_LESSONS } from './alekhineDefenceVariations';
import { BENKO_GAMBIT_LESSON } from './benkoGambit';
import { BENKO_GAMBIT_VARIATION_LESSONS } from './benkoGambitVariations';
import { DUTCH_DEFENCE_LESSON } from './dutchDefence';
import { DUTCH_DEFENCE_VARIATION_LESSONS } from './dutchDefenceVariations';
import { NIMZO_INDIAN_LESSON } from './nimzoIndian';
import { NIMZO_INDIAN_VARIATION_LESSONS } from './nimzoIndianVariations';
import { KINGS_GAMBIT_LESSON } from './kingsGambit';
import { KINGS_GAMBIT_VARIATION_LESSONS } from './kingsGambitVariations';
import { SICILIAN_DRAGON_LESSON } from './sicilianDragon';
import { SICILIAN_DRAGON_VARIATION_LESSONS } from './sicilianDragonVariations';
import { FOUR_KNIGHTS_GAME_LESSON } from './fourKnightsGame';
import { FOUR_KNIGHTS_GAME_VARIATION_LESSONS } from './fourKnightsGameVariations';
import { LONDON_SYSTEM_LESSON } from './londonSystem';
import { LONDON_SYSTEM_VARIATION_LESSONS } from './londonSystemVariations';
import { CATALAN_OPENING_LESSON } from './catalanOpening';
import { CATALAN_OPENING_VARIATION_LESSONS } from './catalanOpeningVariations';
import { ENGLISH_OPENING_LESSON } from './englishOpening';
import { ENGLISH_OPENING_VARIATION_LESSONS } from './englishOpeningVariations';
import { RETI_OPENING_LESSON } from './retiOpening';
import { RETI_OPENING_VARIATION_LESSONS } from './retiOpeningVariations';
import { KINGS_INDIAN_ATTACK_LESSON } from './kingsIndianAttack';
import { KINGS_INDIAN_ATTACK_VARIATION_LESSONS } from './kingsIndianAttackVariations';
import { EVANS_GAMBIT_LESSON } from './evansGambit';
import { EVANS_GAMBIT_VARIATION_LESSONS } from './evansGambitVariations';
import { SICILIAN_NAJDORF_LESSON } from './sicilianNajdorf';
import { SICILIAN_NAJDORF_VARIATION_LESSONS } from './sicilianNajdorfVariations';
import { SICILIAN_SVESHNIKOV_LESSON } from './sicilianSveshnikov';
import { SICILIAN_SVESHNIKOV_VARIATION_LESSONS } from './sicilianSveshnikovVariations';
import { SICILIAN_ALAPIN_LESSON } from './sicilianAlapin';
import { SICILIAN_ALAPIN_VARIATION_LESSONS } from './sicilianAlapinVariations';
import { PETROV_DEFENCE_LESSON } from './petrovDefence';
import { PETROV_DEFENCE_VARIATION_LESSONS } from './petrovDefenceVariations';
import { PHILIDOR_DEFENCE_LESSON } from './philidorDefence';
import { PHILIDOR_DEFENCE_VARIATION_LESSONS } from './philidorDefenceVariations';
import { QGD_LESSON } from './qgd';
import { QGD_VARIATION_LESSONS } from './qgdVariations';
import { QGA_LESSON } from './queensGambitAccepted';
import { QGA_VARIATION_LESSONS } from './queensGambitAcceptedVariations';
import { SLAV_DEFENCE_LESSON } from './slavDefence';
import { SLAV_DEFENCE_VARIATION_LESSONS } from './slavDefenceVariations';
import { SEMI_SLAV_LESSON } from './semiSlav';
import { SEMI_SLAV_VARIATION_LESSONS } from './semiSlavVariations';
import { KINGS_INDIAN_DEFENCE_LESSON } from './kingsIndianDefence';
import { KINGS_INDIAN_DEFENCE_VARIATION_LESSONS } from './kingsIndianDefenceVariations';
import { GRUNFELD_DEFENCE_LESSON } from './grunfeldDefence';
import { GRUNFELD_DEFENCE_VARIATION_LESSONS } from './grunfeldDefenceVariations';
import { BENONI_DEFENCE_LESSON } from './benoniDefence';
import { BENONI_DEFENCE_VARIATION_LESSONS } from './benoniDefenceVariations';
import { QUEENS_INDIAN_DEFENCE_LESSON } from './queensIndianDefence';
import { QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS } from './queensIndianDefenceVariations';
import { OLD_INDIAN_DEFENCE_LESSON } from './oldIndianDefence';
import { OLD_INDIAN_DEFENCE_VARIATION_LESSONS } from './oldIndianDefenceVariations';
import { TWO_KNIGHTS_DEFENCE_LESSON } from './twoKnightsDefence';
import { TWO_KNIGHTS_DEFENCE_VARIATION_LESSONS } from './twoKnightsDefenceVariations';
import { BUDAPEST_GAMBIT_LESSON } from './budapestGambit';
import { BUDAPEST_GAMBIT_VARIATION_LESSONS } from './budapestGambitVariations';
import { ALBIN_COUNTERGAMBIT_LESSON } from './albinCountergambit';
import { ALBIN_COUNTERGAMBIT_VARIATION_LESSONS } from './albinCountergambitVariations';
import { SCHLIEMANN_DEFENCE_LESSON } from './schliemannDefence';
import { SCHLIEMANN_DEFENCE_VARIATION_LESSONS } from './schliemannDefenceVariations';
import { QUEENS_GAMBIT_LESSON } from './queensGambit';
import { QUEENS_GAMBIT_VARIATION_LESSONS } from './queensGambitVariations';
import { TROMPOWSKY_ATTACK_LESSON } from './trompowskyAttack';
import { TROMPOWSKY_ATTACK_VARIATION_LESSONS } from './trompowskyAttackVariations';
import { BIRDS_OPENING_LESSON } from './birdsOpening';
import { BIRDS_OPENING_VARIATION_LESSONS } from './birdsOpeningVariations';
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

// ── Add a new masterclass opening HERE (and only here) ──────────────────
const OPENINGS: OpeningLessons[] = [
  { main: RUY_LOPEZ_LESSON, variations: RUY_VARIATION_LESSONS, traps: RUY_TRAP_LESSONS },
  { main: PIRC_DEFENCE_LESSON, variations: PIRC_VARIATION_LESSONS },
  { main: VIENNA_GAME_LESSON, variations: VIENNA_VARIATION_LESSONS, traps: VIENNA_TRAP_LESSONS },
  { main: CARO_KANN_LESSON, variations: CARO_VARIATION_LESSONS, traps: CARO_TRAP_LESSONS },
  { main: ITALIAN_GAME_LESSON, variations: ITALIAN_GAME_VARIATION_LESSONS, traps: ITALIAN_GAME_TRAP_LESSONS },
  { main: SCOTCH_GAME_LESSON, variations: SCOTCH_GAME_VARIATION_LESSONS, traps: SCOTCH_GAME_TRAP_LESSONS },
  { main: FRENCH_DEFENCE_LESSON, variations: FRENCH_DEFENCE_VARIATION_LESSONS },
  { main: SCANDINAVIAN_DEFENCE_LESSON, variations: SCANDINAVIAN_DEFENCE_VARIATION_LESSONS },
  { main: ALEKHINE_DEFENCE_LESSON, variations: ALEKHINE_DEFENCE_VARIATION_LESSONS },
  { main: BENKO_GAMBIT_LESSON, variations: BENKO_GAMBIT_VARIATION_LESSONS },
  { main: DUTCH_DEFENCE_LESSON, variations: DUTCH_DEFENCE_VARIATION_LESSONS },
  { main: KINGS_GAMBIT_LESSON, variations: KINGS_GAMBIT_VARIATION_LESSONS },
  { main: SICILIAN_DRAGON_LESSON, variations: SICILIAN_DRAGON_VARIATION_LESSONS },
  { main: FOUR_KNIGHTS_GAME_LESSON, variations: FOUR_KNIGHTS_GAME_VARIATION_LESSONS },
  { main: LONDON_SYSTEM_LESSON, variations: LONDON_SYSTEM_VARIATION_LESSONS },
  { main: CATALAN_OPENING_LESSON, variations: CATALAN_OPENING_VARIATION_LESSONS },
  { main: ENGLISH_OPENING_LESSON, variations: ENGLISH_OPENING_VARIATION_LESSONS },
  { main: RETI_OPENING_LESSON, variations: RETI_OPENING_VARIATION_LESSONS },
  { main: KINGS_INDIAN_ATTACK_LESSON, variations: KINGS_INDIAN_ATTACK_VARIATION_LESSONS },
  { main: EVANS_GAMBIT_LESSON, variations: EVANS_GAMBIT_VARIATION_LESSONS },
  { main: SICILIAN_NAJDORF_LESSON, variations: SICILIAN_NAJDORF_VARIATION_LESSONS },
  { main: SICILIAN_SVESHNIKOV_LESSON, variations: SICILIAN_SVESHNIKOV_VARIATION_LESSONS },
  { main: SICILIAN_ALAPIN_LESSON, variations: SICILIAN_ALAPIN_VARIATION_LESSONS },
  { main: NIMZO_INDIAN_LESSON, variations: NIMZO_INDIAN_VARIATION_LESSONS },
  { main: PETROV_DEFENCE_LESSON, variations: PETROV_DEFENCE_VARIATION_LESSONS },
  { main: PHILIDOR_DEFENCE_LESSON, variations: PHILIDOR_DEFENCE_VARIATION_LESSONS },
  { main: QGD_LESSON, variations: QGD_VARIATION_LESSONS },
  { main: QGA_LESSON, variations: QGA_VARIATION_LESSONS },
  { main: SLAV_DEFENCE_LESSON, variations: SLAV_DEFENCE_VARIATION_LESSONS },
  { main: SEMI_SLAV_LESSON, variations: SEMI_SLAV_VARIATION_LESSONS },
  { main: KINGS_INDIAN_DEFENCE_LESSON, variations: KINGS_INDIAN_DEFENCE_VARIATION_LESSONS },
  { main: GRUNFELD_DEFENCE_LESSON, variations: GRUNFELD_DEFENCE_VARIATION_LESSONS },
  { main: BENONI_DEFENCE_LESSON, variations: BENONI_DEFENCE_VARIATION_LESSONS },
  { main: QUEENS_INDIAN_DEFENCE_LESSON, variations: QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS },
  { main: OLD_INDIAN_DEFENCE_LESSON, variations: OLD_INDIAN_DEFENCE_VARIATION_LESSONS },
  { main: TWO_KNIGHTS_DEFENCE_LESSON, variations: TWO_KNIGHTS_DEFENCE_VARIATION_LESSONS },
  { main: BUDAPEST_GAMBIT_LESSON, variations: BUDAPEST_GAMBIT_VARIATION_LESSONS },
  { main: ALBIN_COUNTERGAMBIT_LESSON, variations: ALBIN_COUNTERGAMBIT_VARIATION_LESSONS },
  { main: SCHLIEMANN_DEFENCE_LESSON, variations: SCHLIEMANN_DEFENCE_VARIATION_LESSONS },
  { main: QUEENS_GAMBIT_LESSON, variations: QUEENS_GAMBIT_VARIATION_LESSONS },
  { main: TROMPOWSKY_ATTACK_LESSON, variations: TROMPOWSKY_ATTACK_VARIATION_LESSONS },
  { main: BIRDS_OPENING_LESSON, variations: BIRDS_OPENING_VARIATION_LESSONS },
];

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

// Orientation source of truth = the opening's `color` field. Most lessons
// map to a repertoire.json entry; the gambit-tab lessons map to gambits.json
// (same `color` shape). Both feed the Dexie openings store, so both are
// valid orientation sources for the gate.
const COLOR_BY_ID = new Map<string, 'white' | 'black'>([
  ...(repertoire as Array<{ id: string; color: 'white' | 'black' }>).map(
    (o) => [o.id, o.color] as const,
  ),
  ...(gambits as Array<{ id: string; color: 'white' | 'black' }>).map(
    (o) => [o.id, o.color] as const,
  ),
]);

/** The side the student plays for an opening, read from the opening's
 *  `color` field (repertoire.json or gambits.json) — the DB-driven source of
 *  truth. Lessons must orient to this (white openings white-at-bottom, black
 *  openings black-at-bottom). Returns null when the opening is in neither
 *  source (gate surfaces it). */
export function expectedOrientation(openingId: string): 'white' | 'black' | null {
  return COLOR_BY_ID.get(openingId) ?? null;
}
