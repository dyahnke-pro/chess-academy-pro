#!/usr/bin/env node
/**
 * pair-narration — join every tracked move to what was being said over it.
 *
 * David 2026-08-17: *"We don't really need the video as long as we have the
 * FENs narrations, and captions ... We just need the information from the
 * video. Narrations paired with moves. And all words spoken."*
 *
 * That is the whole artifact. The video is a delivery mechanism for three
 * things — the positions, the words, and which words went with which position —
 * and the first two were already being kept in separate files that nobody had
 * ever joined. This performs the join, and once it has, the video is genuinely
 * disposable: everything a hand-written note needs is in the output.
 *
 * It also runs entirely offline, which matters more than it sounds. The video
 * download is the rate-limited step and is refused for long stretches; this
 * needs nothing but files already on disk, so the pairing for the whole bank
 * can be built during an hour when nothing can be fetched at all.
 *
 * WHAT COUNTS AS "OVER" A MOVE. The window runs from the moment the position
 * settles on screen to the moment the next one does — literally what was said
 * while this position was on the board, which is the only definition that needs
 * no guessing about a teacher's rhythm. A short lead-in is included before the
 * move lands, because the reason for a move is usually given while reaching for
 * it ("I'll go knight f3 here, because…") and that sentence belongs to the move
 * it explains, not to the position it left.
 *
 * REFERENCE ONLY — NEVER QUOTE (the plagiarism guard, unchanged). The paired
 * text tells you WHICH established idea the lesson is on at this move, out of
 * the several it may state. The shipped narration is original prose teaching
 * that idea. Nothing here is ever lifted verbatim.
 *
 * Usage:
 *   node scripts/video-align/pair-narration.mjs [videoId] [--write]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const TRACK_DIRS = ['data/video-tracks', 'data/video-pending'];
const TRANSCRIPTS = 'data/video-transcripts';
const OUT_DIR = 'data/video-narration';

/** A lead-in, in seconds, before the position settles. The move's REASON is
 *  typically spoken while the teacher reaches for the piece. */
const LEAD_IN = 12;
/** How long to keep listening past a move when it is the last one tracked. */
const TAIL = 60;

const toSec = (s) => {
  const [h, m, rest] = s.split(':');
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(rest);
};

/** Timestamped cues from a (possibly gzipped) VTT, with the rolling-caption
 *  duplication removed.
 *
 *  Auto-captions repeat the previous line with one word appended, so raw text
 *  is several times longer than what was actually said and unreadable either by
 *  a person or by a later pass. Each cue is reduced to the words it INTRODUCES. */
function readCues(path) {
  const raw = path.endsWith('.gz')
    ? gunzipSync(readFileSync(path)).toString('utf8')
    : readFileSync(path, 'utf8');
  const lines = raw.split('\n');
  const cues = [];
  let seen = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\d\d:\d\d:\d\d\.\d+)\s+-->\s+(\d\d:\d\d:\d\d\.\d+)/);
    if (!m) continue;
    const text = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() && !lines[j].includes('-->'); j++) {
      text.push(lines[j].replace(/<[^>]*>/g, '').trim());
    }
    const joined = text.join(' ').replace(/\s+/g, ' ').trim();
    if (!joined) continue;
    let add = joined;
    if (seen.endsWith(add)) continue;
    for (let k = Math.min(add.length, seen.length); k > 0; k--) {
      if (seen.endsWith(add.slice(0, k))) { add = add.slice(k); break; }
    }
    add = add.trim();
    if (!add) continue;
    cues.push({ t: toSec(m[1]), text: add });
    seen = (seen + ' ' + add).slice(-400);
  }
  return cues;
}

const said = (cues, from, to) =>
  cues.filter((c) => c.t >= from && c.t < to).map((c) => c.text).join(' ').replace(/\s+/g, ' ').trim();

/** Every tracked move, with the position it produced and the words spoken over
 *  it. Forks carry their own timestamps and are paired the same way — a fork
 *  option's words are the teacher explaining that specific alternative, which
 *  is exactly the "other lines" content the forks exist to capture. */
export function pairTrack(track, cues) {
  const moves = [...track.moves].sort((a, b) => a.t - b.t);
  const paired = moves.map((m, i) => {
    const next = moves[i + 1];
    const to = next ? next.t : m.t + TAIL;
    return {
      ply: m.ply,
      t: m.t,
      line: m.line,
      fen: m.fen,
      said: said(cues, m.t - LEAD_IN, to),
    };
  });

  const forks = (track.forks ?? []).map((f) => ({
    ply: f.ply,
    fen: f.fen,
    line: f.line,
    options: (f.options ?? []).map((o) => ({
      san: o.san,
      t: o.t,
      continuation: o.continuation,
      said: said(cues, o.t - LEAD_IN, o.t + TAIL),
    })),
  }));

  return { videoId: track.videoId, title: track.title, moves: paired, forks };
}

const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const write = process.argv.includes('--write');

const tracks = [];
for (const dir of TRACK_DIRS) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
    tracks.push(join(dir, f));
  }
}

if (write) mkdirSync(OUT_DIR, { recursive: true });
let done = 0, skipped = 0, words = 0;
for (const path of tracks) {
  const track = JSON.parse(readFileSync(path, 'utf8'));
  if (only && track.videoId !== only) continue;
  const vtt = join(TRANSCRIPTS, `${track.videoId}.vtt.gz`);
  if (!existsSync(vtt)) {
    // Not an error: the transcript loop runs independently of the video loop,
    // so a track can legitimately arrive before its captions do.
    skipped++;
    continue;
  }
  const paired = pairTrack(track, readCues(vtt));
  const covered = paired.moves.filter((m) => m.said.length > 20).length;
  words += paired.moves.reduce((a, m) => a + m.said.split(/\s+/).filter(Boolean).length, 0);
  console.log(
    `${track.videoId}  ${String(paired.moves.length).padStart(3)} positions, ` +
    `${covered} with narration, ${paired.forks.length} forks  ${(track.title ?? '').slice(0, 40)}`,
  );
  if (write) writeFileSync(join(OUT_DIR, `${track.videoId}.json`), JSON.stringify(paired, null, 1));
  done++;
}
console.log(`\n${done} paired, ${skipped} awaiting captions, ${words.toLocaleString()} words of narration paired to positions`);
