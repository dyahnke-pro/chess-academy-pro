// print-spine — emit the EXACT spine the runtime walkthrough will walk for
// an opening name, as JSON on stdout. The bake script (narrate-from-video)
// must narrate THIS line, not its own guess: `bakedNarrationFor` requires a
// ply-for-ply prefix match against the runtime spine, so a bake built on a
// shorter/different resolution would never hit.
//
//   npx tsx scripts/danya-corpus/print-spine.mts "latvian gambit"
import {
  resolveOpeningEntry,
  resolveCuratedVariation,
  resolveTeachSpine,
  inferStudentSideFromName,
} from '../../src/services/openingDetectionService';

const name = process.argv[2];
if (!name) {
  console.error('usage: npx tsx scripts/danya-corpus/print-spine.mts "<opening name>"');
  process.exit(1);
}
const entry = resolveCuratedVariation(name) ?? resolveOpeningEntry(name);
if (!entry || entry.moves.length === 0) {
  console.error(`no opening resolves for "${name}"`);
  process.exit(1);
}
const spine = resolveTeachSpine(entry.canonicalName, entry.moves, { extendToMiddlegame: true });
console.log(
  JSON.stringify({
    canonicalName: entry.canonicalName,
    eco: entry.eco,
    studentSide: inferStudentSideFromName(entry.canonicalName),
    spineMoves: spine.spineMoves,
    extendedToMiddlegame: spine.extendedToMiddlegame,
    branchCount: spine.branches.length,
  }),
);
