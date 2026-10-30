// tabPlans — WHICH HAND-WRITTEN PLANS A TAB OWNS, and the one anchored where
// its line's middlegame starts (the tabia). Moved out of OpeningDetailPage
// (2026-10-29) so the page and the tab-plan measure
// (`scripts/all-openings/tab-plan-coverage.ts`) read ONE resolver chain — a
// measure that re-typed the chain would drift from the page it measures.
//
// Curated openings use HAND-PICKED plan tables (no algo show-all). Others fall
// back: a variation → its own `mp-<id>-<tab>` plan, the main line → every
// plan of the opening.
import type { MiddlegamePlan } from '../types';
import { samePosition } from '../utils/samePosition';
import { isMiddlegameBoard } from './gamesCourse';
import { getRuyTabPlanIds } from './ruyMasterclassTabs';
import { getPircTabPlanIds } from './pircMasterclassTabs';
import { getViennaTabPlanIds } from './viennaMasterclassTabs';
import { getItalianTabPlanIds } from './italianMasterclassTabs';
import { getScotchTabPlanIds } from './scotchMasterclassTabs';
import { getFrenchDefenceTabPlanIds } from './frenchDefenceMasterclassTabs';
import { getScandinavianDefenceTabPlanIds } from './scandinavianDefenceMasterclassTabs';
import { getAlekhineDefenceTabPlanIds } from './alekhineDefenceMasterclassTabs';
import { getBenkoGambitTabPlanIds } from './benkoGambitMasterclassTabs';
import { getDutchDefenceTabPlanIds } from './dutchDefenceMasterclassTabs';
import { getNimzoIndianTabPlanIds } from './nimzoIndianMasterclassTabs';
import { getCaroKannTabPlanIds } from './caroKannMasterclassTabs';
import { getKingsGambitTabPlanIds } from './kingsGambitMasterclassTabs';
import { getSicilianDragonTabPlanIds } from './sicilianDragonMasterclassTabs';
import { getFourKnightsTabPlanIds } from './fourKnightsMasterclassTabs';
import { getGlekSystemTabPlanIds } from './glekSystemMasterclassTabs';
import { getLondonTabPlanIds } from './londonMasterclassTabs';
import { getCatalanTabPlanIds } from './catalanMasterclassTabs';
import { getEnglishTabPlanIds } from './englishMasterclassTabs';
import { getRetiTabPlanIds } from './retiMasterclassTabs';
import { getKiaTabPlanIds } from './kiaMasterclassTabs';
import { getEvansTabPlanIds } from './evansMasterclassTabs';
import { getSicilianNajdorfTabPlanIds } from './sicilianNajdorfMasterclassTabs';
import { getSicilianSveshnikovTabPlanIds } from './sicilianSveshnikovMasterclassTabs';
import { getSicilianAlapinTabPlanIds } from './sicilianAlapinMasterclassTabs';
import { getProNaroditskyAlapinTabPlanIds } from './proNaroditskyAlapinTabPlans';
import { getProNaroditskyKIDTabPlanIds } from './proNaroditskyKIDTabPlans';
import { getProNaroditskyRemainingTabPlanIds } from './proNaroditskyRemainingTabPlans';
import { getProNaroditskyCaroTabPlanIds } from './proNaroditskyCaroTabPlans';
import { getProCaruanaNajdorfTabPlanIds } from './proCaruanaNajdorfTabPlans';
import { getProEricRosenStaffordTabPlanIds } from './proEricRosenStaffordTabPlans';
import { getProEricRosenLondonTabPlanIds } from './proEricRosenLondonTabPlans';
import { getProEricRosenSicilianTabPlanIds } from './proEricRosenSicilianTabPlans';
import { getProEricRosenQGDTabPlanIds } from './proEricRosenQGDTabPlans';
import { getProEricRosenBudapestTabPlanIds } from './proEricRosenBudapestTabPlans';
import { getProEricRosenClosedSicilianTabPlanIds } from './proEricRosenClosedSicilianTabPlans';
import { getProEricRosenScandinavianTabPlanIds } from './proEricRosenScandinavianTabPlans';
import { getProEricRosenFrenchTabPlanIds } from './proEricRosenFrenchTabPlans';
import { getProCarlsenTabPlanIds } from './proCarlsenTabPlans';
import { getProSamayRainaOpenSicilianTabPlanIds } from './proSamayRainaOpenSicilianTabPlans';
import { getProSamayRainaRuyTabPlanIds } from './proSamayRainaRuyTabPlans';
import { getProSamayRainaItalianTabPlanIds } from './proSamayRainaItalianTabPlans';
import { getProSamayRainaFrenchWhiteTabPlanIds } from './proSamayRainaFrenchWhiteTabPlans';
import { getProSamayRainaCaroWhiteTabPlanIds } from './proSamayRainaCaroWhiteTabPlans';
import { getProSamayRainaOpenE5TabPlanIds } from './proSamayRainaOpenE5TabPlans';
import { getProSamayRainaSicilianBlackTabPlanIds } from './proSamayRainaSicilianBlackTabPlans';
import { getProSamayRainaScandiTabPlanIds } from './proSamayRainaScandiTabPlans';
import { getProSamayRainaKingsGambitTabPlanIds } from './proSamayRainaKingsGambitTabPlans';
import { getProGothamchessCaroTabPlanIds } from './proGothamchessCaroTabPlans';
import { getProGothamchessTrompowskyTabPlanIds } from './proGothamchessTrompowskyTabPlans';
import { getProGothamchessEnglishTabPlanIds } from './proGothamchessEnglishTabPlans';
import { getProGothamchessViennaTabPlanIds } from './proGothamchessViennaTabPlans';
import { getProGothamchessItalianTabPlanIds } from './proGothamchessItalianTabPlans';
import { getProGothamchessLondonTabPlanIds } from './proGothamchessLondonTabPlans';
import { getProGothamchessPonzianiTabPlanIds } from './proGothamchessPonzianiTabPlans';
import { getProGothamchessAntiSicilianTabPlanIds } from './proGothamchessAntiSicilianTabPlans';
import { getProGothamchessMilnerBarryTabPlanIds } from './proGothamchessMilnerBarryTabPlans';
import { getProGothamchessFantasyTabPlanIds } from './proGothamchessFantasyTabPlans';
import { getProGothamchessStaffordTabPlanIds } from './proGothamchessStaffordTabPlans';
import { getProGothamchessCaroAdvanceTabPlanIds } from './proGothamchessCaroAdvanceTabPlans';
import { getProGothamchessKiaTabPlanIds } from './proGothamchessKiaTabPlans';
import { getProGothamchessClosedSicilianTabPlanIds } from './proGothamchessClosedSicilianTabPlans';
import { getProGothamchessScandinavianTabPlanIds } from './proGothamchessScandinavianTabPlans';
import { getProGothamchessQgdTabPlanIds } from './proGothamchessQgdTabPlans';
import { getProGothamchessFrenchTabPlanIds } from './proGothamchessFrenchTabPlans';
import { getProGothamchessPircTabPlanIds } from './proGothamchessPircTabPlans';
import { getPetrovDefenceTabPlanIds } from './petrovDefenceMasterclassTabs';
import { getPhilidorDefenceTabPlanIds } from './philidorDefenceMasterclassTabs';
import { getQgdTabPlanIds } from './qgdMasterclassTabs';
import { getQgaTabPlanIds } from './queensGambitAcceptedMasterclassTabs';
import { getSlavDefenceTabPlanIds } from './slavDefenceMasterclassTabs';
import { getSemiSlavTabPlanIds } from './semiSlavMasterclassTabs';
import { getKingsIndianDefenceTabPlanIds } from './kingsIndianDefenceMasterclassTabs';
import { getGrunfeldDefenceTabPlanIds } from './grunfeldDefenceMasterclassTabs';
import { getBenoniDefenceTabPlanIds } from './benoniDefenceMasterclassTabs';
import { getQueensIndianDefenceTabPlanIds } from './queensIndianDefenceMasterclassTabs';
import { getOldIndianDefenceTabPlanIds } from './oldIndianDefenceMasterclassTabs';
import { getTwoKnightsDefenceTabPlanIds } from './twoKnightsDefenceMasterclassTabs';
import { getBudapestGambitTabPlanIds } from './budapestGambitMasterclassTabs';
import { getAlbinCountergambitTabPlanIds } from './albinCountergambitMasterclassTabs';
import { getSchliemannDefenceTabPlanIds } from './schliemannDefenceMasterclassTabs';
import { getQueensGambitTabPlanIds } from './queensGambitMasterclassTabs';
import { getTrompowskyAttackTabPlanIds } from './trompowskyAttackMasterclassTabs';
import { getBirdsOpeningTabPlanIds } from './birdsOpeningMasterclassTabs';

