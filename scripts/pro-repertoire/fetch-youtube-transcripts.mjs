#!/usr/bin/env node
// Farm a pro's YouTube TEACHING corpus into gitignored per-player transcript notes.
//
// Instructional content is a FIRST-CLASS grounding source alongside the game tree
// (G9.1 step 8 / the INSTRUCTIONAL-CONTENT doctrine, locked 2026-07-02): what a pro
// TEACHES is what the public wants to learn, even for a line they never play rated.
//
// 🚨 REFERENCE ONLY — NEVER QUOTE (plagiarism guard, David 2026-07-02). The transcript
// tells you WHICH established (public-domain) ideas the pro teaches at each move; all
// shipped narration is ORIGINAL prose teaching those ideas. Raw pulls stay local:
// data/sources/*-voice/transcripts/ is gitignored; only the hand-curated *.md notes
// under per-opening/ are committed.
//
// Usage:
//   node fetch-youtube-transcripts.mjs <player> --channel @chessbrah [--include <re>] [--exclude <re>] [--limit N] [--list-only]
//   node fetch-youtube-transcripts.mjs <player> --playlist <PLAYLIST_ID> [...]
//   node fetch-youtube-transcripts.mjs <player> --ids id1,id2,...
//
// Notes on yt-dlp in this environment (hard-won 2026-07-30):
//   - From a datacenter IP, YouTube's "Sign in to confirm you're not a bot" check
//     trips constantly, and a burst of pulls earns a 429 penalty box that swallows
//     the default/android_vr/ios clients for many minutes. The `web_embedded`
//     client sails past both — it resolves no media formats (hence
//     `--ignore-no-formats-error`), but the caption tracks are all we want.
//     `android_vr,web_safari` still works when the IP is cool; kept as fallback.
//   - Auto-subs only; we never download media (`--skip-download`).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const exec = promisify(execFile);

const CLIENTS = ['web_embedded', 'android_vr,web_safari'];
const PLAYER_ARGS = ['--extractor-args', `youtube:player_client=${CLIENTS[0]}`];

function parseArgs(argv) {
  const player = argv[2];
  if (!player || player.startsWith('--')) {
    console.error('usage: fetch-youtube-transcripts.mjs <player> --channel @handle | --playlist <id> | --ids a,b,c');
    process.exit(1);
  }
  const opts = { player, limit: Infinity, listOnly: false, throttleMs: 6000 };
  for (let i = 3; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--channel') opts.channel = argv[++i];
    else if (a === '--playlist') opts.playlist = argv[++i];
    else if (a === '--ids') opts.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--include') opts.include = new RegExp(argv[++i], 'i');
    else if (a === '--exclude') opts.exclude = new RegExp(argv[++i], 'i');
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--throttle') opts.throttleMs = Number(argv[++i]);
    else if (a === '--list-only') opts.listOnly = true;
    else { console.error(`unknown flag ${a}`); process.exit(1); }
  }
  return opts;
}

async function listVideos(opts, cacheDir) {
  if (opts.ids) return opts.ids.map((id) => ({ id, title: id, duration: 0, views: 0 }));
  const url = opts.playlist
    ? `https://www.youtube.com/playlist?list=${opts.playlist}`
    : `https://www.youtube.com/${opts.channel}/videos`;
  // Cache the catalog — the channel listing is rate-limited like everything else,
  // and a farm run usually needs several passes over the same catalog.
  const cache = join(cacheDir, 'catalog.json');
  if (existsSync(cache)) {
    const cached = JSON.parse(readFileSync(cache, 'utf8'));
    if (cached.url === url) return cached.videos;
  }
  const { stdout } = await exec('yt-dlp', [
    ...PLAYER_ARGS,
    '--flat-playlist',
    '--print', '%(id)s\t%(duration)s\t%(view_count)s\t%(title)s',
    url,
  ], { maxBuffer: 64 * 1024 * 1024 });
  const videos = stdout.split('\n').filter(Boolean).map((line) => {
    const [id, duration, views, ...rest] = line.split('\t');
    return { id, duration: Number(duration) || 0, views: Number(views) || 0, title: rest.join('\t') };
  });
  writeFileSync(cache, `${JSON.stringify({ url, videos }, null, 2)}\n`);
  return videos;
}

