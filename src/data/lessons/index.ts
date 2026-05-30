import { Chess } from 'chess.js';
import type { LessonScript, AnnotationArrow, AnnotationHighlight, PlayableMiddlegameLine } from '../../types';
import { PRO_NARODITSKY_CARO_KANN_LESSON } from './proNaroditskyCaroKann';
import { PRO_GOTHAMCHESS_CARO_ADVANCE_LESSON } from './proGothamchessCaroAdvance';
import { PRO_GOTHAMCHESS_ITALIAN_LESSON } from './proGothamchessItalian';
import { PRO_GOTHAMCHESS_LONDON_LESSON } from './proGothamchessLondon';
import { PRO_GOTHAMCHESS_VIENNA_LESSON } from './proGothamchessVienna';
import { PRO_GOTHAMCHESS_TROMPOWSKY_LESSON } from './proGothamchessTrompowsky';
import { PRO_GOTHAMCHESS_ENGLISH_LESSON } from './proGothamchessEnglish';
import { PRO_GOTHAMCHESS_PONZIANI_LESSON } from './proGothamchessPonziani';
import { PRO_GOTHAMCHESS_MILNER_BARRY_LESSON } from './proGothamchessMilnerBarry';
import { PRO_GOTHAMCHESS_FANTASY_CARO_LESSON } from './proGothamchessFantasyCaro';
import { PRO_GOTHAMCHESS_STAFFORD_REFUTE_LESSON } from './proGothamchessStaffordRefute';
import { PRO_GOTHAMCHESS_CARO_KANN_LESSON } from './proGothamchessCaroKann';
import { PRO_GOTHAMCHESS_SCANDINAVIAN_LESSON } from './proGothamchessScandinavian';
import { PRO_GOTHAMCHESS_QGD_LESSON } from './proGothamchessQGD';
import { PRO_GOTHAMCHESS_ANTI_SICILIAN_LESSON } from './proGothamchessAntiSicilian';
import { PRO_GOTHAMCHESS_KIA_LESSON } from './proGothamchessKIA';
import { PRO_GOTHAMCHESS_CLOSED_SICILIAN_LESSON } from './proGothamchessClosedSicilian';
import { PRO_GOTHAMCHESS_FRENCH_DEFENSE_LESSON } from './proGothamchessFrenchDefense';
import { PRO_GOTHAMCHESS_PIRC_DEFENSE_LESSON } from './proGothamchessPircDefense';
import { PRO_GOTHAMCHESS_CARO_ADVANCE_VARIATION_LESSONS } from './proGothamchessCaroAdvanceVariations';
import { PRO_GOTHAMCHESS_ITALIAN_VARIATION_LESSONS } from './proGothamchessItalianVariations';
import { PRO_GOTHAMCHESS_LONDON_VARIATION_LESSONS } from './proGothamchessLondonVariations';
import { PRO_GOTHAMCHESS_VIENNA_VARIATION_LESSONS } from './proGothamchessViennaVariations';
import { PRO_GOTHAMCHESS_TROMPOWSKY_VARIATION_LESSONS } from './proGothamchessTrompowskyVariations';
import { PRO_GOTHAMCHESS_ENGLISH_VARIATION_LESSONS } from './proGothamchessEnglishVariations';
import { PRO_NARODITSKY_CARO_KANN_VARIATION_LESSONS } from './proNaroditskyCaroKannVariations';
import { PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS } from './proNaroditskyAlapinVariations';
import { PRO_NARODITSKY_KID_VARIATION_LESSONS } from './proNaroditskyKIDVariations';
import { PRO_NARODITSKY_KIA_VARIATION_LESSONS } from './proNaroditskyKIAVariations';
import { PRO_NARODITSKY_ROSSOLIMO_VARIATION_LESSONS } from './proNaroditskyRossolimoVariations';
import { PRO_NARODITSKY_NAJDORF_VARIATION_LESSONS } from './proNaroditskyNajdorfVariations';
import { PRO_NARODITSKY_RUY_VARIATION_LESSONS } from './proNaroditskyRuyVariations';
import { PRO_NARODITSKY_ALEKHINE_VARIATION_LESSONS } from './proNaroditskyAlekhineVariations';
import { PRO_NARODITSKY_JOBAVA_VARIATION_LESSONS } from './proNaroditskyJobavaVariations';
import {
  PRO_NAR_ALAPIN_LESSON, PRO_NAR_NAJDORF_LESSON, PRO_NAR_KID_LESSON,
  PRO_NAR_ALEKHINE_LESSON, PRO_NAR_KIA_LESSON, PRO_NAR_ROSSOLIMO_LESSON,
  PRO_NAR_JOBAVA_LESSON, PRO_NAR_RUY_LESSON,
} from './proNaroditskyAllRemaining';
import { PRO_NAR_FANTASY_CARO_LESSON } from './proNaroditskyFantasyCaro';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';
import { PIRC_DEFENCE_LESSON } from './pircDefence';
import { PIRC_VARIATION_LESSONS } from './pircVariations';
import { VIENNA_GAME_LESSON } from './vienna';
import { VIENNA_VARIATION_LESSONS } from './viennaVariations';
import { CARO_KANN_LESSON } from './caroKann';
import { CARO_VARIATION_LESSONS } from './caroKannVariations';
import { ITALIAN_GAME_LESSON } from './italianGame';
import { ITALIAN_GAME_VARIATION_LESSONS } from './italianGameVariations';
import { SCOTCH_GAME_LESSON } from './scotchGame';
import { SCOTCH_GAME_VARIATION_LESSONS } from './scotchGameVariations';
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
import { resolveOpeningIdFromName } from '../../services/chessConceptService';
import repertoire from '../repertoire.json';

