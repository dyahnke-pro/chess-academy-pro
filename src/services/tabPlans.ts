// tabPlans — WHICH HAND-WRITTEN PLANS A TAB OWNS, and the one anchored where
// its line's middlegame starts (the tabia). Moved out of OpeningDetailPage
// (2026-10-29) so the page and the tab-plan measure
// (`scripts/all-openings/tab-plan-coverage.ts`) read ONE resolver — a measure
// that re-typed it would drift from the page it measures.
//
// Curated openings read their HAND-PICKED row of the one tab-plan table
// (`src/data/tabPlans.ts`, no algo show-all). Others fall back: a variation →
// its own `mp-<id>-<tab>` plan, the main line → every plan of the opening.
import type { MiddlegamePlan } from '../types';
import { samePosition } from '../utils/samePosition';
import { isMiddlegameBoard } from './gamesCourse';
import { TAB_PLAN_TABLE, TAB_PLAN_FAMILIES, type TabPlanRow } from '../data/tabPlans';

/** A tab as the page names it: its display label (Ruy and most curated
 *  rows key on it) and its full variation name (the Pirc and the pro rows
 *  key on that). Null is the main line. */
export interface TabNames { label: string; name: string }

const own = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;

/** The opening's row of the tab-plan table: its own, else its family's. */
function tabPlanRow(openingId: string): TabPlanRow | undefined {
  return own(TAB_PLAN_TABLE, openingId) ?? TAB_PLAN_FAMILIES.find((f) => openingId.startsWith(f.prefix))?.row;
}

/** The plan ids the tab-plan table hands this tab, or null when the table does
 *  not decide it (no row for the opening, or a tab its row leaves out). */
export function curatedTabPlanIds(openingId: string, tab: TabNames | null): string[] | null {
  const row = tabPlanRow(openingId);
  if (!row) return null;
  const key = tab ? (row.key === 'name' ? tab.name : tab.label).toLowerCase() : 'main';
  const ids = own(row.tabs, key) ?? row.containing?.find((c) => key.includes(c.text))?.ids ?? row.otherTabs;
  return ids ? [...ids] : null;
}

/** The plan ids a tab is scoped to, or undefined on an uncurated main line
 *  (every plan of the opening). */
export function tabPlanIds(openingId: string, tab: TabNames | null): string[] | undefined {
  return curatedTabPlanIds(openingId, tab)
    ?? (tab ? [`mp-${openingId.replace(/-/g, '')}-${tab.label.toLowerCase()}`] : undefined);
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
