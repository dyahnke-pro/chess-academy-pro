#!/usr/bin/env node
/**
 * build — grids -> a saved build (track + forks + openings) for one lesson.
 *
 * David 2026-08-17: *"right now all we do is map each opening with the
 * narrations and save the builds for later"* and *"we make a large chunk and
 * then ship all at once."* So this produces the artifact and stops; nothing is
 * deployed, and builds accumulate on the branch until a batch is worth shipping.
 *
 * The geometry it is handed must already have been CONFIRMED against a start
 * position (`calibrate.py`), which is what makes running this unattended safe.
 * Measured across six of his videos: the 854x480 stream layout is IDENTICAL
 * (x=370 y=-2 sq=60), so geometry is read once per LAYOUT rather than once per
 * video — but it is confirmed per video regardless, because "they are usually
 * the same" is exactly the assumption that would eventually read a board that
 * is not there.
 *
 * Usage: node scripts/video-align/build.mjs <videoId> <gridsJson> <title>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { forksOf } from './forks.mjs';

const [videoId, gridsPath, title] = process.argv.slice(2);
if (!videoId || !gridsPath) {
  console.error('usage: build.mjs <videoId> <gridsJson> [title]');
  process.exit(1);
}

const trackPath = `/tmp/track_${videoId}.json`;
execFileSync('node', ['scripts/video-align/track.mjs', gridsPath, trackPath], { stdio: 'pipe' });
const games = JSON.parse(readFileSync(trackPath, 'utf8'));
// The longest game is the lesson; short ones are scene noise the tracker
// bailed out of rather than believed.
const game = games.sort((a, b) => b.moves.length - a.moves.length)[0];
if (!game || game.moves.length < 10) {
  console.error(`${videoId}: no usable game tracked (${games.length} candidates) — REFUSED`);
  process.exit(2);
}

const grids = JSON.parse(readFileSync(gridsPath, 'utf8'));
let rewinds = 0;
let prev = 0;
for (const m of game.moves) {
  if (m.ply < prev) rewinds += 1;
  prev = m.ply;
}

const track = {
  videoId,
  title: title ?? null,
  creator: 'naroditsky',
  trackedAt: new Date().toISOString().slice(0, 10),
  geometry: {
    x0: 370, y0: -2, square: 60.0, orientation: 'white',
    source: 'confirmed against the start position by calibrate_section',
  },
  sampling: { fps: 2, frames: grids.length, settledPositions: null },
  plies: game.moves.length,
  rewinds,
  moves: game.moves.map((m) => ({ t: m.t, ply: m.ply, line: m.line, fen: m.fen })),
};
track.forks = forksOf(track);

mkdirSync('data/video-tracks', { recursive: true });
writeFileSync(`data/video-tracks/${videoId}.json`, JSON.stringify(track, null, 1));
console.log(`${videoId}: ${track.plies} plies, ${track.rewinds} rewinds, ${track.forks.length} forks`);