/** A tab as the page names it: its display label (Ruy and most curated
 *  tables key on it) and its full variation name (the Pirc and the pro tables
 *  key on that). Null is the main line. */
export interface TabNames { label: string; name: string }

/** The plan ids a tab is scoped to, or undefined on an uncurated main line
 *  (every plan of the opening). */
export function tabPlanIds(openingId: string, tab: TabNames | null): string[] | undefined {
  const isVariation = tab !== null;
  const tabKey = tab ? tab.label.toLowerCase() : 'main';
  // The Pirc plan table keys on the FULL variation name; Ruy keys on its
  // curated SHORT label. The display label may be truncated ("Austrian Attack
  // w…"), so the Pirc and the pro tables resolve off the full name.
  const pircTabKey = tab ? tab.name.toLowerCase() : 'main';
  const planPrefix = `mp-${openingId.replace(/-/g, '')}`;
  return (
    getRuyTabPlanIds(openingId, tabKey) ??
    getPircTabPlanIds(openingId, pircTabKey) ??
    getViennaTabPlanIds(openingId, tabKey) ??
    getItalianTabPlanIds(openingId, tabKey) ??
    getScotchTabPlanIds(openingId, tabKey) ??
    getFrenchDefenceTabPlanIds(openingId, tabKey) ??
    getScandinavianDefenceTabPlanIds(openingId, tabKey) ??
    getAlekhineDefenceTabPlanIds(openingId, tabKey) ??
    getBenkoGambitTabPlanIds(openingId, tabKey) ??
    getDutchDefenceTabPlanIds(openingId, tabKey) ??
    getNimzoIndianTabPlanIds(openingId, tabKey) ??
    getCaroKannTabPlanIds(openingId, tabKey) ??
    getKingsGambitTabPlanIds(openingId, tabKey) ??
    getSicilianDragonTabPlanIds(openingId, tabKey) ??
    getFourKnightsTabPlanIds(openingId, tabKey) ??
    getGlekSystemTabPlanIds(openingId, tabKey) ??
    getLondonTabPlanIds(openingId, tabKey) ??
    getCatalanTabPlanIds(openingId, tabKey) ??
    getEnglishTabPlanIds(openingId, tabKey) ??
    getRetiTabPlanIds(openingId, tabKey) ??
    getKiaTabPlanIds(openingId, tabKey) ??
    getEvansTabPlanIds(openingId, tabKey) ??
    getSicilianNajdorfTabPlanIds(openingId, tabKey) ??
    getSicilianSveshnikovTabPlanIds(openingId, tabKey) ??
    getSicilianAlapinTabPlanIds(openingId, tabKey) ??
    getProNaroditskyAlapinTabPlanIds(openingId, pircTabKey) ??
    getProNaroditskyKIDTabPlanIds(openingId, pircTabKey) ??
    getProNaroditskyRemainingTabPlanIds(openingId, pircTabKey) ??
    getProNaroditskyCaroTabPlanIds(openingId, pircTabKey) ??
    getProCaruanaNajdorfTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessCaroTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessTrompowskyTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessEnglishTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessViennaTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessItalianTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessLondonTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessPonzianiTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessAntiSicilianTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessMilnerBarryTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessFantasyTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessStaffordTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessCaroAdvanceTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessKiaTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessClosedSicilianTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessScandinavianTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessQgdTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessFrenchTabPlanIds(openingId, pircTabKey) ??
    getProGothamchessPircTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenStaffordTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenLondonTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenSicilianTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenQGDTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenBudapestTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenClosedSicilianTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenScandinavianTabPlanIds(openingId, pircTabKey) ??
    getProEricRosenFrenchTabPlanIds(openingId, pircTabKey) ??
    getProCarlsenTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaOpenSicilianTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaRuyTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaItalianTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaFrenchWhiteTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaCaroWhiteTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaOpenE5TabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaSicilianBlackTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaScandiTabPlanIds(openingId, pircTabKey) ??
    getProSamayRainaKingsGambitTabPlanIds(openingId, pircTabKey) ??
    getPetrovDefenceTabPlanIds(openingId, tabKey) ??
    getPhilidorDefenceTabPlanIds(openingId, tabKey) ??
    getQgdTabPlanIds(openingId, tabKey) ??
    getQgaTabPlanIds(openingId, tabKey) ??
    getSlavDefenceTabPlanIds(openingId, tabKey) ??
    getSemiSlavTabPlanIds(openingId, tabKey) ??
    getKingsIndianDefenceTabPlanIds(openingId, tabKey) ??
    getGrunfeldDefenceTabPlanIds(openingId, tabKey) ??
    getBenoniDefenceTabPlanIds(openingId, tabKey) ??
    getQueensIndianDefenceTabPlanIds(openingId, tabKey) ??
    getOldIndianDefenceTabPlanIds(openingId, tabKey) ??
    getTwoKnightsDefenceTabPlanIds(openingId, tabKey) ??
    getBudapestGambitTabPlanIds(openingId, tabKey) ??
    getAlbinCountergambitTabPlanIds(openingId, tabKey) ??
    getSchliemannDefenceTabPlanIds(openingId, tabKey) ??
    getQueensGambitTabPlanIds(openingId, tabKey) ??
    getTrompowskyAttackTabPlanIds(openingId, tabKey) ??
    getBirdsOpeningTabPlanIds(openingId, tabKey) ??
    (isVariation ? [`${planPrefix}-${tabKey}`] : undefined)
  );
}