/**
 * Registry of story-first master-class lessons.
 *
 * - LESSONS: keyed by openingId — the main-line master class, launched
 *   from an opening's "Watch" entry.
 * - VARIATION_LESSONS: keyed by `${openingId}::${variationName}` — a
 *   subline's own master class. NOTE: the Ruy subline scripts below are
 *   authored but not yet wired into a launch path (and pending a line-by
 *   -line chess verification pass), so they are inert until then.
 *
 * When a script exists, the openings surface plays the LessonPlayer
 * instead of the move-by-move WalkthroughMode.
 */
const LESSONS: Record<string, LessonScript> = {
  [RUY_LOPEZ_LESSON.openingId]: RUY_LOPEZ_LESSON,
  [PIRC_DEFENCE_LESSON.openingId]: PIRC_DEFENCE_LESSON,
  [VIENNA_GAME_LESSON.openingId]: VIENNA_GAME_LESSON,
  [CARO_KANN_LESSON.openingId]: CARO_KANN_LESSON,
  [ITALIAN_GAME_LESSON.openingId]: ITALIAN_GAME_LESSON,
  [SCOTCH_GAME_LESSON.openingId]: SCOTCH_GAME_LESSON,
  [FRENCH_DEFENCE_LESSON.openingId]: FRENCH_DEFENCE_LESSON,
  [SCANDINAVIAN_DEFENCE_LESSON.openingId]: SCANDINAVIAN_DEFENCE_LESSON,
  [ALEKHINE_DEFENCE_LESSON.openingId]: ALEKHINE_DEFENCE_LESSON,
  [BENKO_GAMBIT_LESSON.openingId]: BENKO_GAMBIT_LESSON,
  [DUTCH_DEFENCE_LESSON.openingId]: DUTCH_DEFENCE_LESSON,
  [NIMZO_INDIAN_LESSON.openingId]: NIMZO_INDIAN_LESSON,
  [KINGS_GAMBIT_LESSON.openingId]: KINGS_GAMBIT_LESSON,
  [SICILIAN_DRAGON_LESSON.openingId]: SICILIAN_DRAGON_LESSON,
  [FOUR_KNIGHTS_GAME_LESSON.openingId]: FOUR_KNIGHTS_GAME_LESSON,
  [LONDON_SYSTEM_LESSON.openingId]: LONDON_SYSTEM_LESSON,
  [CATALAN_OPENING_LESSON.openingId]: CATALAN_OPENING_LESSON,
  [ENGLISH_OPENING_LESSON.openingId]: ENGLISH_OPENING_LESSON,
  [RETI_OPENING_LESSON.openingId]: RETI_OPENING_LESSON,
  [KINGS_INDIAN_ATTACK_LESSON.openingId]: KINGS_INDIAN_ATTACK_LESSON,
  [EVANS_GAMBIT_LESSON.openingId]: EVANS_GAMBIT_LESSON,
  [SICILIAN_NAJDORF_LESSON.openingId]: SICILIAN_NAJDORF_LESSON,
  [SICILIAN_SVESHNIKOV_LESSON.openingId]: SICILIAN_SVESHNIKOV_LESSON,
  [SICILIAN_ALAPIN_LESSON.openingId]: SICILIAN_ALAPIN_LESSON,
  [PETROV_DEFENCE_LESSON.openingId]: PETROV_DEFENCE_LESSON,
  [PHILIDOR_DEFENCE_LESSON.openingId]: PHILIDOR_DEFENCE_LESSON,
  [QGD_LESSON.openingId]: QGD_LESSON,
  [QGA_LESSON.openingId]: QGA_LESSON,
  [SLAV_DEFENCE_LESSON.openingId]: SLAV_DEFENCE_LESSON,
  [SEMI_SLAV_LESSON.openingId]: SEMI_SLAV_LESSON,
  [KINGS_INDIAN_DEFENCE_LESSON.openingId]: KINGS_INDIAN_DEFENCE_LESSON,
  [GRUNFELD_DEFENCE_LESSON.openingId]: GRUNFELD_DEFENCE_LESSON,
  [BENONI_DEFENCE_LESSON.openingId]: BENONI_DEFENCE_LESSON,
  [QUEENS_INDIAN_DEFENCE_LESSON.openingId]: QUEENS_INDIAN_DEFENCE_LESSON,
  [OLD_INDIAN_DEFENCE_LESSON.openingId]: OLD_INDIAN_DEFENCE_LESSON,
  [TWO_KNIGHTS_DEFENCE_LESSON.openingId]: TWO_KNIGHTS_DEFENCE_LESSON,
  [BUDAPEST_GAMBIT_LESSON.openingId]: BUDAPEST_GAMBIT_LESSON,
  [ALBIN_COUNTERGAMBIT_LESSON.openingId]: ALBIN_COUNTERGAMBIT_LESSON,
  [SCHLIEMANN_DEFENCE_LESSON.openingId]: SCHLIEMANN_DEFENCE_LESSON,
  [QUEENS_GAMBIT_LESSON.openingId]: QUEENS_GAMBIT_LESSON,
  [TROMPOWSKY_ATTACK_LESSON.openingId]: TROMPOWSKY_ATTACK_LESSON,
  [BIRDS_OPENING_LESSON.openingId]: BIRDS_OPENING_LESSON,
  // Pro repertoires — players' actual lines (PGN games = source of truth).
  // Registered HERE (runtime LESSONS map) but NOT in registry.ts's OPENINGS
  // (gate registry). Pro-rep doctrine has a different rule set from
  // masterclass: voice paraphrases the pro's recurring teaching framing
  // (sourced), spine derived from the player's actual game frequency
  // (not theory), and the masterclass-specific gates (depth, masters-
  // coverage, narration-grounding baselines, variation-tab coverage)
  // don't apply. The verbosity contract (G5 — long/short on every beat)
  // does apply and is enforced at the file level.
  [PRO_NARODITSKY_CARO_KANN_LESSON.openingId]: PRO_NARODITSKY_CARO_KANN_LESSON,
  [PRO_NAR_ALAPIN_LESSON.openingId]: PRO_NAR_ALAPIN_LESSON,
  [PRO_NAR_NAJDORF_LESSON.openingId]: PRO_NAR_NAJDORF_LESSON,
  [PRO_NAR_KID_LESSON.openingId]: PRO_NAR_KID_LESSON,
  [PRO_NAR_ALEKHINE_LESSON.openingId]: PRO_NAR_ALEKHINE_LESSON,
  [PRO_NAR_KIA_LESSON.openingId]: PRO_NAR_KIA_LESSON,
  [PRO_NAR_ROSSOLIMO_LESSON.openingId]: PRO_NAR_ROSSOLIMO_LESSON,
  [PRO_NAR_JOBAVA_LESSON.openingId]: PRO_NAR_JOBAVA_LESSON,
  [PRO_NAR_RUY_LESSON.openingId]: PRO_NAR_RUY_LESSON,
  [PRO_NAR_FANTASY_CARO_LESSON.openingId]: PRO_NAR_FANTASY_CARO_LESSON,
  // Pro GothamChess (Levy Rozman)
  [PRO_GOTHAMCHESS_CARO_ADVANCE_LESSON.openingId]: PRO_GOTHAMCHESS_CARO_ADVANCE_LESSON,
  [PRO_GOTHAMCHESS_ITALIAN_LESSON.openingId]: PRO_GOTHAMCHESS_ITALIAN_LESSON,
  [PRO_GOTHAMCHESS_LONDON_LESSON.openingId]: PRO_GOTHAMCHESS_LONDON_LESSON,
  [PRO_GOTHAMCHESS_VIENNA_LESSON.openingId]: PRO_GOTHAMCHESS_VIENNA_LESSON,
  [PRO_GOTHAMCHESS_TROMPOWSKY_LESSON.openingId]: PRO_GOTHAMCHESS_TROMPOWSKY_LESSON,
  [PRO_GOTHAMCHESS_ENGLISH_LESSON.openingId]: PRO_GOTHAMCHESS_ENGLISH_LESSON,
  [PRO_GOTHAMCHESS_PONZIANI_LESSON.openingId]: PRO_GOTHAMCHESS_PONZIANI_LESSON,
  [PRO_GOTHAMCHESS_MILNER_BARRY_LESSON.openingId]: PRO_GOTHAMCHESS_MILNER_BARRY_LESSON,
  [PRO_GOTHAMCHESS_FANTASY_CARO_LESSON.openingId]: PRO_GOTHAMCHESS_FANTASY_CARO_LESSON,
  [PRO_GOTHAMCHESS_STAFFORD_REFUTE_LESSON.openingId]: PRO_GOTHAMCHESS_STAFFORD_REFUTE_LESSON,
  [PRO_GOTHAMCHESS_CARO_KANN_LESSON.openingId]: PRO_GOTHAMCHESS_CARO_KANN_LESSON,
  [PRO_GOTHAMCHESS_SCANDINAVIAN_LESSON.openingId]: PRO_GOTHAMCHESS_SCANDINAVIAN_LESSON,
  [PRO_GOTHAMCHESS_QGD_LESSON.openingId]: PRO_GOTHAMCHESS_QGD_LESSON,
  [PRO_GOTHAMCHESS_ANTI_SICILIAN_LESSON.openingId]: PRO_GOTHAMCHESS_ANTI_SICILIAN_LESSON,
  [PRO_GOTHAMCHESS_KIA_LESSON.openingId]: PRO_GOTHAMCHESS_KIA_LESSON,
  [PRO_GOTHAMCHESS_CLOSED_SICILIAN_LESSON.openingId]: PRO_GOTHAMCHESS_CLOSED_SICILIAN_LESSON,
  [PRO_GOTHAMCHESS_FRENCH_DEFENSE_LESSON.openingId]: PRO_GOTHAMCHESS_FRENCH_DEFENSE_LESSON,
  [PRO_GOTHAMCHESS_PIRC_DEFENSE_LESSON.openingId]: PRO_GOTHAMCHESS_PIRC_DEFENSE_LESSON,
};

