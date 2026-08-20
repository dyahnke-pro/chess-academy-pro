#!/usr/bin/env node
/**
 * at — what the lesson was SAYING around a given second.
 *
 * Reading notes by hand means reading the transcript at the moment the board
 * reached a position, and auto-captions are duplicated line-by-line rolling
 * text, so they are unreadable raw. This de-duplicates and prints a window.
 *
 * REFERENCE ONLY — NEVER QUOTE (CLAUDE.md plagiarism guard, David 2026-07-02).
 * The transcript tells you WHICH established idea is being taught at this move;
 * the shipped prose is original writing of that (public-domain) idea. Zero
 * verbatim lifting, and the raw captions stay out of the repo.
 *
 * Usage: node scripts/video-align/at.mjs <vtt> <seconds> [window]
 */
import { readFileSync, existsSync } from 'node:fs';

const [vtt, secArg, winArg] = process.argv.slice(2);
// SAY THE TRANSCRIPT IS MISSING, DO NOT THROW A STACK TRACE. A missing VTT used
// to surface as an ENOENT dump in the middle of a batch, which reads like a tool
// that had nothing to say — so the note got written from the board alone, which
// is exactly what this script exists to prevent. Four notes went that way before
// the pattern was spotted (David 2026-08-20: "make sure to be getting the
// narrations from the captions").
if (vtt && !existsSync(vtt)) {
  console.error(`NO CAPTIONS: ${vtt} is not on disk. Bank the caption track before writing notes —`);
  console.error('a note written without the transcript is a fact about the board, not the point being taught.');
  process.exit(2);
}
const at = Number(secArg);
const win = Number(winArg ?? 45);

const toSec = (s) => {
  const [h, m, rest] = s.split(':');
  return Number(h) * 3600 + Number(m) * 60 + parseFloat(rest);
};

const lines = readFileSync(vtt, 'utf8').split('\n');
const cues = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(\d\d:\d\d:\d\d\.\d+)\s+-->\s+(\d\d:\d\d:\d\d\.\d+)/);
  if (!m) continue;
  const t = toSec(m[1]);
  const text = [];
  for (let j = i + 1; j < lines.length && lines[j].trim() && !lines[j].includes('-->'); j++) {
    text.push(lines[j].replace(/<[^>]*>/g, '').trim());
  }
  const joined = text.join(' ').replace(/\s+/g, ' ').trim();
  if (joined) cues.push({ t, text: joined });
}

// Rolling captions repeat the previous line with one word added, so keep a cue
// only for the words it INTRODUCES.
let seen = '';
const out = [];
for (const c of cues) {
  if (c.t < at - win || c.t > at + win) continue;
  let add = c.text;
  if (seen.endsWith(add)) continue;
  for (let k = Math.min(add.length, seen.length); k > 0; k--) {
    if (seen.endsWith(add.slice(0, k))) { add = add.slice(k); break; }
  }
  add = add.trim();
  if (!add) continue;
  out.push(add);
  seen = (seen + ' ' + add).slice(-400);
}
console.log(out.join(' '));
