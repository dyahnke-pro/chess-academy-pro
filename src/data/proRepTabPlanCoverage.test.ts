// Tab-Plan Resolver Coverage Gate (David 2026-05-29, locked).
//
// Catches the failure mode where a pro-rep variation has middlegame
// plans authored but no resolver wired up — all plans then surface
// under the MAIN opening tab and the variation tabs show "no plans
// for this scope" (or the emptyNote fallback). Hit on the Alapin
// build (per doctrine STEP 12.5 — "this step was missed in the
// Alapin reference build — David caught it post-deploy").
//
// The test walks every pro-rep opening + variation and confirms a
// resolver returns SOME result (even []) for each (openingId,
// variationName) pair. An explicit [] declares "no plans for this
// tab yet" — that's allowed. `null` means no resolver registered —
// that's the bug.

import { describe, it, expect } from 'vitest';
import proRepertoires from './pro-repertoires.json' assert { type: 'json' };
import { getProNaroditskyAlapinTabPlanIds } from '../services/proNaroditskyAlapinTabPlans';
import { getProNaroditskyKIDTabPlanIds } from '../services/proNaroditskyKIDTabPlans';
import { getProNaroditskyRemainingTabPlanIds } from '../services/proNaroditskyRemainingTabPlans';
import { getProNaroditskyCaroTabPlanIds } from '../services/proNaroditskyCaroTabPlans';
import { getProEricRosenStaffordTabPlanIds } from '../services/proEricRosenStaffordTabPlans';
import { getProEricRosenLondonTabPlanIds } from '../services/proEricRosenLondonTabPlans';
import { getProEricRosenSicilianTabPlanIds } from '../services/proEricRosenSicilianTabPlans';
import { getProEricRosenQGDTabPlanIds } from '../services/proEricRosenQGDTabPlans';
import { getProEricRosenBudapestTabPlanIds } from '../services/proEricRosenBudapestTabPlans';
import { getProEricRosenClosedSicilianTabPlanIds } from '../services/proEricRosenClosedSicilianTabPlans';
import { getProEricRosenScandinavianTabPlanIds } from '../services/proEricRosenScandinavianTabPlans';
import { getProEricRosenFrenchTabPlanIds } from '../services/proEricRosenFrenchTabPlans';
import { getProCarlsenTabPlanIds } from '../services/proCarlsenTabPlans';
import { getProSamayRainaOpenSicilianTabPlanIds } from '../services/proSamayRainaOpenSicilianTabPlans';
import { getProSamayRainaRuyTabPlanIds } from '../services/proSamayRainaRuyTabPlans';
import { getProSamayRainaItalianTabPlanIds } from '../services/proSamayRainaItalianTabPlans';
import { getProSamayRainaFrenchWhiteTabPlanIds } from '../services/proSamayRainaFrenchWhiteTabPlans';
import { getProSamayRainaCaroWhiteTabPlanIds } from '../services/proSamayRainaCaroWhiteTabPlans';
import { getProSamayRainaOpenE5TabPlanIds } from '../services/proSamayRainaOpenE5TabPlans';
import { getProSamayRainaSicilianBlackTabPlanIds } from '../services/proSamayRainaSicilianBlackTabPlans';
import { getProSamayRainaScandiTabPlanIds } from '../services/proSamayRainaScandiTabPlans';
import { getProSamayRainaKingsGambitTabPlanIds } from '../services/proSamayRainaKingsGambitTabPlans';

interface ProRepEntry {
  id: string;
  variations?: Array<{ name: string }>;
}

const PRO_OPENINGS: ProRepEntry[] = (proRepertoires.openings as ProRepEntry[]).filter(
  (op) => op.id.startsWith('pro-'),
);

// The resolver chain mirrors OpeningDetailPage.tsx — keep in sync.
const RESOLVERS: Array<(openingId: string, tabKey: string) => string[] | null> = [
  getProNaroditskyAlapinTabPlanIds,
  getProNaroditskyKIDTabPlanIds,
  getProNaroditskyRemainingTabPlanIds,
  getProNaroditskyCaroTabPlanIds,
  getProEricRosenStaffordTabPlanIds,
  getProEricRosenLondonTabPlanIds,
  getProEricRosenSicilianTabPlanIds,
  getProEricRosenQGDTabPlanIds,
  getProEricRosenBudapestTabPlanIds,
  getProEricRosenClosedSicilianTabPlanIds,
  getProEricRosenScandinavianTabPlanIds,
  getProEricRosenFrenchTabPlanIds,
  getProCarlsenTabPlanIds,
  getProSamayRainaOpenSicilianTabPlanIds,
  getProSamayRainaRuyTabPlanIds,
  getProSamayRainaItalianTabPlanIds,
  getProSamayRainaFrenchWhiteTabPlanIds,
  getProSamayRainaCaroWhiteTabPlanIds,
  getProSamayRainaOpenE5TabPlanIds,
  getProSamayRainaSicilianBlackTabPlanIds,
  getProSamayRainaScandiTabPlanIds,
  getProSamayRainaKingsGambitTabPlanIds,
];