const VARIATION_LESSONS: Record<string, LessonScript> = {
  ...RUY_VARIATION_LESSONS,
  ...PIRC_VARIATION_LESSONS,
  ...VIENNA_VARIATION_LESSONS,
  ...CARO_VARIATION_LESSONS,
  ...ITALIAN_GAME_VARIATION_LESSONS,
  ...SCOTCH_GAME_VARIATION_LESSONS,
  ...FRENCH_DEFENCE_VARIATION_LESSONS,
  ...SCANDINAVIAN_DEFENCE_VARIATION_LESSONS,
  ...ALEKHINE_DEFENCE_VARIATION_LESSONS,
  ...BENKO_GAMBIT_VARIATION_LESSONS,
  ...DUTCH_DEFENCE_VARIATION_LESSONS,
  ...NIMZO_INDIAN_VARIATION_LESSONS,
  ...KINGS_GAMBIT_VARIATION_LESSONS,
  ...SICILIAN_DRAGON_VARIATION_LESSONS,
  ...FOUR_KNIGHTS_GAME_VARIATION_LESSONS,
  ...LONDON_SYSTEM_VARIATION_LESSONS,
  ...CATALAN_OPENING_VARIATION_LESSONS,
  ...ENGLISH_OPENING_VARIATION_LESSONS,
  ...RETI_OPENING_VARIATION_LESSONS,
  ...KINGS_INDIAN_ATTACK_VARIATION_LESSONS,
  ...EVANS_GAMBIT_VARIATION_LESSONS,
  ...SICILIAN_NAJDORF_VARIATION_LESSONS,
  ...SICILIAN_SVESHNIKOV_VARIATION_LESSONS,
  ...SICILIAN_ALAPIN_VARIATION_LESSONS,
  ...PETROV_DEFENCE_VARIATION_LESSONS,
  ...PHILIDOR_DEFENCE_VARIATION_LESSONS,
  ...QGD_VARIATION_LESSONS,
  ...QGA_VARIATION_LESSONS,
  ...SLAV_DEFENCE_VARIATION_LESSONS,
  ...SEMI_SLAV_VARIATION_LESSONS,
  ...KINGS_INDIAN_DEFENCE_VARIATION_LESSONS,
  ...GRUNFELD_DEFENCE_VARIATION_LESSONS,
  ...BENONI_DEFENCE_VARIATION_LESSONS,
  ...QUEENS_INDIAN_DEFENCE_VARIATION_LESSONS,
  ...OLD_INDIAN_DEFENCE_VARIATION_LESSONS,
  ...TWO_KNIGHTS_DEFENCE_VARIATION_LESSONS,
  ...BUDAPEST_GAMBIT_VARIATION_LESSONS,
  ...ALBIN_COUNTERGAMBIT_VARIATION_LESSONS,
  ...SCHLIEMANN_DEFENCE_VARIATION_LESSONS,
  ...QUEENS_GAMBIT_VARIATION_LESSONS,
  ...TROMPOWSKY_ATTACK_VARIATION_LESSONS,
  ...BIRDS_OPENING_VARIATION_LESSONS,
  // Pro repertoires
  ...PRO_NARODITSKY_CARO_KANN_VARIATION_LESSONS,
  ...PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS,
  ...PRO_NARODITSKY_KID_VARIATION_LESSONS,
  ...PRO_NARODITSKY_KIA_VARIATION_LESSONS,
  ...PRO_NARODITSKY_ROSSOLIMO_VARIATION_LESSONS,
  ...PRO_NARODITSKY_NAJDORF_VARIATION_LESSONS,
  ...PRO_NARODITSKY_RUY_VARIATION_LESSONS,
  ...PRO_NARODITSKY_ALEKHINE_VARIATION_LESSONS,
  ...PRO_NARODITSKY_JOBAVA_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_CARO_ADVANCE_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_ITALIAN_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_LONDON_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_VIENNA_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_TROMPOWSKY_VARIATION_LESSONS,
  ...PRO_GOTHAMCHESS_ENGLISH_VARIATION_LESSONS,
};

