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
const KEY_RE = /['"]([a-z0-9-]+::\d+::[^'"]+@\d+)['"]\s*:/g;

const byKey = new Map(); // key -> [files]
for (const [label, path] of Object.entries(FILES)) {
  if (!fs.existsSync(path)) { console.error(`MISSING FILE: ${path}`); process.exit(1); }
  const src = fs.readFileSync(path, 'utf8');
  for (const m of src.matchAll(KEY_RE)) {
    const k = m[1];
    (byKey.get(k) ?? byKey.set(k, []).get(k)).push(label);
  }
}

const dupes = [...byKey.entries()].filter(([, files]) => files.length > 1);
if (dupes.length) {
  console.error(`\n❌ ${dupes.length} DUPLICATE KEY(S) across files — one session's work is being silently overridden:`);
  for (const [k, files] of dupes) console.error(`   ${k}  →  [${files.join(', ')}]`);
  console.error(`\nFix: keep exactly ONE definition per key (per the WO group assignment) and delete the others.`);
  process.exit(1);
}

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
