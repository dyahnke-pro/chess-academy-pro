// tier-coverage — for each candidate opening, report which TIER serves it at
// runtime, so a batch bake targets exactly the gaps (David 2026-07-31: "Do all
// openings now… Tier 2 openings fully in effect?").
//
// Tier 1 = a masterclass LessonScript adapts for the inferred student side.
// Tier 2 = a baked video narration already covers the runtime spine.
// Tier 3 = computed generation (the LLM/template path) — THESE ARE THE GAPS.
//
//   npx tsx scripts/danya-corpus/tier-coverage.mts "name one" "name two" …
import {
  resolveOpeningEntry,
  resolveCuratedVariation,
  resolveTeachSpine,
  inferStudentSideFromName,
} from '../../src/services/openingDetectionService';
import { masterclassWalkthroughTree } from '../../src/services/masterclassWalkthroughAdapter';
import { bakedNarrationFor } from '../../src/services/bakedWalkthroughNarration';

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error('usage: npx tsx scripts/danya-corpus/tier-coverage.mts "<name>" …');
  process.exit(1);
}

for (const name of names) {
  const entry = resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
  if (!entry || entry.moves.length === 0) {
    console.log(JSON.stringify({ ask: name, tier: 'UNRESOLVED' }));
    continue;
  }
  const side = inferStudentSideFromName(entry.canonicalName);
  const spine = resolveTeachSpine(entry.canonicalName, entry.moves, { extendToMiddlegame: true });
  const t1 = masterclassWalkthroughTree(name, side);
  const baked = bakedNarrationFor(entry.canonicalName, spine.spineMoves);
  const branchesCovered =
    baked !== null &&
    spine.branches.every((b) => {
      const bn = baked.branchNarrations?.[b.san];
      return bn !== undefined && bn.ideas.length >= b.extensionMoves.length;
    });
  console.log(
    JSON.stringify({
      ask: name,
      canonicalName: entry.canonicalName,
      side,
      plies: spine.spineMoves.length,
      branches: spine.branches.length,
      tier: t1 ? 1 : baked ? 2 : 3,
      fullyBaked: baked !== null && branchesCovered,
      spine: spine.spineMoves.join(' '),
      branchSans: spine.branches.map((b) => b.san),
    }),
  );
}