export function getLessonScript(openingId: string | undefined | null): LessonScript | null {
  if (!openingId) return null;
  return LESSONS[openingId] ?? null;
}

export function hasLessonScript(openingId: string | undefined | null): boolean {
  return getLessonScript(openingId) !== null;
}

/** All registered variation-lesson keys ('<openingId>::<variationName>').
 *  Exported for the orphan-lesson gate test — DO NOT use for runtime
 *  routing (prefer getVariationLessonScript). */
export function getAllVariationLessonKeys(): string[] {
  return Object.keys(VARIATION_LESSONS);
}

/** Every registered lesson (main-line + variations) with its registry key.
 *  Exported for build-time tooling (the lesson-tail diagnostic) and gate
 *  tests — NOT for runtime routing. The key is the openingId for main lessons
 *  and '<openingId>::<variationName>' for variations. */
export function getAllLessonScripts(): Array<{ key: string; lesson: LessonScript }> {
  return [
    ...Object.entries(LESSONS).map(([key, lesson]) => ({ key, lesson })),
    ...Object.entries(VARIATION_LESSONS).map(([key, lesson]) => ({ key, lesson })),
  ];
}

export function getVariationLessonScript(
  openingId: string | undefined | null,
  variationName: string | undefined | null,
): LessonScript | null {
  if (!openingId || !variationName) return null;
  return VARIATION_LESSONS[`${openingId}::${variationName}`] ?? null;
}

