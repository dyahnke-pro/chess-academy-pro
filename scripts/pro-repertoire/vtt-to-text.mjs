#!/usr/bin/env node
// VTT → clean plain text. YouTube auto-subs roll captions with heavy overlap +
// inline timing tags; this strips cues/tags/dupes into readable prose for use as
// a REFERENCE-ONLY comprehension aid (never quoted, never shipped — plagiarism
// guard, David 2026-07-02). Usage: node vtt-to-text.mjs <in.vtt> [out.txt]
import { readFileSync, writeFileSync } from 'node:fs';
const inPath = process.argv[2];
if (!inPath) { console.error('need a .vtt path'); process.exit(1); }
const raw = readFileSync(inPath, 'utf8');
const lines = raw.split(/\r?\n/);
const out = [];
let last = '';
for (let l of lines) {
  if (!l || l === 'WEBVTT' || /^\d+$/.test(l) || l.includes('-->') || /^(Kind|Language):/.test(l) || l.startsWith('NOTE')) continue;
  l = l.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); // strip <c>/<timestamp> tags
  if (!l || l === last) continue;
  // auto-sub often repeats the previous line's tail as the next line's head; skip exact dupes
  if (out.length && out[out.length - 1].endsWith(l)) continue;
  out.push(l); last = l;
}
const text = out.join(' ').replace(/\s+/g, ' ').trim();
const outPath = process.argv[3] || inPath.replace(/\.(en\.)?vtt$/, '.txt');
writeFileSync(outPath, text);
console.log(`${outPath} — ${text.length} chars, ${text.split(' ').length} words`);
