#!/usr/bin/env node
/**
 * narration-queue — what is ready to be hand-written, deepest line first.
 *
 * Every banked track is an unpaid debt against the standard (CLAUDE.md: "EVERY
 * LINE PULLED GETS HAND-WRITTEN NOTES"), so the useful question at the start of
 * a writing session is not "what is banked" but "what can I actually write
 * against right now". Three things have to be true:
 *
 *   1. the track resolves to a SUBJECT opening — the lesson is about that line,
 *      not merely passing through it, so a note has somewhere to belong;
 *   2. captions are banked — a note is written FROM the captions, and the gate
 *      `videoNoteCaptions.test.ts` refuses one that is not;
 *   3. no notes exist for it yet.
 *
 * Ordered by the depth of the subject line, because a deeper line settles on
 * more positions and therefore carries more anchorable moments per hour spent.
 * Fork count is printed alongside: forks are the "other tries here" content and
 * a track with several is worth more than its ply count alone suggests.
 *
 * Usage: node scripts/video-align/narration-queue.mjs [--ids] [limit]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const idsOnly = process.argv.includes('--ids');
const limit = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 0) || Infinity;

const dirIds = (dir, suffix) =>
  existsSync(dir)
    ? new Set(readdirSync(dir).filter((f) => f.endsWith(suffix)).map((f) => f.slice(0, -suffix.length)))
    : new Set();

const noted = dirIds('data/video-notes', '.json');
const captioned = dirIds('data/video-transcripts', '.vtt.gz');

// by-opening.json is written by map-openings and covers the pending bank; the
// shipped bank is read the same way so a track does not fall out of the queue
// just because it graduated to data/video-tracks.
const best = new Map();
for (const src of ['data/video-pending/by-opening.json', 'data/video-tracks/by-opening.json']) {
  if (!existsSync(src)) continue;
  for (const [opening, list] of Object.entries(JSON.parse(readFileSync(src, 'utf8')))) {
    for (const v of list) {
      if (!v.subject) continue;
      const cur = best.get(v.videoId);
      if (!cur || v.plies > cur.plies) best.set(v.videoId, { opening, plies: v.plies, forks: v.forks ?? 0 });
    }
  }
}

const unnoted = [...best.entries()].filter(([id]) => !noted.has(id));
const awaitingCaptions = unnoted.filter(([id]) => !captioned.has(id)).length;

const rows = unnoted
  .filter(([id]) => captioned.has(id))
  .map(([id, m]) => ({ id, ...m }))
  .sort((a, b) => b.plies - a.plies || b.forks - a.forks)
  .slice(0, limit);

if (idsOnly) {
  for (const r of rows) console.log(r.id);
} else {
  console.log(`${rows.length} track(s) ready to write (of ${best.size} banked with a subject opening)`);
  console.log(`  ${noted.size} already have notes; ${awaitingCaptions} un-noted track(s) still waiting on captions`);
  for (const r of rows) {
    console.log(`  ${r.id}  ${String(r.plies).padStart(3)}p ${String(r.forks).padStart(2)}f  ${r.opening}`);
  }
}
