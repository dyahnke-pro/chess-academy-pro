#!/usr/bin/env node
/**
 * attach-notes — put the hand-written notes INTO the builds, keyed by position.
 *
 * David 2026-08-17: *"right now all we do is map each opening with the
 * narrations and save the builds for later"*, then *"i also want the narrations
 * attached to the perspective opening so i can test them in the morning."*
 *
 * A NOTE NAMES ITS ANCHOR BY MOVES, NEVER BY FEN. That is the whole design:
 * the FEN is looked up from the track, so there is no way to type one in and
 * therefore no way to typo one. This exists because I typed one by hand and got
 * it wrong — a bishop left on a square it had already been captured from, in a
 * note whose every sentence was otherwise sound. Making the mistake
 * unavailable beats catching it.
 *
 * A line the lesson never reached resolves to nothing and the note is REFUSED,
 * which is the same contract the rest of the pipeline keeps: silence over
 * invention.
 *
 * Notes live in `data/video-notes/<videoId>.json` — one file per lesson, written
 * by hand. They were previously a literal inside this script, which does not
 * survive a second video.
 *
 * Usage: node scripts/video-align/attach-notes.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TRACK_DIR = 'data/video-tracks';
const NOTE_DIR = 'data/video-notes';

const write = process.argv.includes('--write');
let totalAttached = 0;
let totalRefused = 0;

for (const file of readdirSync(TRACK_DIR).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
  const path = join(TRACK_DIR, file);
  const track = JSON.parse(readFileSync(path, 'utf8'));
  const notePath = join(NOTE_DIR, `${track.videoId}.json`);
  if (!existsSync(notePath)) continue;
  const notes = JSON.parse(readFileSync(notePath, 'utf8'));

  // Resolve every line the lesson walked to the position it produced. `line`
  // holds the moves ADDED at a step, not the whole line — a rewind re-enters at
  // a lower ply — so the full line is rebuilt as we go.
  const fenOf = new Map();
  {
    let line = [];
    for (const m of track.moves) {
      if (!m.line.length) continue;
      line = line.slice(0, m.ply - m.line.length);
      line.push(...m.line);
      const key = line.join(' ');
      if (!fenOf.has(key)) fenOf.set(key, { fen: m.fen, t: m.t, ply: m.ply });
    }
  }

  const attached = [];
  for (const n of notes) {
    const hit = fenOf.get(n.line);
    if (!hit) {
      console.error(`REFUSED ${n.id}: ${track.videoId} never reached "${n.line}"`);
      totalRefused += 1;
      continue;
    }
    attached.push({ ...n, fen: hit.fen, t: hit.t, ply: hit.ply, source: `yt:${track.videoId}` });
  }
  totalAttached += attached.length;
  console.log(`${track.videoId}: ${attached.length}/${notes.length} anchored`);
  if (write) {
    track.notes = attached;
    writeFileSync(path, JSON.stringify(track, null, 1));
  }
}

console.log(`\n${totalAttached} note(s) anchored, ${totalRefused} refused`);
if (totalRefused) process.exit(1);
