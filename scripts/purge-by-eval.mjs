#!/usr/bin/env node
/**
 * Unified accuracy purge across repertoire.json, pro-repertoires.json,
 * and gambits.json using a fresh Stockfish audit report. Keeps a line
 * only if it meets the accuracy bar:
 *   trap    : studentEval >= +150cp OR mate-for-student
 *   warning : studentEval <= -150cp OR mate-against-student
 * Everything below the bar is removed. (David 2026-05-20: 100%
 * accurate lines before narration.)
 *
 *   node scripts/purge-by-eval.mjs <audit-report-dir>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const BAR = 150;
const dir = process.argv[2];
if (!dir) { console.error('usage: purge-by-eval.mjs <audit-dir>'); process.exit(1); }
const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf-8'));

// Build keep-set keyed by source||openingId||name||role
const keep = new Set();
for (const e of report.results) {
  const se = e.studentEval;
  let ok = false;
  if (se?.type === 'mate') ok = e.role === 'trap' ? se.value > 0 : se.value < 0;
  else if (se?.type === 'cp') ok = e.role === 'trap' ? se.value >= BAR : se.value <= -BAR;
  if (ok) keep.add(`${e.source}||${e.openingId}||${e.name}||${e.role}`);
}

function purge(path, source, accessor) {
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const arr = accessor(data);
  let tB = 0, tA = 0, wB = 0, wA = 0;
  for (const op of arr) {
    if (Array.isArray(op.trapLines)) {
      tB += op.trapLines.length;
      op.trapLines = op.trapLines.filter((t) => keep.has(`${source}||${op.id}||${t.name}||trap`));
      tA += op.trapLines.length;
    }
    if (Array.isArray(op.warningLines)) {
      wB += op.warningLines.length;
      op.warningLines = op.warningLines.filter((w) => keep.has(`${source}||${op.id}||${w.name}||warning`));
      wA += op.warningLines.length;
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`${source}: traps ${tB}->${tA}, warnings ${wB}->${wA}`);
  return arr;
}

console.log(`=== PURGE BY EVAL (bar ±${BAR}cp) ===`);
const rep = purge('src/data/repertoire.json', 'repertoire', (d) => Array.isArray(d) ? d : Object.values(d));
purge('src/data/pro-repertoires.json', 'pro-repertoires', (d) => d.openings ?? []);
purge('src/data/gambits.json', 'gambits', (d) => Array.isArray(d) ? d : Object.values(d));

console.log('\nMain-repertoire openings now <3 traps or <3 pitfalls:');
let gaps = 0;
for (const op of rep) {
  const t = (op.trapLines || []).length, w = (op.warningLines || []).length;
  if (t < 3 || w < 3) { console.log(`  ${op.id}: ${t} traps, ${w} pitfalls`); gaps++; }
}
if (gaps === 0) console.log('  none — all >= 3+3');
