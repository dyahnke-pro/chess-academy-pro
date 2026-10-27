// EVERY SUBLINE BRANCHES FROM ITS OWN TAB (G8, WO-COURSE-01 C). A subline is a
// reply ON a tab's line: the moves before the reply are that tab's moves. When
// a tab's line was rebuilt or a tab removed, the sublines built on the old
// moves stayed behind — 196 of them on 2026-10-27 — and the reply tree would
// have played a line the tab never reaches. Rebuild a tab → re-anchor or prune
// its sublines (`scripts/course-replies/prune-orphan-sublines.mjs`).
//
// And every subline ENDS ON THE STUDENT'S MOVE: 1,723 stopped on the
// opponent's, so the student saw the reply and never the answer, and the last
// board never became a review card (`extend-to-student-move.mjs`).
//
// And every subline is SHOWN on a chapter. A variation folded into the main
// line or another tab (the same line) is not a tab, and its replies — 70, 61
// of them narrated, on 2026-10-27 — showed nowhere until `buildCourse` handed
// them to the chapter whose line reaches them, keeping their own tab.
import { describe, expect, it } from 'vitest';
import { buildCourse } from '../services/openingCourse';
import type { OpeningRecord } from '../types';
import subs from './course-sublines.json';
import repertoire from './repertoire.json';
import pro from './pro-repertoires.json';
import gambits from './gambits.json';
import anti from './anti-openings.json';

interface Line { id?: string; color?: 'white' | 'black'; pgn?: string; variations?: Array<{ pgn?: string }> }
const list = (raw: unknown): Line[] => {
  if (Array.isArray(raw)) return raw as Line[];
  const o = raw as { openings?: Line[]; gambits?: Line[] };
  return o.openings ?? o.gambits ?? (Object.values(raw as object) as Line[]);
};
const tokens = (pgn: string | undefined): string[] =>
  (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

describe('every subline branches from its own tab and ends on the student\'s move', () => {
  const byId = new Map([repertoire, pro, gambits, anti].flatMap(list).filter((o) => o.id).map((o) => [o.id as string, o]));
  const off: string[] = [];
  const endsOnTheirs: string[] = [];
  let checked = 0;
  for (const [id, tabs] of Object.entries(subs as Record<string, Record<string, Array<{ triggerMove: string; atPly: number; moves: string[] }>>>)) {
    const o = byId.get(id);
    for (const [tab, lines] of Object.entries(tabs)) {
      const line = !o ? [] : tab === '-1' ? tokens(o.pgn) : tokens(o.variations?.[Number(tab)]?.pgn);
      for (const s of lines) {
        checked++;
        const onTab = line.length >= s.atPly && s.moves.slice(0, s.atPly).join(' ') === line.slice(0, s.atPly).join(' ');
        const lastBy = (s.moves.length - 1) % 2 === 0 ? 'white' : 'black';
        if (o?.color && lastBy !== o.color) endsOnTheirs.push(`${id}::${tab}::${s.triggerMove}@${s.atPly}`);
        if (!onTab) off.push(`${id}::${tab}::${s.triggerMove}@${s.atPly}${o ? '' : ' (no opening)'}${line.length ? '' : ' (no tab)'}`);
      }
    }
  }

  it('reads the sublines (not vacuous)', () => {
    expect(checked).toBeGreaterThan(4000);
  });
  it('no subline hangs off moves its tab does not play, or off a tab that is gone', () => {
    expect(off).toEqual([]);
  });
  it('every subline ends on the student\'s own move', () => {
    expect(endsOnTheirs).toEqual([]);
  });
  it('every subline is shown on a chapter, under its own tab', () => {
    const unshown: string[] = [];
    for (const [id, tabs] of Object.entries(subs as Record<string, Record<string, Array<{ triggerMove: string; atPly: number }>>>)) {
      const o = byId.get(id);
      if (!o) continue;
      const course = buildCourse(o as unknown as OpeningRecord);
      const shown = course.chapters.flatMap((c) => c.sublines);
      for (const [tab, lines] of Object.entries(tabs)) {
        for (const s of lines) {
          const here = shown.some((x) => x.atPly === s.atPly && x.triggerMove === s.triggerMove && (x.tab === Number(tab) || x.moves.slice(0, s.atPly + 1).join(' ') === (lines.find((l) => l === s) as unknown as { moves: string[] }).moves.slice(0, s.atPly + 1).join(' ')));
          if (!here) unshown.push(`${id}::${tab}::${s.triggerMove}@${s.atPly}`);
        }
      }
      for (const x of shown) {
        if (!tabs[String(x.tab)]?.some((s) => s.atPly === x.atPly && s.triggerMove === x.triggerMove)) unshown.push(`${id}: shown under tab ${x.tab}, filed elsewhere — ${x.triggerMove}@${x.atPly}`);
      }
    }
    expect(unshown).toEqual([]);
  });
});