function resolve(openingId: string, variationName: string): string[] | null {
  const tabKey = variationName.toLowerCase();
  for (const r of RESOLVERS) {
    const result = r(openingId, tabKey);
    if (result !== null) return result;
  }
  return null;
}

describe('tab-plan resolver coverage gate — every Naroditsky variation has a resolver', () => {
  // Baseline of known-unresolved (Gothamchess pro-rep + other partial
  // builds). Same shrinks-only contract as orphanLessons. Naroditsky
  // openings have full resolver coverage per STEP 12.5 — no
  // Naroditsky entries should appear in this baseline.
  const BASELINE_UNRESOLVED = new Set<string>([
    // Aman Hambleton pro-rep (parallel build) — variations declared, tab-plan
    // resolvers not yet authored. Grandfathered; drop as resolvers land.
    'pro-aman-anti-caro', 'pro-aman-caro-kann', 'pro-aman-french-white',
    'pro-aman-nimzo-indian', 'pro-aman-open-sicilian', 'pro-aman-reti',
    'pro-aman-rossolimo', 'pro-aman-ruy-lopez', 'pro-aman-sicilian-kan',
    // Gothamchess pro-rep is a partial build — variations declared but
    // tab-plan resolvers not yet authored.
    'pro-gothamchess-anti-sicilian',
    'pro-gothamchess-caro-advance-white',
    'pro-gothamchess-caro-kann',
    'pro-gothamchess-closed-sicilian',
    'pro-gothamchess-english',
    'pro-gothamchess-fantasy-caro',
    'pro-gothamchess-french-defense',
    'pro-gothamchess-italian',
    'pro-gothamchess-kia',
    'pro-gothamchess-london',
    'pro-gothamchess-milner-barry',
    'pro-gothamchess-pirc-defense',
    'pro-gothamchess-ponziani',
    'pro-gothamchess-qgd',
    'pro-gothamchess-scandinavian',
    'pro-gothamchess-stafford-refute',
    'pro-gothamchess-trompowsky',
    'pro-gothamchess-vienna',
    // Fantasy Caro standalone — variations declared but no resolver
    // (one variation 'Black accepts with dxe4' IS routed via the
    // Remaining resolver to a Fantasy plan; the other 2 variations
    // are not, awaiting middlegame plan authoring).
    'pro-naroditsky-fantasy-caro',
    // Hikaru pro-rep (2026-05-31 build) — variations declared but
    // tab-plan resolvers not yet authored. Deferred deferral, same as
    // the Gothamchess partials above; drop each as its resolver lands.
    'pro-hikaru-nimzo-larsen',
    'pro-hikaru-closed-sicilian',
    'pro-hikaru-reti',
    'pro-hikaru-pirc-modern',
    'pro-hikaru-caro-kann',
    // Caruana pro-rep (2026-06-01 build) — variations declared but tab-plan
    // resolvers not yet authored. Deferred, same as the partials above.
    'pro-caruana-ruy-lopez',
    'pro-caruana-nimzo-indian',
    'pro-caruana-taimanov',
    // Caruana round-2 openings (+4) — variations declared, resolvers deferred.
    'pro-caruana-italian',
    'pro-caruana-french',
    'pro-caruana-caro-kann',
    'pro-caruana-kid',
  ]);

  it('every pro-rep (openingId, variationName) pair has a resolver returning array (not null)', () => {
    const unresolved: string[] = [];
    for (const opening of PRO_OPENINGS) {
      if (BASELINE_UNRESOLVED.has(opening.id)) continue;
      for (const v of opening.variations ?? []) {
        const result = resolve(opening.id, v.name);
        if (result === null) {
          unresolved.push(`${opening.id}::${v.name}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it('baseline-unresolved openings only shrink — every baseline opening must still have at least one unresolved variation', () => {
    const stale: string[] = [];
    for (const openingId of BASELINE_UNRESOLVED) {
      const opening = PRO_OPENINGS.find((op) => op.id === openingId);
      if (!opening) {
        stale.push(`${openingId} — opening not in pro-repertoires.json, drop from BASELINE_UNRESOLVED`);
        continue;
      }
      const hasUnresolved = (opening.variations ?? []).some(
        (v) => resolve(opening.id, v.name) === null,
      );
      if (!hasUnresolved && (opening.variations?.length ?? 0) > 0) {
        stale.push(`${openingId} — every variation now resolves, drop from BASELINE_UNRESOLVED`);
      }
    }
    expect(stale).toEqual([]);
  });
});
