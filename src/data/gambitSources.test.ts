import { describe, it, expect } from 'vitest';
import gambitsRaw from './gambits.json';
import mapRaw from './gambitOpeningMap.json';
import openingManifests from './opening-manifests.json';
import { sourcesAreValid } from './narrationSources';

// NON-NEGOTIABLE verification gate for masterclass-mapped gambits (David
// 2026-05-25). Every gambit in gambitOpeningMap.json + its variations must cite
// a resolvable source. Non-masterclass gambits (Smith-Morra, Stafford, Englund,
// Budapest, Albin, Danish) are out of scope. No baseline escape.
const map = (mapRaw as { map: Record<string, string> }).map;
const gambits = gambitsRaw as Array<{ id: string; sources?: string[]; variations?: Array<{ sources?: string[] }> }>;

const unsourced: string[] = [];
for (const g of gambits) {
  if (!map[g.id]) continue;
  if (!sourcesAreValid(g.sources)) unsourced.push(`${g.id} (overview)`);
  (g.variations ?? []).forEach((v, i) => { if (!sourcesAreValid(v.sources)) unsourced.push(`${g.id} :: variation[${i}]`); });
}

describe('masterclass-mapped gambits cite a verification source', () => {
  it('EVERY mapped gambit + variation has a resolvable source — no exceptions', () => {
    expect(unsourced, `Mapped gambits missing a resolvable source:\n${unsourced.join('\n')}`).toEqual([]);
  });
  it('every gambit→masterclass map target is a real masterclass opening', () => {
    const mc = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
    expect([...new Set(Object.values(map))].filter((id) => !mc.has(id))).toEqual([]);
  });
});
