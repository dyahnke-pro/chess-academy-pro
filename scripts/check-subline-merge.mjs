// Merge-safety check for the parallel subline-narration work (David 2026-06-18).
// The 3 group files (sublineNarration{E4E5,E4Other,D4Flank}.ts) + the base
// (sublineNarration.ts) are merged by JS object-spread in getSublineNarration.
// Spread is SILENT on collisions (last wins), so a key authored in two files
// means one session's work was dropped with no error. This script parses the
// keys out of all four files and HARD-FAILS on any cross-file duplicate, then
// reports coverage vs the full subline set. Run after pulling all three.
//
//   node scripts/check-subline-merge.mjs
import fs from 'node:fs';

const FILES = {
  base: 'src/data/lessons/sublineNarration.ts',
  A: 'src/data/lessons/sublineNarrationE4E5.ts',
  B: 'src/data/lessons/sublineNarrationE4Other.ts',
  C: 'src/data/lessons/sublineNarrationD4Flank.ts',
};
// Override layer: helper files INTENTIONALLY supersede a group's intro-only
// entry (deeper teach-past version wins via spread order). A helper-over-group
// dup is EXPECTED; dangerous dups are group-vs-group or helper-vs-helper (two
// authors of the same deep key — one is lost).
const OVERRIDE = {
  HA: 'src/data/lessons/sublineNarrationHelpA.ts',
  HA2: 'src/data/lessons/sublineNarrationHelpA2.ts',
  HB: 'src/data/lessons/sublineNarrationHelpB.ts',
  HC: 'src/data/lessons/sublineNarrationHelpC.ts',
  FIX: 'src/data/lessons/sublineNarrationFixes.ts',
};
const KEY_RE = /['"]([a-z0-9-]+::\d+::[^'"]+@\d+)['"]\s*:/g;
const isOverride = (f) => f === 'HA' || f === 'HA2' || f === 'HB' || f === 'HC' || f === 'FIX';

const byKey = new Map(); // key -> [files]
for (const [label, path] of Object.entries({ ...FILES, ...OVERRIDE })) {
  if (!fs.existsSync(path)) { if (isOverride(label)) continue; console.error(`MISSING FILE: ${path}`); process.exit(1); }
  const src = fs.readFileSync(path, 'utf8');
  for (const m of src.matchAll(KEY_RE)) {
    const k = m[1];
    (byKey.get(k) ?? byKey.set(k, []).get(k)).push(label);
  }
}

// Layer precedence (spread order): base < {A,B,C groups} < {HA,HB helpers}.
// Dangerous = two authors at the SAME layer (one is silently lost):
//   2+ of the group files {A,B,C}, or 2+ of the helper files {HA,HB}.
// base-vs-anything and helper-vs-group are intentional overrides (benign,
// the lower layer is just shadowed dead code → cleanup, not danger).
const dupes = [...byKey.entries()].filter(([, files]) => {
  const groups = files.filter((f) => f === 'A' || f === 'B' || f === 'C');
  const helpers = files.filter((f) => f === 'HA' || f === 'HA2' || f === 'HB' || f === 'HC'); // two authoring helpers on one key = lost work; FIX is the top layer — never a collision
  return groups.length > 1 || helpers.length > 1;
});
const shadowedBase = [...byKey.entries()].filter(([, files]) => files.includes('base') && files.length > 1);
if (shadowedBase.length) console.log(`(cleanup: ${shadowedBase.length} base entries shadowed by a deeper group/helper version — strippable dead code)`);
const overrideCount = [...byKey.values()].filter((files) => files.some(isOverride) && files.length > 1).length;
if (dupes.length) {
  console.error(`\n❌ ${dupes.length} DANGEROUS DUPLICATE KEY(S) — two authors of the same key, one is lost:`);
  for (const [k, files] of dupes) console.error(`   ${k}  →  [${files.join(', ')}]`);
  console.error(`\nFix: keep exactly ONE definition per key (per the WO assignment) and delete the others.`);
  process.exit(1);
}
if (overrideCount) console.log(`(override layer: ${overrideCount} helper keys intentionally supersede a group intro-only entry — OK)`);

// Coverage report
const d = JSON.parse(fs.readFileSync('src/data/course-sublines.json', 'utf8'));
let total = 0;
const realKeys = new Set();
for (const [openingId, vars] of Object.entries(d)) {
  for (const [vi, list] of Object.entries(vars)) {
    for (const s of list) { total++; realKeys.add(`${openingId}::${vi}::${s.triggerMove}@${s.atPly}`); }
  }
}
const authored = [...byKey.keys()];
const orphans = authored.filter((k) => !realKeys.has(k));
if (orphans.length) {
  console.error(`\n❌ ${orphans.length} authored key(s) DON'T match any real subline (typo in opening/index/move):`);
  for (const k of orphans.slice(0, 20)) console.error(`   ${k}`);
  process.exit(1);
}

const touchedOpenings = new Set(authored.map((k) => k.split('::')[0]));
console.log('✅ no duplicate keys, no orphan keys');
console.log(`authored: ${authored.length} / ${total} sublines (${(authored.length / total * 100).toFixed(1)}%)`);
console.log(`openings touched: ${touchedOpenings.size} / ${Object.keys(d).length}`);
console.log('\nNext: npx tsc --noEmit && npx vitest run src/data/lessons/sublineNarration.test.ts && npm run ship-check');