// Distinctive keywords that signal a student is asking about a specific
// subline (used to pull that subline's master-class ideas into the coach's
// reference context).
const VARIATION_KEYWORDS: Record<string, string[]> = {
  'ruy-lopez::Berlin Defense': ['berlin'],
  'ruy-lopez::Open Ruy Lopez': ['open ruy', 'open spanish', 'open lopez', 'open variation', 'open defen'],
  'ruy-lopez::Marshall Attack': ['marshall attack', 'the marshall', 'marshall gambit'],
  'ruy-lopez::Exchange Variation': ['exchange variation', 'exchange ruy', 'exchange spanish'],
  'ruy-lopez::Closed Ruy Lopez (Breyer)': ['breyer'],
  'ruy-lopez::Closed Ruy Lopez (Chigorin)': ['chigorin'],
  'ruy-lopez::Closed Ruy Lopez (Zaitsev)': ['zaitsev'],
  'ruy-lopez::Anti-Marshall (8.a4)': ['anti-marshall', 'anti marshall', 'antimarshall'],
  'ruy-lopez::Arkhangelsk Variation': ['arkhangelsk', 'archangelsk', 'arkhangel'],
  'pirc-defence::Austrian Attack': ['austrian attack', 'austrian'],
  'pirc-defence::Classical System': ['classical pirc', 'pirc classical'],
  'pirc-defence::150 Attack': ['150 attack', '150-attack'],
  'vienna-game::Vienna Gambit': ['vienna gambit', 'gambit vienna', 'vienna f4', '3.f4 vienna'],
  'vienna-game::Vienna vs 2...Nc6': ['vienna nc6', 'vs nc6 vienna', 'hamppe-allgaier', 'hamppe muzio', 'pierce gambit', 'steinitz gambit'],
  'vienna-game::Frankenstein-Dracula': ['frankenstein-dracula', 'frankenstein dracula', 'nxa8 raid', 'qh5 vienna'],
  'vienna-game::Paulsen Attack': ['paulsen vienna', 'vienna g3', '3.g3 vienna', 'vienna fianchetto'],
};