/** The tab's middlegame plans (never its endgame ones). */
export function tabCandidatePlans(plans: readonly MiddlegamePlan[], openingId: string, planIds: string[] | undefined): MiddlegamePlan[] {
  return plans.filter((p) => !p.id.endsWith('-endgame') && (planIds ? planIds.includes(p.id) : p.openingId === openingId));
}

/** THE TABIA's hand-written plan: the tab's plan whose anchor is where this
 *  tab's line ends (G9.3 Gate C pins them together); failing that, the tab's
 *  curated plan. On a tab with no curated plan ids only an anchor match counts
 *  — the fallback lists every plan of the opening, and its first may belong to
 *  another line. Null → the card shows the plan masters played, or nothing. */
export function tabiaPlanOf(plans: readonly MiddlegamePlan[], openingId: string, planIds: string[] | undefined, lineEndFen: string): MiddlegamePlan | null {
  const candidates = tabCandidatePlans(plans, openingId, planIds);
  return candidates.find((p) => samePosition(p.criticalPositionFen, lineEndFen)) ?? (planIds ? candidates[0] ?? null : null);
}

/** Whether the tab owns any hand-written plan (its plans section shows it). */
export function tabHasPlans(plans: readonly MiddlegamePlan[], openingId: string, planIds: string[] | undefined): boolean {
  return planIds ? plans.some((p) => planIds.includes(p.id)) : plans.some((p) => p.openingId === openingId);
}

/** THE PLAN ON THE TABIA CARD: the hand-written plan anchored at the tabia,
 *  else the one the games played from the line's middlegame (`computedPlan`).
 *  A tab whose hand-written plans all sit elsewhere (an uncurated main line
 *  lists every plan of the opening) still gets its own line's plan here
 *  (2026-10-29: seven such tabs showed no plan on the card). */
export function tabiaPlanShown(hand: MiddlegamePlan | null, computed: MiddlegamePlan | null): MiddlegamePlan | null {
  return hand ?? computed;
}

/** With no plan, the card's board is the line's own end — and it says "where
 *  this line's middlegame starts", so it is shown only when that board IS one
 *  (`isMiddlegameBoard`, the games walk's own rule: both kings settled, no
 *  exchange half-played). An opening board's structure read as a plan named
 *  "their weak pawn on a7" on a pawn that had never moved (2026-10-29): empty >
 *  invented. */
export function tabiaStructureShown(lineSans: readonly string[]): boolean {
  return isMiddlegameBoard(lineSans);
}
