/**
 * Apply the hand-adjudicated overrides on top of the automated trim.
 *
 * The trim proposes; this file disposes. Every passage the trim changed was read
 * one by one (David 2026-09-12); the ones it got wrong are corrected here by name.
 *
 * KEYED ON THE ORIGINAL TEXT, NOT ON (file, ply). A video can carry the same ply
 * more than once — YzI6qI-33_U has three ply-13 beats — so a ply key silently
 * edits the wrong beat and leaves the intended one untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DIR = 'data/video-narration-voiced';
const BASE = 'd05a9ac';
const { overrides } = JSON.parse(fs.readFileSync('scripts/corpus-sweep/manual-overrides.json', 'utf8'));
const write = process.argv.includes('--write');

let applied = 0;
for (const o of overrides) {
  const file = path.join(DIR, `${o.id}.json`);
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const orig = JSON.parse(execSync(`git show ${BASE}:${file}`, { maxBuffer: 1 << 26 }).toString());
  const hits = orig.moves
    .map((m, i) => (m.spoken === o.was ? i : -1))
    .filter((i) => i >= 0);
  if (hits.length !== 1) throw new Error(`${o.id}: 'was' matched ${hits.length} beats, need exactly 1`);
  const i = hits[0];
  const next = o.keep ? o.was : o.text;
  if (json.moves[i].spoken === next) { console.log(`= ${o.id} #${i} (already)`); continue; }
  console.log(`\n${o.id} #${i}\n  TRIM: ${json.moves[i].spoken || '(silenced)'}\n  HAND: ${next}`);
  json.moves[i].spoken = next;
  applied += 1;
  if (write) {
    const indent = (fs.readFileSync(file, 'utf8').match(/\n( +)"/) || [, ' '])[1];
    fs.writeFileSync(file, `${JSON.stringify(json, null, indent.length)}\n`);
  }
}
console.log(`\n${applied} override(s) ${write ? 'written' : 'dry run — pass --write'}`);
