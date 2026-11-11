import { describe, expect, it } from 'vitest';
import { SCOTCH_GAME_TRAP_DEFS, SCOTCH_GAME_TRAP_LESSONS, getScotchTrapsForTab } from './scotchGameTrapLessons';
import repertoire from '../repertoire.json';
import { buildVariationTabs } from '../../services/variationTabs';
import type { OpeningRecord } from '../../types';

// A named trap shows on the tab whose line it is played in. The Sea-Cadet Mate
// (4.c3 dxc3 Nxc3) sat on the main (4…Bc5) and Scotch Gambit (4.Bc4) tabs,
// whose lines never reach it, and was missing from the Göring tab.
describe('Scotch trap routing', () => {
  const scotch = (repertoire as unknown as OpeningRecord[]).find((o) => o.id === 'scotch-game')!;
  const variations = scotch.variations ?? [];
  const tabs = buildVariationTabs('scotch-game', variations);
  const tabLine = (key: string): string[] => {
    if (key === 'main') return scotch.pgn.split(/\s+/);
    const t = tabs.find((x) => x.label.toLowerCase() === key);
    return t ? variations[t.index].pgn.split(/\s+/) : [];
  };

  it('every trap appears on a tab whose line shares its first moves', () => {
    for (const def of SCOTCH_GAME_TRAP_DEFS) {
      const trapMoves = SCOTCH_GAME_TRAP_LESSONS[def.id].beats.at(-1)!.moves;
      for (const key of def.appliesTo) {
        const line = tabLine(key);
        expect(line.length, `${def.id} on ${key}: no such tab`).toBeGreaterThan(0);
        expect(line.slice(0, 8), `${def.id} on ${key}`).toEqual(trapMoves.slice(0, 8));
      }
    }
  });

  it('the Sea-Cadet Mate shows on the Göring tab', () => {
    expect(getScotchTrapsForTab('göring gambit').map((t) => t.id)).toContain('sea-cadet-mate');
  });
});
