// WHAT EVERY OPENING TAB'S TABIA CARD SHOWS — measured over every tab of every
// course (repertoire.json main + variations, pro-repertoires.json, gambits.json,
// anti-openings.json), reading the stored game trees off disk the way the page
// reads them (`storedTreeAnswer`), through the page's own resolvers
// (`tabPlans`, `tabPlanFor`, `tabiaPlanShown, tabiaStructureShown`) — nothing re-typed here.
//
// Per tab: a hand-written plan / a computed plan (the masters' plan) /
// the structure only / nothing; for each computed plan, whether it is read at a
// MIDDLEGAME board (both sides castled — the games-course walk's own rule) and
// how far past the tab line's end its board lies.
//
//   npx tsx scripts/all-openings/tab-plan-coverage.ts <label>
//   → audit-reports/tab-plan-coverage-<label>.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const ROOT = new URL('../..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');
// The page fetches `/data/...` from its own origin; here it is the files on disk.
(globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
  const path = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const file = join(PUBLIC, path);
  if (!existsSync(file)) return { ok: false, status: 404, json: async () => null, text: async () => '' };
  const text = readFileSync(file, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(text) as unknown, text: async () => text };
};

const { buildVariationTabs } = await import('../../src/services/variationTabs');
const { tabPlanIds, tabiaPlanOf, tabHasPlans } = await import('../../src/services/tabPlans');
const { tabPlanFor } = await import('../../src/services/computedPlan');
const { storedTreeAnswer } = await import('../../src/services/deepTree');
const { tabiaStructure } = await import('../../src/services/tabiaStructure');
const { tabLineSans, tabOwnPly } = await import('../../src/services/tabLine');
const { MAIN_LINE_INDEX } = await import('../../src/utils/wlppLadder');
const tabPlansMod = await import('../../src/services/tabPlans') as Record<string, unknown>;
// The walk the plan takes to the middlegame (absent before 2026-10-29).
const gamesCourseMod = await import('../../src/services/gamesCourse') as Record<string, unknown>;
type Walk = (start: readonly string[], student: 'w' | 'b', o: { lookup: (s: readonly string[]) => Promise<unknown> }) => Promise<{ sans: string[]; stop: string }>;
const walkToMiddlegame = gamesCourseMod.walkToMiddlegame as Walk | undefined;
const middlegamePly = gamesCourseMod.middlegamePly as ((s: readonly string[]) => number | null) | undefined;
type MiddlegamePlan = import('../../src/types').MiddlegamePlan;
type OpeningRecord = import('../../src/types').OpeningRecord;

const label = process.argv[2] ?? 'run';
const read = (f: string): unknown => JSON.parse(readFileSync(join(ROOT, 'src/data', f), 'utf8'));
const asList = (raw: unknown): OpeningRecord[] => (Array.isArray(raw) ? raw : (raw as { openings: unknown[] }).openings) as OpeningRecord[];
const SOURCES: Array<[string, OpeningRecord[]]> = [
  ['repertoire', asList(read('repertoire.json'))],
  ['pro', asList(read('pro-repertoires.json'))],
  ['gambits', asList(read('gambits.json'))],
  ['anti', asList(read('anti-openings.json'))],
];
const plans = read('middlegame-plans.json') as MiddlegamePlan[];

function fenAfter(sans: readonly string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}
/** The ply both sides have castled by, or null — the walk's own rule
 *  (`middlegamePly`); the copy below only runs on code from before it was
 *  exported, so the "before" figure can be re-measured on that code. */
const bothCastledBy = middlegamePly ?? ((sans: readonly string[]): number | null => {
  let w = false; let b = false;
  for (let i = 0; i < sans.length; i += 1) {
    if (sans[i].startsWith('O-O')) { if (i % 2 === 0) w = true; else b = true; }
    if (w && b) return i + 1;
  }
  return null;
});

type Shown = 'hand' | 'computed' | 'structure' | 'nothing';
interface Row {
  source: string; openingId: string; tab: string; lineIndex: number; side: 'white' | 'black';
  shown: Shown; lineLen: number; lineCastledBy: number | null;
  hasHandPlans: boolean;
  computed?: {
    title: string; overview: string; breaks: string[]; routes: string[];
    fen: string; lineMoves: string[]; approach: string[]; boardPly: number;
    atMiddlegame: boolean; lineLine: string; playable: number;
  } | null;
  structure?: string | null;
  why?: string;
  walked?: number;
  boardGames?: number;
}

