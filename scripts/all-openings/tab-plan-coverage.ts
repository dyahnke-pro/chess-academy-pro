// WHAT EVERY OPENING TAB'S TABIA CARD SHOWS — measured over every tab of every
// course (repertoire.json main + variations, pro-repertoires.json, gambits.json,
// anti-openings.json), reading the stored game trees off disk the way the page
// reads them (`storedTreeAnswer`), through the page's own functions
// (`tabPlans`: the resolver chain, `tabiaPlanShown`, `tabiaStructureShown`;
// `computedPlan.tabPlanFor`) — nothing re-typed here.
//
// Per tab: a hand-written plan / a computed plan (the plan the games played) /
// the structure only / nothing; for each computed plan, whether its board is a
// MIDDLEGAME board (both kings settled, no exchange half-played —
// `isMiddlegameBoard`, the games walk's own rule) and whether it was reached by
// walking on past the line's end (`approach`); for each tab with no plan, why:
// where the walk to the
// middlegame stopped, and the games at the board it reached.
//
// The "before" figure (2026-10-29: 418 hand / 209 computed, 66 of them at a
// middlegame board / 48 structure only / 181 nothing) is this script as
// committed in 631614e, on the code before the plan walked to the middlegame.
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
const { tabPlanIds, tabiaPlanOf, tabHasPlans, tabiaPlanShown, tabiaStructureShown } = await import('../../src/services/tabPlans');
const { tabPlanFor } = await import('../../src/services/computedPlan');
const { storedTreeAnswer } = await import('../../src/services/deepTree');
const { tabiaStructure } = await import('../../src/services/tabiaStructure');
const { tabLineSans } = await import('../../src/services/tabLine');
const { walkToMiddlegame, isMiddlegameBoard } = await import('../../src/services/gamesCourse');
const { MAIN_LINE_INDEX } = await import('../../src/utils/wlppLadder');
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
const games = (r: { white: number; draws: number; black: number } | undefined): number => (r ? r.white + r.draws + r.black : 0);

type Shown = 'hand' | 'computed' | 'structure' | 'nothing';
interface Row {
  source: string; openingId: string; tab: string; lineIndex: number; side: 'white' | 'black';
  shown: Shown; lineLen: number; lineAtMiddlegame: boolean;
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
      const computed = hand ? null : await tabPlanFor(opening, tab.index, storedTreeAnswer);
      // What the card shows: the page's own two decisions.
      const planShown = tabiaPlanShown(hand, computed);
      const structure = tabiaStructure(planShown?.criticalPositionFen ?? lineEndFen, opening.color);
      const structureShown = planShown || tabiaStructureShown(line) ? structure : null;
      const shown: Shown = hand ? 'hand' : planShown ? 'computed' : structureShown ? 'structure' : 'nothing';
      const row: Row = { source, openingId: opening.id, tab: tab.label, lineIndex: tab.index, side: opening.color, shown, lineLen: line.length, lineAtMiddlegame: isMiddlegameBoard(line), hasHandPlans: has, structure: structureShown };
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
          atMiddlegame: isMiddlegameBoard(toBoard),
          lineLine: line.join(' '),
          playable: computed.playableLines?.[0]?.moves.length ?? 0,
        };
      } else if (!hand) {
        // WHY no plan: where the walk to the middlegame (the plan's own walk)
        // stopped, and the games at the board it reached.
        const w = await walkToMiddlegame(line, opening.color === 'white' ? 'w' : 'b', { lookup: async (s) => (await storedTreeAnswer(s))?.result ?? null });
        const n = w.stop === 'middlegame' ? games((await storedTreeAnswer(w.sans))?.result) : 0;
        const where = w.sans.length === line.length ? 'line-end' : 'walked';
        row.why = w.stop !== 'middlegame' ? `games run out before the middlegame (${w.stop}, ${where})` : n < 20 ? `middlegame board under 20 games (${where})` : 'nothing clears the bar';
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
  computedAtLineEnd: count((r) => r.shown === 'computed' && (r.computed?.approach.length ?? 0) === 0),
  computedWithApproach: count((r) => r.shown === 'computed' && (r.computed?.approach.length ?? 0) > 0),
  computedNotPlayable: count((r) => r.shown === 'computed' && (r.computed?.playable ?? 0) === 0),
  computedOnTabsWithHandPlansElsewhere: count((r) => r.shown === 'computed' && r.hasHandPlans),
  lineAlreadyMiddlegame: count((r) => r.lineAtMiddlegame),
  noPlanWhy: rows.filter((r) => r.why).reduce<Record<string, number>>((a, r) => { a[r.why!] = (a[r.why!] ?? 0) + 1; return a; }, {}),
  seconds: Math.round((Date.now() - t0) / 1000),
};
console.log(JSON.stringify(summary, null, 2));
mkdirSync(join(ROOT, 'audit-reports'), { recursive: true });
writeFileSync(join(ROOT, `audit-reports/tab-plan-coverage-${label}.json`), JSON.stringify({ summary, rows }, null, 1));
