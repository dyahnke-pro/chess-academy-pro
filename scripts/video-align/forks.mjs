#!/usr/bin/env node
/**
 * forks — the alternatives a lesson DEMONSTRATED, taken from its rewinds.
 *
 * David 2026-08-17: *"what i like about his videos and what i want to carry
 * over are the teachings about the other lines. I want to walk people down
 * those lines, especially in the review section, but i want Learn with coach to
 * touch on them as well so the user knows there are other options at certain
 * forks/positions."*
 *
 * That content is already in the track, and it is exactly what the rewinds are.
 * A teacher rewinds for one reason: to go back to a position and show a
 * different option. So every rewind marks a fork, and the moves played after
 * each visit are the options themselves.
 *
 * WHY THIS IS SAFE IN A WAY A GENERATED "ALTERNATIVES" LIST WOULD NOT BE. The
 * options are not proposed by a model and not looked up in a database — they
 * are the moves that appeared on screen. "Here are three other tries" is a
 * claim about the video, and the video is the evidence. There is nothing to
 * hallucinate and nothing to verify after the fact (G0/G3).
 *
 * Each option carries its TIMESTAMP, which is what makes review usable: the
 * line can be walked, and the moment the teacher explains it is known.
 *
 * Usage:
 *   node scripts/video-align/forks.mjs data/video-tracks/<id>.json [--write]
 *
 * Without --write it prints; with --write it stores `forks` back into the track.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

/** Placement + side to move. Move counters differ between a first visit and a
 *  rewind to the same board, and the board is what a fork is about. */
const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

export function forksOf(track) {
  const at = new Map();
  let line = [];
  for (const m of track.moves) {
    // A rewind entry can add no moves; it marks navigation, not a choice.
    if (!m.line.length) continue;
    line = line.slice(0, m.ply - m.line.length);
    const before = line.slice();
    line.push(...m.line);

    const c = new Chess();
    for (const san of before) c.move(san);
    const k = posKey(c.fen());
    if (!at.has(k)) at.set(k, { fen: c.fen(), line: before.slice(), options: [] });
    const node = at.get(k);
    // First visit wins the timestamp: that is when the option was introduced.
    if (!node.options.some((o) => o.san === m.line[0])) {
      node.options.push({ san: m.line[0], t: m.t, continuation: m.line.join(' ') });
    }
  }
  return [...at.values()]
    .filter((n) => n.options.length > 1)
    .map((n) => ({
      fen: n.fen,
      line: n.line,
      ply: n.line.length,
      options: n.options.sort((a, b) => a.t - b.t),
    }))
    .sort((a, b) => a.ply - b.ply);
}

// Only act as a CLI when RUN, never when imported. Without this guard the
// import in build.mjs executed this block and tried to open build's own first
// argument as a track file.
if (process.argv[1]?.endsWith('forks.mjs')) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: forks.mjs <track.json> [--write]');
    process.exit(1);
  }
  const track = JSON.parse(readFileSync(path, 'utf8'));
  const forks = forksOf(track);

  console.log(`${forks.length} fork(s) demonstrated in ${track.videoId}\n`);
  for (const f of forks) {
    console.log(`  after ${f.line.join(' ') || '(start)'}`);
    for (const o of f.options) {
      const mm = Math.floor(o.t / 60);
      const ss = String(Math.round(o.t % 60)).padStart(2, '0');
      console.log(`      ${o.san.padEnd(7)} ${mm}m${ss}   ${o.continuation}`);
    }
    console.log('');
  }

  if (process.argv.includes('--write')) {
    track.forks = forks;
    writeFileSync(path, JSON.stringify(track, null, 1));
    console.log(`wrote ${forks.length} forks into ${path}`);
  }
}
