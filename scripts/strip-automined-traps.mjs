// Surgical removal of auto-mined junk trapLines/warningLines from
// repertoire.json (David 2026-05-21: "delete that shit"). The junk has
// generic numbered names ("Discovered Attack #1", "Pitfall: tactic #2",
// "Tactic #6") — the signature is a trailing "#<number>". Genuinely-named
// traps (Elephant Trap, Kieninger Trap, Legal's Mate Reversal, Anderssen
// Attack, …) have NO trailing #N and are KEPT.
//
// All consumers (flashcardService, useOpeningProgress, RolodexRow,
// verifiedLineLibrary) read these via `?.length ?? 0` / `?? []`, so empty
// arrays degrade gracefully — verified before running. The Ruy masterclass
// named traps live in ruyTrapLessons.ts (separate) and are untouched.
//
// Dry run (default): node scripts/strip-automined-traps.mjs
// Apply:             node scripts/strip-automined-traps.mjs --apply

import { readFileSync, writeFileSync } from 'node:fs';

const PATH = 'src/data/repertoire.json';
const APPLY = process.argv.includes('--apply');
const JUNK = /#\s*\d+\s*$/; // trailing "#<number>" = auto-mined

const data = JSON.parse(readFileSync(PATH, 'utf8'));
const arr = Array.isArray(data) ? data : (data.openings ?? data.repertoire ?? null);
if (!arr) throw new Error('unexpected repertoire.json shape');

let delT = 0, delW = 0, keepT = 0, keepW = 0;
const kept = [];
for (const o of arr) {
  for (const field of ['trapLines', 'warningLines']) {
    const lines = o[field];
    if (!Array.isArray(lines) || lines.length === 0) continue;
    const keep = lines.filter((x) => !JUNK.test(x.name || ''));
    const removed = lines.length - keep.length;
    if (field === 'trapLines') { delT += removed; keepT += keep.length; }
    else { delW += removed; keepW += keep.length; }
    for (const k of keep) kept.push(`${o.id} :: ${field === 'trapLines' ? 'trap' : 'warn'} :: ${k.name}`);
    if (APPLY) o[field] = keep;
  }
}

console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — strip auto-mined traps`);
console.log(`  trapLines:    delete ${delT}, keep ${keepT}`);
console.log(`  warningLines: delete ${delW}, keep ${keepW}`);
console.log(`  KEPT (genuine named) — ${kept.length}:`);
for (const k of kept) console.log(`     ${k}`);

// Safety: prove the openings I'm building are fully cleared.
for (const id of ['ruy-lopez', 'pirc-defence']) {
  const o = arr.find((e) => e.id === id) || {};
  const t = (o.trapLines || []).filter((x) => !JUNK.test(x.name || '')).length;
  const w = (o.warningLines || []).filter((x) => !JUNK.test(x.name || '')).length;
  console.log(`  ${id}: ${t} trap + ${w} warn would remain (expect 0 + 0)`);
}

if (APPLY) {
  writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
  console.log('\nWritten. Remember to bump BASE_DATA_REVISION.');
} else {
  console.log('\n(dry run — no file written; re-run with --apply to write)');
}
