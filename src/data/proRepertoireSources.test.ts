import { describe, it, expect } from 'vitest';
import proData from './pro-repertoires.json';
import proMapRaw from './proRepertoireOpeningMap.json';
import openingManifests from './opening-manifests.json';
import { sourcesAreValid } from './narrationSources';

// NON-NEGOTIABLE independent-verification gate for pro-repertoire teaching prose
// (David 2026-05-25). Every pro opening that maps to a masterclass opening
// (proRepertoireOpeningMap.json) — and every one of its variations' `explanation`
// — MUST record a resolvable source. Non-masterclass pro openings (KID, Grünfeld,
// QGD, Petroff, Benoni, Rossolimo…) are out of scope. NO baseline escape: all 61
// mapped openings + 184 variations were sourced 2026-05-25.

const proMap = (proMapRaw as { map: Record<string, string> }).map;
const openings = (proData as { openings: Array<{ id: string; sources?: string[]; variations?: Array<{ name?: string; sources?: string[] }> }> }).openings;

const unsourced: string[] = [];
for (const o of openings) {
  if (!proMap[o.id]) continue; // non-masterclass — out of scope
  if (!sourcesAreValid(o.sources)) unsourced.push(`${o.id} (opening overview)`);
  (o.variations ?? []).forEach((v, i) => {
    if (!sourcesAreValid(v.sources)) unsourced.push(`${o.id} :: variation[${i}]${v.name ? ` ${v.name}` : ''}`);
  });
}

describe('masterclass-mapped pro-repertoires cite a verification source', () => {
  it('EVERY mapped pro opening + variation has a resolvable source — no exceptions', () => {
    expect(unsourced, `Masterclass-mapped pro-repertoire units missing a resolvable source (sources: ["book:<id>" | "concept:<id>" | reputable https URL]):\n${unsourced.join('\n')}`).toEqual([]);
  });

  it('every pro→masterclass map target is a real masterclass opening', () => {
    const masterclass = new Set(Object.keys(openingManifests).filter((k) => !k.startsWith('_')));
    const bad = [...new Set(Object.values(proMap))].filter((mcId) => !masterclass.has(mcId));
    expect(bad, `pro map targets a non-masterclass opening id: ${bad.join(', ')}`).toEqual([]);
  });
});