/**
 * Build a compact REFERENCE block of the master-class teaching ideas for
 * any opening (and named subline) the student is asking about. Injected
 * into the coach's system prompt so its answers stay consistent with the
 * verified, book-grounded master classes — WITHOUT forcing the coach to
 * lecture. Returns '' when nothing relevant is mentioned.
 */
export function buildLessonReferenceBlock(text: string | undefined | null): string {
  if (!text) return '';
  const lower = text.toLowerCase();
  const picked: LessonScript[] = [];
  const seen = new Set<string>();
  const add = (l: LessonScript | null | undefined): void => {
    if (l && !seen.has(l.title)) { seen.add(l.title); picked.push(l); }
  };

  // Named sublines first (more specific), then the main opening.
  for (const [key, kws] of Object.entries(VARIATION_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) add(VARIATION_LESSONS[key]);
  }
  const id = resolveOpeningIdFromName(text);
  if (id) add(LESSONS[id]);

  if (picked.length === 0) return '';

  const sections = picked.slice(0, 3).map((l) => {
    const ideas = l.beats
      .map((bt) => bt.sayShort ?? bt.say)
      .filter(Boolean)
      .map((s) => `• ${s}`)
      .join('\n');
    return `${l.title}\n${ideas}`;
  });

  return [
    '[MASTER-CLASS REFERENCE — verified teaching material]',
    "Key ideas from this app's Stockfish-verified, book-grounded opening master classes (the student may have just watched one). Use them to keep your answer accurate and consistent when the student asks about these openings. This is REFERENCE to draw on — do NOT recite it verbatim or lecture unprompted; answer naturally and go deep only when asked.",
    '',
    sections.join('\n\n'),
  ].join('\n');
}


