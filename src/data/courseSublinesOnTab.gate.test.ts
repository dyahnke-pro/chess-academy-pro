// EVERY SUBLINE BRANCHES FROM ITS OWN TAB (G8, WO-COURSE-01 C). A subline is a
// reply ON a tab's line: the moves before the reply are that tab's moves. When
// a tab's line was rebuilt or a tab removed, the sublines built on the old
// moves stayed behind — 196 of them on 2026-10-27 — and the reply tree would
// have played a line the tab never reaches. Rebuild a tab → re-anchor or prune
// its sublines (`scripts/course-replies/prune-orphan-sublines.mjs`).
import { describe, expect, it } from 'vitest';
import subs from './course-sublines.json';
import repertoire from './repertoire.json';
import pro from './pro-repertoires.json';
import gambits from './gambits.json';
import anti from './anti-openings.json';

interface Line { id?: string; pgn?: string; variations?: Array<{ pgn?: string }> }
const list = (raw: unknown): Line[] => {
  if (Array.isArray(raw)) return raw as Line[];
  const o = raw as { openings?: Line[]; gambits?: Line[] };
  return o.openings ?? o.gambits ?? (Object.values(raw as object) as Line[]);
};
const tokens = (pgn: string | undefined): string[] =>
  (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));

describe('every subline branches from its own tab', () => {
  const byId = new Map([repertoire, pro, gambits, anti].flatMap(list).filter((o) => o.id).map((o) => [o.id as string, o]));
  const off: string[] = [];
  let checked = 0;
  for (const [id, tabs] of Object.entries(subs as Record<string, Record<string, Array<{ triggerMove: string; atPly: number; moves: string[] }>>>)) {
    const o = byId.get(id);
    for (const [tab, lines] of Object.entries(tabs)) {
      const line = !o ? [] : tab === '-1' ? tokens(o.pgn) : tokens(o.variations?.[Number(tab)]?.pgn);
      for (const s of lines) {
        checked++;
        const onTab = line.length >= s.atPly && s.moves.slice(0, s.atPly).join(' ') === line.slice(0, s.atPly).join(' ');
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
});
