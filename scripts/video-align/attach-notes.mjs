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
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

// BOTH DIRECTORIES, BECAUSE A NOTE IS WRITTEN AGAINST A STAGED TRACK. A build
// lands in `video-pending` and only moves to `video-tracks` once its notes are
// written — but this script used to read `video-tracks` alone, so there was no
// way to attach the notes that would earn the move. 260 staged tracks were
// unreachable by the note pipeline for exactly that reason.
const SHIPPED_DIR = 'data/video-tracks';
const STAGED_DIR = 'data/video-pending';
const NOTE_DIR = 'data/video-notes';

const write = process.argv.includes('--write');
let totalAttached = 0;
let totalRefused = 0;

const tracks = [];
for (const dir of [SHIPPED_DIR, STAGED_DIR]) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.json') && f !== 'by-opening.json') tracks.push({ dir, file: f });
  }
}

let promoted = 0;
for (const { dir, file } of tracks) {
  const path = join(dir, file);
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
    // A NOTED TRACK IS A SHIPPED TRACK, so the move happens here rather than by
    // hand. That is what keeps the two directories meaning something: staged =
    // captured but not yet written up, shipped = its notes exist. Leaving the
    // promotion to a person meant the line blurred the first time one was
    // forgotten, and `emit-notes` reads the shipped directory, so a note left
    // behind in staging is a note the app never speaks.
    const dest = attached.length ? join(SHIPPED_DIR, file) : path;
    writeFileSync(path, JSON.stringify(track, null, 1));
    if (dest !== path) {
      renameSync(path, dest);
      promoted += 1;
      console.log(`  promoted ${track.videoId} -> ${SHIPPED_DIR}`);
    }
  }
}

console.log(`\n${totalAttached} note(s) anchored, ${totalRefused} refused${promoted ? `, ${promoted} track(s) promoted` : ''}`);
if (totalRefused) process.exit(1);