// ─── Course-scoped coach (David 2026-05-22) ─────────────────────────────
//
// On a masterclass surface the coach must KNOW which course/variation the
// student is inside, so it stays on target instead of wandering into a
// random opening. `buildCourseScope` turns an openingId (+ optional
// variation tab) into a system-prompt addition + an opening greeting. The
// caller passes `systemAddition` as the 2nd arg of getCoachChatResponse
// (the same slot MiddlegamePractice uses for its plan context) — so this
// needs NO change to the coach API. Scoping is explicit (by tab), not
// text-matched, so "what's the plan here?" under the Caro tab still anchors
// the coach to the Caro.

interface RepertoireLite { id: string; name: string; color: 'white' | 'black'; keyIdeas?: string[]; pgn?: string; variations?: { name: string; pgn?: string }[] }
const REPERTOIRE = repertoire as RepertoireLite[];

/** The position the scoped line reaches, so the coach chat is anchored to
 *  the actual resulting board — not move 1. Computed from the real line PGN
 *  (DB-canonical), never invented; null if the PGN is missing/unparseable. */
function finalFenForLine(linePgn: string | undefined): string | null {
  if (!linePgn?.trim()) return null;
  try {
    const c = new Chess();
    c.loadPgn(linePgn);
    return c.fen();
  } catch {
    return null;
  }
}

export interface CourseScope {
  /** Pass as getCoachChatResponse's `systemAddition` arg. */
  systemAddition: string;
  /** Opening greeting that names the course, e.g. shown when chat opens. */
  greeting: string;
  /** Human label for the course (opening + variation). */
  label: string;
}

/** Build the coach's course-scope for a masterclass tab. Returns null when
 *  the opening isn't a known masterclass repertoire entry. */
