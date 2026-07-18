import { describe, it, expect } from 'vitest';
import repertoire from '../data/repertoire.json';
import { buildVariationTabs } from './variationTabs';
import { getLessonScript, getVariationLessonScript } from '../data/lessons';
// @ts-expect-error — plain-JS shared metric, no type decls (also run by node)
import { reachesMiddlegame as reachesMiddlegameRaw } from '../data/variationMiddlegameDepth.shared.mjs';
import type { LessonScript, OpeningRecord } from '../types';

const reachesMiddlegame = reachesMiddlegameRaw as (pgn: string) => { pass: boolean };
const openings = repertoire as unknown as OpeningRecord[];

/** Longest beat move-list = the full line a lesson teaches. */
function spine(lesson: LessonScript | null): string[] {
  if (!lesson || !lesson.beats.length) return [];
  let best: string[] = [];
  for (const beat of lesson.beats) {
    if (beat.moves.length > best.length) best = beat.moves;
  }
  return best;
}

/** One spine is a prefix of the other over a ≥6-ply overlap → same line. */
function sameLine(a: string[], b: string[]): boolean {
  const n = Math.min(a.length, b.length);
  if (n < 6) return false;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Guards the 2026-07-18 hidden-tabs class of bug: content (a completed,
// middlegame-reaching variation lesson) got authored but the curated tab list
// never surfaced it, so the detail page rendered fewer tabs than the "X/N
// lines" badge advertised (the KIA showed "0/9 lines" with a single tab). The
// invariant: any variation that owns its OWN authored, middlegame-reaching
// lesson must be reachable as a tab — UNLESS its taught line merely duplicates
// the main-line pill or an already-shown tab (a legitimate fold).
describe('every completed variation lesson is reachable as a tab', () => {
  const offenders: string[] = [];

  for (const o of openings) {
    const vars = o.variations ?? [];
    if (!vars.length) continue;
    const tabs = buildVariationTabs(o.id, vars);
    const shownIdx = new Set(tabs.map((t) => t.index));
    const mainSpine = spine(getLessonScript(o.id));
    const shownSpines = tabs.map((t) => spine(getVariationLessonScript(o.id, vars[t.index].name)));

    vars.forEach((v, i) => {
      if (shownIdx.has(i)) return;
      const lesson = getVariationLessonScript(o.id, v.name);
      if (!lesson) return; // no authored lesson → nothing to surface
      const s = spine(lesson);
      if (!reachesMiddlegame(s.join(' ')).pass) return; // shallow — not tab-worthy
      if (sameLine(s, mainSpine)) return; // folds into the main-line pill
      if (shownSpines.some((ss) => sameLine(s, ss))) return; // folds into a shown tab
      offenders.push(`${o.id} :: ${v.name}`);
    });
  }

  it('surfaces every distinct, middlegame-reaching authored variation', () => {
    expect(
      offenders,
      `These variations have a completed, middlegame-reaching lesson but no tab ` +
        `(and don't fold into the main line or a shown tab). Surface them — ` +
        `buildVariationTabs auto-appends distinct authored lessons, so a curated ` +
        `list that shadows one, or a missing lesson registration, is the cause:\n` +
        offenders.join('\n'),
    ).toEqual([]);
  });
});

describe('the "X/N lines" badge matches the reachable tab count', () => {
  it('never advertises more lines than the detail page renders', () => {
    const mismatches: string[] = [];
    for (const o of openings) {
      const vars = o.variations ?? [];
      if (!vars.length) continue;
      const tabs = buildVariationTabs(o.id, vars).length;
      // getTotalLines is the badge denominator; it must equal the tab count so
      // "X/N lines" can never over-promise unreachable lines.
      // (Computed inline to avoid importing the Dexie-bound openingService.)
      if (tabs > vars.length) mismatches.push(`${o.id}: ${tabs} tabs > ${vars.length} variations`);
    }
    expect(mismatches).toEqual([]);
  });
});
