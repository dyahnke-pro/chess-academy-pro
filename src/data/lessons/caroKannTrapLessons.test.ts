import { describe, expect, it } from 'vitest';
import { CARO_TRAP_DEFS, CARO_TRAP_LESSONS, getCaroTrapsForTab } from './caroKannTrapLessons';
import repertoire from '../repertoire.json';
import { buildVariationTabs } from '../../services/variationTabs';
import type { OpeningVariation } from '../../types';

// A named trap shows on a tab whose line reaches the board the trap starts
// from (the Scotch pattern, `scotchGameTrapLessons.test.ts`). A Caro trap is a
// warning about one of YOUR own choices, so its line may leave the tab's line
// only on your move: the tab plays every move before that choice. The Karpov
// trap (…Nd7 Qe2, Nd6 mate) sat on the main and Classical tabs; the Classical
// tab is never shown, and no tab plays …Nd7, so it lives on the main tab,
// where the line reaches the …Bf5 / …Nd7 / …Nf6 choice.
describe('Caro trap routing', () => {
  const caro = (repertoire as unknown as Array<{ id: string; pgn: string; variations: OpeningVariation[] }>).find((o) => o.id === 'caro-kann')!;
  const tabs = buildVariationTabs('caro-kann', caro.variations);
  const tabLine = (key: string): string[] => {
    if (key === 'main') return caro.pgn.split(/\s+/);
    const t = tabs.find((x) => x.label.toLowerCase() === key);
    return t ? caro.variations[t.index].pgn.split(/\s+/) : [];
  };
  const shared = (a: readonly string[], b: readonly string[]): number => {
    let k = 0;
    while (k < a.length && k < b.length && a[k] === b[k]) k += 1;
    return k;
  };

  it('every trap appears on a tab whose line reaches the trap and leaves it only on your move', () => {
    for (const def of CARO_TRAP_DEFS) {
      const trapMoves = CARO_TRAP_LESSONS[def.id].beats.at(-1)!.moves;
      for (const key of def.appliesTo) {
        const line = tabLine(key);
        expect(line.length, `${def.id} on ${key}: no such tab`).toBeGreaterThan(0);
        const k = shared(line, trapMoves);
        // The exchanges on e4 (seven plies) at least: the trap starts from a
        // board the tab really shows, not from move one.
        expect(k, `${def.id} on ${key}: the tab's line shares only ${k} moves with the trap`).toBeGreaterThanOrEqual(7);
        // The student plays Black: Black's moves sit at odd indexes.
        if (k < trapMoves.length && k < line.length) {
          expect(k % 2, `${def.id} on ${key}: the line leaves the trap on THEIR move (${trapMoves[k]} vs ${line[k]})`).toBe(1);
        }
      }
    }
  });

  it('the Karpov trap shows on the main tab, and on no tab that is never shown', () => {
    expect(getCaroTrapsForTab('main').map((t) => t.id)).toContain('karpov-qe2-mate');
    expect(getCaroTrapsForTab('classical')).toEqual([]);
  });
});
