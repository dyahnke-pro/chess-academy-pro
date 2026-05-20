#!/usr/bin/env node
/**
 * Purge inaccurate trap/warning lines from repertoire.json +
 * pro-repertoires.json. Keeps ONLY entries the Stockfish audit
 * flagged status=OK:
 *   - trap OK    = student ends decisively better (real weapon)
 *   - warning OK = student ends losing (real pitfall)
 * Everything else (WEAK traps that don't deliver an edge, BROKEN
 * traps where the student is losing, toothless warnings) is removed.
 *
 * David's directive 2026-05-20: "once ALL lines are 100% accurate
 * we can add narration." A trap that doesn't win or a warning that
 * doesn't punish is inaccurate — gone.
 *
 * Writes back in place. Re-mine afterwards to backfill traps.
 *
 *   node scripts/purge-inaccurate-lines.mjs <audit-report-dir>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const reportDir = process.argv[2];
if (!reportDir) { console.error('usage: purge-inaccurate-lines.mjs <audit-dir>'); process.exit(1); }
const report = JSON.parse(readFileSync(`${reportDir}/report.json`, 'utf-8'));

// keepSet keyed by source||openingId||name
const keep = new Set();
for (const e of report.results) {
  if (e.status === 'OK') keep.add(`${e.source}||${e.openingId}||${e.name}`);
}

function purgeFile(path, source, openingsAccessor) {
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const arr = openingsAccessor(data);
  let trapsBefore = 0, trapsAfter = 0, warnsBefore = 0, warnsAfter = 0;
  for (const op of arr) {
    if (Array.isArray(op.trapLines)) {
      trapsBefore += op.trapLines.length;
      op.trapLines = op.trapLines.filter((t) => keep.has(`${source}||${op.id}||${t.name}`));
      trapsAfter += op.trapLines.length;
    }
    if (Array.isArray(op.warningLines)) {
      warnsBefore += op.warningLines.length;
      op.warningLines = op.warningLines.filter((w) => keep.has(`${source}||${op.id}||${w.name}`));
      warnsAfter += op.warningLines.length;
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${path}:`);
  console.log(`  traps    ${trapsBefore} -> ${trapsAfter}`);
  console.log(`  warnings ${warnsBefore} -> ${warnsAfter}`);
  return { arr };
}

console.log('=== PURGE INACCURATE LINES ===');
const rep = purgeFile('src/data/repertoire.json', 'repertoire',
  (d) => (Array.isArray(d) ? d : Object.values(d)));
const pro = purgeFile('src/data/pro-repertoires.json', 'pro-repertoires',
  (d) => d.openings ?? []);

// Report openings now low on traps (for re-mine targeting)
console.log('\nMain openings with <3 traps after purge (re-mine targets):');
for (const op of rep.arr) {
  const n = (op.trapLines ?? []).length;
  if (n < 3) console.log(`  ${op.id}: ${n} traps`);
}