// VTT → clean prose. YouTube auto-subs roll captions with heavy overlap and inline
// timing tags; strip both, then collapse the rolling repeats.
function vttToText(vtt) {
  const out = [];
  for (let line of vtt.split(/\r?\n/)) {
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line) || line.includes('-->')) continue;
    if (/^(Kind|Language):/.test(line) || line.startsWith('NOTE')) continue;
    line = line.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const prev = out[out.length - 1];
    if (prev === line) continue;
    if (prev && (prev.endsWith(line) || prev.includes(line))) continue;
    if (prev && line.startsWith(prev)) { out[out.length - 1] = line; continue; }
    out.push(line);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

function lastLine(text) {
  return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).pop() || 'unknown error';
}

// YouTube rate-limits a datacenter IP hard: hammer it and every subsequent pull
// comes back 429 → "Sign in to confirm you're not a bot". Throttle between videos
// and back off exponentially when it trips; the limit clears on its own.
async function fetchTranscript(id, dir, throttleMs) {
  const tmp = join(dir, `.tmp-${id}`);
  const argsFor = (client) => [
    '--extractor-args', `youtube:player_client=${client}`,
    '--ignore-no-formats-error', '--sleep-requests', '1',
    '--write-auto-sub', '--skip-download', '--sub-format', 'vtt', '--sub-langs', 'en',
    '-o', `${tmp}.%(ext)s`,
    `https://www.youtube.com/watch?v=${id}`,
  ];
  let lastErr = '';
  let ok = false;
  for (let attempt = 0; attempt < 4 && !ok; attempt += 1) {
    const client = CLIENTS[Math.min(attempt, CLIENTS.length - 1)];
    try {
      await exec('yt-dlp', argsFor(client), { maxBuffer: 32 * 1024 * 1024 });
      ok = true;
    } catch (err) {
      lastErr = lastLine(err.stderr || err.message);
      const rateLimited = /429|Too Many Requests|not a bot/i.test(err.stderr || '');
      if (!rateLimited || attempt === 3) return { ok: false, reason: lastErr };
      const backoff = throttleMs * 2 ** attempt;
      console.log(`  … rate-limited on ${id}, retrying in ${Math.round(backoff / 1000)}s`);
      await sleep(backoff);
    }
  }
  if (!ok) return { ok: false, reason: lastErr };
  const vtt = readdirSync(dir).find((f) => f.startsWith(`.tmp-${id}`) && f.endsWith('.vtt'));
  if (!vtt) return { ok: false, reason: 'no english auto-sub track' };
  const text = vttToText(readFileSync(join(dir, vtt), 'utf8'));
  unlinkSync(join(dir, vtt));
  if (text.split(' ').length < 200) return { ok: false, reason: 'transcript too short' };
  return { ok: true, text, words: text.split(' ').length };
}

async function main() {
  const opts = parseArgs(process.argv);
  const dir = join('data', 'sources', `${opts.player}-voice`, 'transcripts');
  mkdirSync(dir, { recursive: true });

  let videos = await listVideos(opts, dir);
  const total = videos.length;
  if (opts.include) videos = videos.filter((v) => opts.include.test(v.title));
  if (opts.exclude) videos = videos.filter((v) => !opts.exclude.test(v.title));
  videos = videos.slice(0, opts.limit);
  console.log(`[list] ${total} videos → ${videos.length} after filters`);

  if (opts.listOnly) {
    videos.forEach((v) => console.log(`${v.id}\t${Math.round(v.duration / 60)}m\t${v.title}`));
    return;
  }

  const index = [];
  let done = 0;
  let failed = 0;
  for (const v of videos) {
    const slug = `${v.id}.txt`;
    const path = join(dir, slug);
    if (existsSync(path)) {
      index.push({ ...v, file: slug, words: readFileSync(path, 'utf8').split(' ').length, cached: true });
      done += 1;
      continue;
    }
    const res = await fetchTranscript(v.id, dir, opts.throttleMs);
    if (!res.ok) {
      failed += 1;
      console.log(`  ✗ ${v.id} — ${res.reason.slice(0, 120)} — ${v.title.slice(0, 60)}`);
      continue;
    }
    writeFileSync(path, res.text);
    index.push({ ...v, file: slug, words: res.words });
    done += 1;
    console.log(`  ✓ ${done}/${videos.length} ${String(res.words).padStart(6)}w  ${v.title.slice(0, 62)}`);
    await sleep(opts.throttleMs);
  }

  const indexPath = join(dir, 'index.json');
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const words = index.reduce((n, v) => n + (v.words || 0), 0);
  console.log(`[done] ${done} transcripts (${failed} failed) — ${words.toLocaleString()} words → ${dir}`);
  console.log('[note] REFERENCE ONLY — gitignored, never quoted, never shipped as narration.');
}

main().catch((err) => { console.error(err); process.exit(1); });
