#!/usr/bin/env node
// Re-pull the English auto-captions of every video behind the voiced corpus
// (David 2026-10-28: "yes to transcript pull"). REFERENCE ONLY — the
// transcripts tell us how the notes were cut down (length, what was kept);
// nothing in them is ever quoted or shipped. They land in the gitignored
// data/sources/danya-voice/transcripts/.
//
// Resumable (skips a video already on disk), throttled, and it backs off on a
// rate limit. YouTube's bot check blocks most clients from a datacenter IP;
// the ios client still serves captions, and --ignore-no-formats-error stops
// yt-dlp failing on the video formats we never download.
//
//   node scripts/voiced-authoring/pull-transcripts.mjs [--limit N]
import { readFileSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const OUT = 'data/sources/danya-voice/transcripts';
const LOG = join(OUT, 'pull.log');
// YouTube rate-limits a datacenter IP after ~25 caption pulls in a burst
// (measured 2026-10-28): a slow drip with a long cool-down gets them all.
const GAP_MS = Number(process.env.PULL_GAP_MS ?? 45_000);
const BACKOFF_MS = Number(process.env.PULL_BACKOFF_MS ?? 15 * 60_000);
const MAX_FAILS_IN_A_ROW = 12;

const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

mkdirSync(OUT, { recursive: true });
const { notes } = JSON.parse(readFileSync('public/data/voiced-teachings.json', 'utf8'));
const ids = [...new Set(notes.flatMap((n) => (n.sources ?? []).filter((s) => s.startsWith('yt:')).map((s) => s.slice(3))))];
const have = () => new Set(readdirSync(OUT).filter((f) => f.endsWith('.vtt')).map((f) => f.replace(/\.en\.vtt$/, '')));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (line) => { const l = `${new Date().toISOString()} ${line}`; console.log(l); appendFileSync(LOG, `${l}\n`); };

function pull(id) {
  const r = spawnSync('python3', [
    '-m', 'yt_dlp', '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=ios',
    '--ignore-no-formats-error', '--write-auto-sub', '--skip-download',
    '--sub-format', 'vtt', '--sub-langs', 'en',
    '-o', join(OUT, '%(id)s.%(ext)s'), `https://www.youtube.com/watch?v=${id}`,
  ], { encoding: 'utf8', timeout: 120_000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (/Writing video subtitles/.test(out)) return 'ok';
  if (/429|not a bot/i.test(out)) return 'limited';
  return `failed: ${(/ERROR: (.*)/.exec(out)?.[1] ?? 'no captions written').slice(0, 120)}`;
}

let done = 0;
let failsInARow = 0;
const todo = ids.filter((id) => !have().has(id)).slice(0, limit);
log(`start: ${ids.length} videos, ${ids.length - todo.length} on disk, ${todo.length} to pull`);
for (const id of todo) {
  let result = pull(id);
  for (let tries = 0; result === 'limited' && tries < 4; tries += 1) {
    log(`${id} rate-limited — backing off ${BACKOFF_MS / 1000}s`);
    await sleep(BACKOFF_MS);
    result = pull(id);
  }
  done += 1;
  failsInARow = result === 'ok' ? 0 : failsInARow + 1;
  log(`[${done}/${todo.length}] ${id} ${result}`);
  if (failsInARow >= MAX_FAILS_IN_A_ROW) { log(`stopped: ${failsInARow} failures in a row`); process.exit(1); }
  await sleep(GAP_MS);
}
log(`done: ${have().size} of ${ids.length} on disk`);
