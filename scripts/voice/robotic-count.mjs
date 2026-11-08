#!/usr/bin/env node
/**
 * HOW ROBOTIC IS THE COACH? (David 2026-11-08: "I want all narrations to
 * follow this pattern" — the human register: lead with the piece, players'
 * words, the full name once, one idea a sentence, end on what it means.)
 *
 * Counts the robotic patterns in every spoken line of the decision baseline
 * (four real games × Review, Learn, chat, lessons), per surface and per
 * pattern, and prints the worst lines of each. Read-only; the gate that holds
 * the count lives in `src/test/humanVoice.gate.test.ts`.
 *
 *   node scripts/voice/robotic-count.mjs [--samples=N] [--json]
 */
import fs from 'node:fs';
import { roboticMarks, MARKS } from './robotic-marks.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const SAMPLES = Number(args.samples ?? 3);
const baseline = JSON.parse(fs.readFileSync('src/test/fixtures/decision-baseline.json', 'utf8'));

const bySurface = {};
const byMark = Object.fromEntries(MARKS.map((m) => [m, []]));
let lines = 0;
for (const [key, rec] of Object.entries(baseline)) {
  const surface = key.split(':')[0];
  bySurface[surface] ??= { lines: 0, marked: 0, marks: 0 };
  for (const raw of rec.spoken) {
    const text = raw.replace(/^\d+:\s*/, '');
    if (!text.trim()) continue;
    lines += 1;
    bySurface[surface].lines += 1;
    const marks = roboticMarks(text);
    if (marks.length) bySurface[surface].marked += 1;
    bySurface[surface].marks += marks.length;
    for (const m of marks) byMark[m.mark].push({ key, text, hit: m.hit });
  }
}

if (args.json) {
  console.log(JSON.stringify({ lines, bySurface, byMark: Object.fromEntries(Object.entries(byMark).map(([k, v]) => [k, v.length])) }, null, 2));
} else {
  console.log(`spoken lines: ${lines}`);
  for (const [s, r] of Object.entries(bySurface)) console.log(`  ${s.padEnd(7)} ${r.marked}/${r.lines} lines marked, ${r.marks} marks`);
  console.log('\nby pattern:');
  for (const [m, hits] of Object.entries(byMark).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${m.padEnd(16)} ${hits.length}`);
    for (const h of hits.slice(0, SAMPLES)) console.log(`      [${h.key}] …${h.hit}…  ← ${h.text.slice(0, 220)}`);
  }
}
