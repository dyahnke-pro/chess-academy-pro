import { describe, expect, it } from 'vitest';
import { ITALIAN_GAME_TRAP_DEFS, ITALIAN_GAME_TRAP_LESSONS, getItalianTrapsForTab } from './italianGameTrapLessons';
import repertoire from '../repertoire.json';
import { buildVariationTabs } from '../../services/variationTabs';
import type { OpeningRecord } from '../../types';

// A named trap shows on the tab whose line it is played in: the tab it sits on
// shares as many of the trap's first moves as any tab does. Légal's Mate
// (3…d6) and the Blackburne Shilling (3…Nd4) leave every line at their third
// move, so they live on the main tab; the Fried Liver (3…Nf6 4.Ng5) is a Two
// Knights line, and only that tab plays 3…Nf6.
describe('Italian trap routing', () => {
  const italian = (repertoire as unknown as OpeningRecord[]).find((o) => o.id === 'italian-game')!;
  const variations = italian.variations ?? [];
  const tabs = buildVariationTabs('italian-game', variations);
  const lines: Record<string, string[]> = { main: italian.pgn.split(/\s+/) };
  for (const t of tabs) lines[t.label.toLowerCase()] = variations[t.index].pgn.split(/\s+/);
  const shared = (a: readonly string[], b: readonly string[]): number => {
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k += 1;
    return k;
  };

  it('every trap appears on a tab whose line shares the most of its first moves', () => {
    for (const def of ITALIAN_GAME_TRAP_DEFS) {
      const trapMoves = ITALIAN_GAME_TRAP_LESSONS[def.id].beats.at(-1)!.moves;
      const best = Math.max(...Object.values(lines).map((l) => shared(l, trapMoves)));
      expect(def.appliesTo.length, `${def.id}: on no tab`).toBeGreaterThan(0);
      for (const key of def.appliesTo) {
        const line = lines[key];
        expect(line, `${def.id} on ${key}: no such tab`).toBeDefined();
        // At least through Bc4: a trap on an Italian tab starts from the Italian.
        expect(shared(line, trapMoves), `${def.id} on ${key}`).toBeGreaterThanOrEqual(5);
        expect(shared(line, trapMoves), `${def.id} on ${key}: another tab plays more of it`).toBe(best);
      }
    }
  });

  it('the Fried Liver shows on the Two Knights tab, the 3rd-move traps on the main tab', () => {
    expect(getItalianTrapsForTab('two knights').map((t) => t.id)).toContain('fried-liver');
    expect(getItalianTrapsForTab('main').map((t) => t.id)).toEqual(expect.arrayContaining(['legals-mate', 'blackburne-shilling']));
  });
});