const rows: Row[] = [];
const t0 = Date.now();
let done = 0;
const total = SOURCES.reduce((n, [, os]) => n + os.reduce((m, o) => m + 1 + buildVariationTabs(o.id, o.variations).length, 0), 0);
console.log(`[tab-plan-coverage] ${total} tabs`);
for (const [source, openings] of SOURCES) {
  for (const opening of openings) {
    const tabs = [{ index: MAIN_LINE_INDEX, label: 'main' }, ...buildVariationTabs(opening.id, opening.variations)];
    for (const tab of tabs) {
      const isVar = tab.index !== MAIN_LINE_INDEX;
      const line = tabLineSans(opening, tab.index);
      const lineEndFen = fenAfter(line);
      const ids = tabPlanIds(opening.id, isVar ? { label: tab.label, name: opening.variations?.[tab.index]?.name ?? '' } : null);
      const hand = tabiaPlanOf(plans, opening.id, ids, lineEndFen);
      const has = tabHasPlans(plans, opening.id, ids);
      let computed: MiddlegamePlan | null = null;
      if (!hand) computed = await tabPlanFor(opening, tab.index, storedTreeAnswer);
      // What the card shows — the page's own decision when it is a function
      // (after 2026-10-29), else the rule the page held before.
      const decide = tabPlansMod.tabiaPlanShown as undefined | ((hand: MiddlegamePlan | null, computed: MiddlegamePlan | null) => MiddlegamePlan | null);
      const planShown = decide ? decide(hand, computed) : hand ?? (!has ? computed : null);
      const cardFen = planShown?.criticalPositionFen ?? lineEndFen;
      const structure = tabiaStructure(cardFen, opening.color);
      // With no plan, the card's own board is the line's end; before
      // 2026-10-29 its structure was shown whatever the board.
      const structureRule = tabPlansMod.tabiaStructureShown as undefined | ((sans: readonly string[]) => boolean);
      const structureAllowed = planShown !== null || !structureRule || structureRule(line);
      const structureShown = structureAllowed ? structure : null;
      const shown: Shown = planShown === hand && hand ? 'hand' : planShown ? 'computed' : structureShown ? 'structure' : 'nothing';
      const row: Row = { source, openingId: opening.id, tab: tab.label, lineIndex: tab.index, side: opening.color, shown, lineLen: line.length, lineCastledBy: bothCastledBy(line), hasHandPlans: has, structure: structureShown ?? null };
      if (computed) {
        const approach = computed.approach ?? [];
        const toBoard = [...(computed.lineMoves ?? []), ...approach];
        row.computed = {
          title: computed.title,
          overview: computed.overview,
          breaks: computed.pawnBreaks.map((b) => b.move),
          routes: computed.pieceManeuvers.map((m) => `${m.piece} ${m.route}`),
          fen: computed.criticalPositionFen,
          lineMoves: computed.lineMoves ?? [],
          approach,
          boardPly: toBoard.length,
          atMiddlegame: (bothCastledBy(toBoard) ?? Infinity) <= toBoard.length,
          lineLine: line.join(' '),
          playable: computed.playableLines?.[0]?.moves.length ?? 0,
        };
      }
      // WHY a tab has no computed plan: the walk to the middlegame (the same
      // walk the plan takes) and the games at the board it reached.
      if (!hand && !computed && walkToMiddlegame && middlegamePly) {
        const w = await walkToMiddlegame(line, opening.color === 'white' ? 'w' : 'b', { lookup: async (s: readonly string[]) => (await storedTreeAnswer(s))?.result ?? null });
        const mg = middlegamePly(w.sans);
        // The boards the plan may be read at: the middlegame part of the walked
        // line, the last six plies, never before the tab's own first move.
        let n = 0;
        if (mg !== null) {
          for (let end = w.sans.length; end >= Math.max(tabOwnPly(opening, tab.index), mg, w.sans.length - 6, 0); end -= 1) {
            const at = await storedTreeAnswer(w.sans.slice(0, end));
            n = Math.max(n, at ? at.result.white + at.result.draws + at.result.black : 0);
          }
        }
        row.why = w.stop !== 'middlegame' ? `walk:${w.stop}${w.sans.length === line.length ? ':at-line-end' : ''}` : n < 20 ? 'games-run-out-on-line' : 'nothing-clears-the-bar';
        row.walked = w.sans.length - line.length;
        row.boardGames = n;
      }
      rows.push(row);
      done += 1;
      if (done % 50 === 0) console.log(`[tab-plan-coverage] ${done}/${total} (${Math.round((Date.now() - t0) / 1000)}s)`);
    }
  }
}

const count = (f: (r: Row) => boolean): number => rows.filter(f).length;
const summary = {
  label,
  tabs: rows.length,
  hand: count((r) => r.shown === 'hand'),
  computed: count((r) => r.shown === 'computed'),
  structureOnly: count((r) => r.shown === 'structure'),
  nothing: count((r) => r.shown === 'nothing'),
  computedAtMiddlegame: count((r) => r.shown === 'computed' && !!r.computed?.atMiddlegame),
  computedBlockedByHandPlans: count((r) => r.shown !== 'computed' && r.shown !== 'hand' && !!r.computed),
  computedAvailableNoHand: count((r) => r.shown !== 'hand' && !!r.computed),
  lineAlreadyCastled: count((r) => r.lineCastledBy !== null),
  computedWithApproach: count((r) => r.shown === 'computed' && (r.computed?.approach.length ?? 0) > 0),
  computedNotPlayable: count((r) => r.shown === 'computed' && (r.computed?.playable ?? 0) === 0),
  noPlanWhy: rows.filter((r) => r.why).reduce<Record<string, number>>((a, r) => { a[r.why!] = (a[r.why!] ?? 0) + 1; return a; }, {}),
  seconds: Math.round((Date.now() - t0) / 1000),
};
console.log(JSON.stringify(summary, null, 2));
mkdirSync(join(ROOT, 'audit-reports'), { recursive: true });
writeFileSync(join(ROOT, `audit-reports/tab-plan-coverage-${label}.json`), JSON.stringify({ summary, rows }, null, 1));