export function buildCourseScope(
  openingId: string | undefined | null,
  variationName?: string | null,
): CourseScope | null {
  if (!openingId) return null;
  const op = REPERTOIRE.find((o) => o.id === openingId);
  if (!op) return null;

  const label = variationName ? `${op.name} — ${variationName}` : `${op.name} Main Line`;

  // Prefer the variation lesson's ideas, fall back to the main lesson, then
  // the curated repertoire keyIdeas. sayShort is the concise spoken idea.
  const lesson = (variationName && getVariationLessonScript(openingId, variationName)) || getLessonScript(openingId);
  const ideasFromLesson = lesson
    ? lesson.beats.map((b) => b.sayShort).filter((s): s is string => !!s)
    : [];
  const ideas = (ideasFromLesson.length ? ideasFromLesson : op.keyIdeas ?? []).slice(0, 6);

  const ideaBlock = ideas.length ? `\nVerified ideas for this line (draw on these, don't recite):\n${ideas.map((i) => `• ${i}`).join('\n')}` : '';

  // Anchor the coach to the position THIS line reaches (not move 1), computed
  // from the real DB line PGN — main line or the selected variation.
  const linePgn = (variationName && op.variations?.find((v) => v.name === variationName)?.pgn) || op.pgn;
  const finalFen = finalFenForLine(linePgn);
  const positionBlock = finalFen
    ? `\nThe line reaches this position — treat it as the board in front of the student (they play ${op.color}):\n${finalFen}`
    : '';

  const systemAddition = [
    '[MASTERCLASS COURSE SCOPE]',
    `The student is inside an interactive masterclass for the ${label} (they play ${op.color}). Keep every answer focused on THIS opening and variation — its plans, move-order, structures, and the ideas below. If they ask about a different opening, answer briefly then steer back to the ${label}. Answer naturally; do not lecture unprompted.`,
    positionBlock,
    ideaBlock,
  ].join('\n');

  return { systemAddition, greeting: `What would you like to know about the ${label}?`, label };
}

// Convert any masterclass LessonScript into a PlayableMiddlegameLine so the
// WLPP Learn/Practice modes (PlayableLinePlayer) can drive it — voice guides,
// YOU play each move. WITHOUT this, Learn fell back to the LessonPlayer (the
// Watch auto-play), so "Learn === Watch" (the §1a bug). Same logic as the
// named-trap converter (getRuyTrapPlayableLine), generalised: take the
// deepest beat as the teaching line and carry each prefix beat's say + arrows
// + highlights VERBATIM onto the move it lands on.
const LESSON_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function lessonToPlayableLine(
  lesson: LessonScript | null | undefined,
): PlayableMiddlegameLine | null {
  if (!lesson || lesson.beats.length === 0) return null;
  let lineBeat = lesson.beats[0];
  for (const b of lesson.beats) if (b.moves.length > lineBeat.moves.length) lineBeat = b;
  const moves = lineBeat.moves;
  if (moves.length === 0) return null;
  const annotations: string[] = moves.map(() => '');
  const arrows: AnnotationArrow[][] = moves.map(() => []);
  const highlights: AnnotationHighlight[][] = moves.map(() => []);
  // Learn cues = the beat's hand-written short line (David 2026-05-24: the
  // top-row variation Learn tabs reinforce the Watch lesson, not just dictate
  // moves). Lands on the beat-boundary ply; '' elsewhere → plain dictation.
  const learnCues: string[] = moves.map(() => '');
  for (const beat of lesson.beats) {
    if (beat.moves.length > moves.length) continue;
    if (!beat.moves.every((m, i) => m === moves[i])) continue;
    const ply = beat.moves.length - 1;
    if (ply < 0) continue;
    annotations[ply] = beat.say;
    if (beat.sayShort) learnCues[ply] = beat.sayShort;
    if (beat.arrows) arrows[ply] = beat.arrows;
    if (beat.highlights) highlights[ply] = beat.highlights;
  }
  return { fen: LESSON_START_FEN, moves, annotations, arrows, highlights, learnCues, title: lesson.title };
}
