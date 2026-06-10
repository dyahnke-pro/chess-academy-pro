// Post-process the swindle scan output into ranked, deduped Trap + Warning
// candidates, mapped to the existing gem/warning schema (+ the refutation field).
// READ-ONLY: reads /tmp/swindle-all.json, writes /tmp/trap-candidates.json. No
// app content touched. Narration is authored LATER (separate step).
import { readFileSync, writeFileSync } from 'fs';

const raw = JSON.parse(readFileSync(process.env.IN || '/tmp/swindle-all.json', 'utf8'));

// dedupe by (opening, line-to-node, error move)
const seen = new Set();
const uniq = [];
for (const x of raw) {
  const k = `${x.opening}|${x.sanPath.join(' ')}|${x.error}`;
  if (seen.has(k)) continue;
  seen.add(k); uniq.push(x);
}

const traps = [], warnings = [];
for (const x of uniq) {
  const line = x.sanPath.join(' ');
  if (x.mode === 'trap') {
    // gem shape: your line ends in the bait, opponent errs, you punish
    traps.push({
      openingId: x.opening,
      lineMoves: line,                 // ends with YOUR bait move
      baitMove: x.baitMove,            // your lure (last move of lineMoves)
      inaccuracy: x.error,             // their common wrong reply
      errorGames: x.errorGames, errorPct: +(x.errorPctAll * 100).toFixed(1),
      punish: x.punish,                // your winning line (to the kill)
      refutation: x.refutation,        // their only correct move
      engineCp: x.studentAfter,        // your advantage (+)
      tier: 'trap',
      score: Math.round(Math.log10(Math.max(10, x.errorGames)) * Math.min(x.studentAfter, 800)),
    });
  } else {
    // warning shape: you're to move, a tempting move loses; teach the refutation
    warnings.push({
      openingId: x.opening,
      lineMoves: line,                 // the decision position (ends with THEIR setup)
      trapMove: x.error,               // YOUR tempting wrong move to AVOID
      errorGames: x.errorGames, errorPct: +(x.errorPctAll * 100).toFixed(1),
      disaster: x.punish,              // how they punish you if you play it
      refutation: x.refutation,        // what you should play instead
      victimEval: x.studentAfter,      // how bad it gets for you (−)
      tier: 'warning',
      score: Math.round(Math.log10(Math.max(10, x.errorGames)) * Math.min(-x.studentAfter, 800)),
    });
  }
}
traps.sort((a, b) => b.score - a.score);
warnings.sort((a, b) => b.score - a.score);

writeFileSync('/tmp/trap-candidates.json', JSON.stringify({ traps, warnings }, null, 1));

const fmt = (a, kind) => a.slice(0, 12).map(t =>
  kind === 'trap'
    ? `  [${String(t.score).padStart(4)}] ${t.openingId}: ${t.lineMoves}  ⟶ they err ${t.inaccuracy}(${t.errorGames}g) ⟶ ${t.punish.split(' ').slice(0,3).join(' ')} (+${t.engineCp}) | refute ${t.refutation}`
    : `  [${String(t.score).padStart(4)}] ${t.openingId}: ${t.lineMoves}  ⚠ avoid ${t.trapMove}(${t.errorGames}g) ⟶ ${t.disaster.split(' ').slice(0,3).join(' ')} (${t.victimEval}) | play ${t.refutation}`
).join('\n');

console.log(`=== TRAP candidates: ${traps.length} (top 12 by score) ===\n${fmt(traps, 'trap')}`);
console.log(`\n=== WARNING candidates: ${warnings.length} (top 12 by score) ===\n${fmt(warnings, 'warn')}`);
console.log(`\nwrote /tmp/trap-candidates.json (${traps.length} traps, ${warnings.length} warnings)`);
