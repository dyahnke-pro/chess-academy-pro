#!/usr/bin/env node
/**
 * report-chunk — say WHAT a farm run actually brought back.
 *
 * David 2026-08-02: "Send me an update each time the farm sends a chunk. I want
 * to know what was received. Openings, plans, etc."
 *
 * A note count alone says nothing about whether a run was worth the runner
 * time — 400 notes about openings already covered is not the same as 400 that
 * open up lines the coach could not teach before. So this diffs the shipped
 * corpus between two git revisions and reports the teaching: which openings
 * arrived, which are BRAND NEW to the corpus, what phases they cover, and a
 * sample of the actual plans in the student's words.
 *
 * Usage:
 *   node scripts/danya-corpus/report-chunk.mjs <creator> [beforeRev] [afterRev]
 *   node scripts/danya-corpus/report-chunk.mjs saintlouis HEAD~1 HEAD
 *
 * Reads through `git show`, so it never needs the working tree to be at either
 * revision and can report on a commit the farm pushed while we were elsewhere.
 */
import { execSync } from 'node:child_process';

const creator = process.argv[2] ?? 'saintlouis';
const beforeRev = process.argv[3] ?? 'HEAD~1';
const afterRev = process.argv[4] ?? 'HEAD';
const FILE = `public/data/${creator}-teachings.json`;

/** The corpus at a revision, or null when the file did not exist yet. */
const at = (rev) => {
  try {
    return JSON.parse(execSync(`git show ${rev}:${FILE}`, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })).notes;
  } catch {
    return null;
  }
};

const before = at(beforeRev) ?? [];
const after = at(afterRev);
if (!after) {
  console.log(`no ${FILE} at ${afterRev} — nothing to report`);
  process.exit(0);
}

const beforeIds = new Set(before.map((n) => n.id));
const fresh = after.filter((n) => !beforeIds.has(n.id));
if (fresh.length === 0) {
  console.log(`${creator}: no new notes between ${beforeRev} and ${afterRev} (corpus holds ${after.length})`);
  process.exit(0);
}

// Openings the corpus could not teach at all before this chunk — the number
// that actually matters, since those are lessons that were impossible.
const openingsBefore = new Set(before.map((n) => n.opening).filter(Boolean));
const byOpening = new Map();
for (const n of fresh) {
  const key = n.opening ?? '(position-only, no opening tag)';
  byOpening.set(key, (byOpening.get(key) ?? 0) + 1);
}
const brandNew = [...byOpening.keys()].filter((o) => o !== '(position-only, no opening tag)' && !openingsBefore.has(o));

const phases = {};
for (const n of fresh) phases[n.phase] = (phases[n.phase] ?? 0) + 1;

const withPlans = fresh.filter((n) => n.plans?.trim());
const deepest = [...fresh].sort((a, b) => (b.lineSan?.length ?? 0) - (a.lineSan?.length ?? 0));

console.log(`\n📥 ${creator} — ${fresh.length} new notes (corpus now ${after.length})`);
console.log(`   phases: ${Object.entries(phases).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`   ${withPlans.length} carry a PLAN · ${fresh.filter((n) => n.lineSan?.length > 0).length} are position-keyed`);

if (brandNew.length > 0) {
  console.log(`\n🆕 openings the corpus could NOT teach before (${brandNew.length}):`);
  for (const o of brandNew.slice(0, 15)) console.log(`   • ${o} (${byOpening.get(o)})`);
  if (brandNew.length > 15) console.log(`   …and ${brandNew.length - 15} more`);
}

console.log(`\n📚 top openings in this chunk:`);
for (const [o, c] of [...byOpening.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`   ${String(c).padStart(4)}  ${o}${brandNew.includes(o) ? '  ← new' : ''}`);
}

console.log(`\n🧠 sample plans received:`);
for (const n of withPlans.slice(0, 5)) {
  console.log(`   [${n.opening ?? 'position'}] ${n.plans.replace(/\s+/g, ' ').slice(0, 150)}`);
}

console.log(`\n🔬 deepest lines taught:`);
for (const n of deepest.slice(0, 4)) {
  if (!n.lineSan?.length) continue;
  console.log(`   ${n.lineSan.length} plies — ${n.lineSan.join(' ').slice(0, 70)}`);
  console.log(`      ${(n.teaches || n.explains).replace(/\s+/g, ' ').slice(0, 130)}`);
}
console.log('');
