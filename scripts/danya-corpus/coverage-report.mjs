#!/usr/bin/env node
/**
 * coverage-report — every opening the app can teach, and how deeply.
 *
 * David 2026-08-02: "I want to see a compiled list of all openings we can teach
 * including middle and endgames. With a total number of notes."
 *
 * Pulls together the four things that decide whether an opening is teachable,
 * which live in four different places:
 *   • the farmed corpora (danya / chessbrah / hangingpawns / saintlouis) —
 *     counted PER PHASE, since an opening with 200 opening notes and no
 *     middlegame notes teaches a very different lesson from one with both
 *   • hand-authored masterclass lessons (instant, verified, no notes needed)
 *   • baked narration (offline-generated, reviewed, gated)
 *   • curated punish gems (the weapons that surface in the lesson)
 *
 * Opening names arrive in two vocabularies that do not agree — the app writes
 * British spellings and diacritics, the corpus tags come from the Lichess DB in
 * American ASCII — so everything folds through one normalizer before counting,
 * or "French Defence" and "French Defense" show up as two openings.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };

const norm = (s) => (s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9\s:,-]/g, ' ').replace(/\s+/g, ' ').trim()
  .replace(/\bdefence\b/g, 'defense').replace(/\bcentre\b/g, 'center');

const CORPORA = [
  ['danya', 'src/data/danya-teachings.json'],
  ['chessbrah', 'src/data/chessbrah-teachings.json'],
  ['hangingpawns', 'public/data/hangingpawns-teachings.json'],
  ['saintlouis', 'public/data/saintlouis-teachings.json'],
  ['gothamchess', 'public/data/gothamchess-teachings.json'],
  ['hikaru', 'public/data/hikaru-teachings.json'],
  ['imrosen', 'public/data/imrosen-teachings.json'],
  ['magnuscarlsen', 'public/data/magnuscarlsen-teachings.json'],
];

/** opening → { display, opening, middlegame, endgame, concept, total, sources:Set } */
const rows = new Map();
const touch = (name) => {
  const key = norm(name);
  if (!rows.has(key)) {
    rows.set(key, { display: name, opening: 0, middlegame: 0, endgame: 0, concept: 0, total: 0, sources: new Set() });
  }
  return rows.get(key);
};

let grand = 0;
for (const [label, path] of CORPORA) {
  const bundle = read(path);
  if (!bundle?.notes) continue;
  for (const n of bundle.notes) {
    if (!n.opening) continue; // position-only notes belong to no opening
    const r = touch(n.opening);
    const phase = ['opening', 'middlegame', 'endgame', 'concept'].includes(n.phase) ? n.phase : 'concept';
    r[phase] += 1;
    r.total += 1;
    r.sources.add(label);
    grand += 1;
  }
}

// Masterclass + baked + gems: teachable WITHOUT notes, so they must appear even
// at zero note count or the list understates what the app can actually teach.
const marks = new Map();
const mark = (name, flag) => {
  const key = norm(name);
  if (!marks.has(key)) marks.set(key, new Set());
  marks.get(key).add(flag);
  if (!rows.has(key)) touch(name);
};

const baked = read('src/data/walkthrough-narrations.json');
for (const name of Object.keys(baked?.narrations ?? {})) mark(name, 'baked');

const gems = [...(read('src/data/punish-gems.json') ?? []), ...(read('src/data/gambit-punish-gems.json') ?? [])];
const gemsByOpening = new Map();
for (const g of gems) {
  if (g.tier !== 'confirmed' && g.tier !== 'positional') continue;
  gemsByOpening.set(g.openingId, (gemsByOpening.get(g.openingId) ?? 0) + 1);
}
const repertoire = read('src/data/repertoire.json') ?? [];
const idToName = new Map(repertoire.filter((e) => e.id && e.name).map((e) => [e.id, e.name]));
for (const [id, count] of gemsByOpening) {
  const name = idToName.get(id);
  if (!name) continue;
  mark(name, `${count} gems`);
}
for (const e of repertoire) if (e.name) mark(e.name, 'masterclass');

const all = [...rows.entries()].map(([key, r]) => ({ ...r, key, extra: [...(marks.get(key) ?? [])] }));
all.sort((a, b) => b.total - a.total || a.display.localeCompare(b.display));

const withMid = all.filter((r) => r.middlegame > 0).length;
const withEnd = all.filter((r) => r.endgame > 0).length;
const full = all.filter((r) => r.opening > 0 && r.middlegame > 0 && r.endgame > 0);

const out = [];
out.push('# Openings the app can teach');
out.push('');
out.push(`**${all.length} openings** · **${grand.toLocaleString()} notes** across ${CORPORA.length} corpora`);
out.push('');
out.push(`- ${withMid} have MIDDLEGAME teaching`);
out.push(`- ${withEnd} have ENDGAME teaching`);
out.push(`- **${full.length} are complete** — opening + middlegame + endgame all covered`);
out.push('');
out.push('Opening | Notes | Opening | Middle | End | Concept | Also');
out.push('---|---:|---:|---:|---:|---:|---');
for (const r of all) {
  if (r.total === 0 && r.extra.length === 0) continue;
  out.push([
    r.display, r.total || '—', r.opening || '', r.middlegame || '', r.endgame || '',
    r.concept || '', r.extra.join(', ') || '',
  ].join(' | '));
}

const path = 'audit-reports/teachable-openings.md';
writeFileSync(path, out.join('\n'));
console.log(out.slice(0, 12).join('\n'));
console.log(`\n…full table written to ${path} (${all.length} rows)`);
console.log(`\nCOMPLETE (opening+middlegame+endgame): ${full.length}`);
for (const r of full.slice(0, 20)) {
  console.log(`  ${String(r.total).padStart(5)}  ${r.display}  [o${r.opening}/m${r.middlegame}/e${r.endgame}]`);
}
