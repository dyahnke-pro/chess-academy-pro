#!/usr/bin/env node
/**
 * retag-openings — re-stamp distilled videos with the CURRENT title matcher.
 *
 * The opening tag is decided once, at distill time, and then frozen into every
 * note the video produced. So a matcher bug does not just mislabel future runs
 * — it is already baked into everything distilled before the fix. On 2026-08-02
 * `openingFromTitle` accepted a name segment made of one ordinary word, and
 * "Capablanca's Endgames | Insane in the Endgame" shipped as Caro-Kann Defense:
 * Endgame Variation, along with 2,001 notes of generic technique.
 *
 * Re-running the matcher costs nothing (no model calls) and repairs the tag in
 * place; the next merge rebuilds the corpus from these files. A video that no
 * longer resolves to any opening loses the tag rather than keeping a wrong one
 * — merge then drops notes that have neither an opening nor a position, which
 * is the correct outcome for teaching that was never about an opening at all.
 *
 * Usage: node scripts/danya-corpus/retag-openings.mjs [--creator k] [--apply]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolveCreator } from './creator.mjs';
import { openingFromTitle } from './distill-v2.mjs';

const CREATOR = resolveCreator();
const APPLY = process.argv.includes('--apply');
const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
const dbNames = [...new Set((Array.isArray(db) ? db : db.openings ?? []).map((o) => o.name).filter(Boolean))];

const dir = CREATOR.distilledV2;
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
let changed = 0; let cleared = 0; let notesRetagged = 0; let notesCleared = 0;
const examples = [];

for (const f of files) {
  const path = `${dir}/${f}`;
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const before = j.stats?.stampedOpening ?? null;
  const after = openingFromTitle(j.openingHint || j.title || '', dbNames);
  if (before === after) continue;
  changed += 1;
  if (!after) cleared += 1;
  if (examples.length < 12) examples.push(`${(j.title ?? '').slice(0, 52)}\n      ${before} → ${after ?? '(no opening)'}`);
  for (const n of j.notes ?? []) {
    if (n.opening !== before) continue;
    if (after) { n.opening = after; notesRetagged += 1; } else { delete n.opening; notesCleared += 1; }
  }
  if (j.stats) j.stats.stampedOpening = after;
  if (APPLY) writeFileSync(path, JSON.stringify(j));
}

console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'} — ${files.length} distilled videos scanned`);
console.log(`  videos re-stamped : ${changed}  (${cleared} lost their tag entirely)`);
console.log(`  notes re-tagged   : ${notesRetagged}`);
console.log(`  notes un-tagged   : ${notesCleared}  (merge drops these unless position-keyed)`);
console.log('\n  examples:');
for (const e of examples) console.log(`    • ${e}`);
if (!APPLY) console.log('\n  re-run with --apply to write.');
