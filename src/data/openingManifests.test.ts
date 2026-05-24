// Content-completeness manifest gate (David 2026-05-22).
//
// Every first-class opening declares its MINIMUM curated content counts
// in `src/data/opening-manifests.json` — variations, middlegame plans,
// endgame plans, model games, weapons, warnings, key ideas. This gate
// loads the manifest and verifies the actual content meets or exceeds
// the floors.
//
// The gate's job: catch accidental REGRESSIONS. If a future session
// accidentally deletes a variation, drops a plan, or removes a weapon
// lesson, the test fails. Floors track the current curated state and
// ratchet UP as content lands; demotions require explicit edits to
// `opening-manifests.json` so they're reviewable.
//
// Same shrinking-baseline pattern as `repertoire-orientation.test.ts`
// and `lessonDepth.test.ts:KNOWN_SHORTFALLS` — gates that surface the
// backlog rather than gating on perfection.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import manifests from './opening-manifests.json';
import repertoireRaw from './repertoire.json';
import middlegamePlansRaw from './middlegame-plans.json';
import modelGamesRaw from './model-games.json';
import { FIRST_CLASS_OPENING_IDS } from './lessons/registry';
import type { OpeningRecord, MiddlegamePlan } from '../types';

interface ModelGameLike { openingId: string }
interface ManifestEntry {
  variations: number;
  middlegamePlans: number;
  endgamePlans: number;
  modelGames: number;
  weapons: number;
  warnings: number;
  keyIdeas: number;
}

const repertoire = repertoireRaw as OpeningRecord[];
const middlegamePlans = middlegamePlansRaw as MiddlegamePlan[];
const modelGames = modelGamesRaw as ModelGameLike[];

// Per-opening trap files. NOT all openings have one — Pirc currently has
// no trap lessons file (its content is all in pircVariations.ts +
// pircDefence.ts). When absent, weapons/warnings count = 0, which the
// manifest reflects.
const TRAP_FILE_FOR: Record<string, string> = {
  'ruy-lopez': 'src/data/lessons/ruyTrapLessons.ts',
  'vienna-game': 'src/data/lessons/viennaTrapLessons.ts',
  'caro-kann': 'src/data/lessons/caroKannTrapLessons.ts',
  'italian-game': 'src/data/lessons/italianGameTrapLessons.ts',
};

function countInTrapFile(openingId: string, kind: 'weapon' | 'warning'): number {
  const path = TRAP_FILE_FOR[openingId];
  if (!path) return 0;
  try {
    const txt = readFileSync(join(process.cwd(), path), 'utf-8');
    const re = new RegExp(`kind:\\s*'${kind}'`, 'g');
    return (txt.match(re) ?? []).length;
  } catch {
    return 0;
  }
}

type ActualCounts = ManifestEntry;

function countActual(openingId: string): ActualCounts {
  const opening = repertoire.find((o) => o.id === openingId);
  if (!opening) {
    return { variations: 0, middlegamePlans: 0, endgamePlans: 0, modelGames: 0, weapons: 0, warnings: 0, keyIdeas: 0 };
  }
  const plans = middlegamePlans.filter((p) => p.openingId === openingId);
  return {
    variations: opening.variations?.length ?? 0,
    middlegamePlans: plans.filter((p) => !p.id.endsWith('-endgame')).length,
    endgamePlans: plans.filter((p) => p.id.endsWith('-endgame')).length,
    modelGames: modelGames.filter((g) => g.openingId === openingId).length,
    weapons: countInTrapFile(openingId, 'weapon'),
    warnings: countInTrapFile(openingId, 'warning'),
    keyIdeas: opening.keyIdeas?.length ?? 0,
  };
}

const FIELDS: (keyof ManifestEntry)[] = [
  'variations', 'middlegamePlans', 'endgamePlans',
  'modelGames', 'weapons', 'warnings', 'keyIdeas',
];

describe('opening-masterclass content manifests', () => {
  // Filter out meta keys (the underscore-prefixed _comment / _schema).
  const openingIds = Object.keys(manifests).filter((k) => !k.startsWith('_'));

  // Hole 2: a new first-class opening (one with a main lesson registered
  // in lessons/registry.ts) must NOT be able to ship without a manifest —
  // otherwise its content floors are never declared and the count gate
  // passes vacuously. Bind the manifest to the lesson registry so adding
  // an opening forces a manifest entry.
  it('every first-class (lesson-registered) opening has a manifest entry', () => {
    const missing = FIRST_CLASS_OPENING_IDS.filter((id) => !openingIds.includes(id));
    expect(
      missing,
      `These openings have a masterclass lesson but no opening-manifests.json entry — add one (declare its content floors): ${missing.join(', ')}`,
    ).toEqual([]);
  });

  for (const openingId of openingIds) {
    const declared = (manifests as Record<string, ManifestEntry>)[openingId];
    describe(openingId, () => {
      const actual = countActual(openingId);

      for (const field of FIELDS) {
        it(`${field} ≥ ${declared[field]} (manifest floor)`, () => {
          expect(
            actual[field],
            `${openingId}.${field}: actual ${actual[field]} < manifest floor ${declared[field]}. Either restore the missing content or LOWER the floor in opening-manifests.json (explicit demotion).`,
          ).toBeGreaterThanOrEqual(declared[field]);
        });
      }
    });
  }
});
