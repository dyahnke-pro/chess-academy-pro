#!/usr/bin/env node
// THE WRONG-ROOK-PAWN FORTRESS, proved exhaustively (Lane R, Level 22).
// See lib/wrongRookPawn.mjs for the claim. Prints one line per orientation and
// exits non-zero on any failure.
//   node scripts/scenarios/prove-wrong-rook-pawn-fortress.mjs
import { proveFortress } from './lib/wrongRookPawn.mjs';

let failed = false;
for (const [file, attacker] of [[7, 'w'], [0, 'w'], [7, 'b'], [0, 'b']]) {
  const t0 = Date.now();
  const r = proveFortress(file, attacker);
  console.log(JSON.stringify({ ...r, ms: Date.now() - t0 }));
  if (r.failures.length > 0 || r.states === 0) failed = true;
}
console.log(failed ? 'FORTRESS FAILED' : 'FORTRESS HOLDS in all four orientations');
process.exitCode = failed ? 1 : 0;
