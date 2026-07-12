#!/usr/bin/env node
/**
 * pull-transcripts — download auto-subs (VTT) for manifest videos into the
 * GITIGNORED transcripts dir (REFERENCE ONLY — never committed, never quoted;
 * David 2026-07-02 plagiarism guard). Skips videos whose VTT already exists.
 * Rate-limited; resumable — re-run until it prints "0 missing".
 *
 * Usage:
 *   node scripts/danya-corpus/pull-transcripts.mjs [--playlist key] [--limit N]
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, access } from 'node:fs/promises';

const run = promisify(execFile);
const TDIR = 'data/sources/naroditsky-voice/transcripts';

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function main() {
  const playlist = arg('playlist', null);
  const limit = Number(arg('limit', '10000'));
  const manifest = JSON.parse(await readFile('data/sources/naroditsky-voice/manifest.json', 'utf8'));
  let videos = manifest.videos;
  if (playlist) videos = videos.filter((v) => v.playlist === playlist);

  const missing = [];
  for (const v of videos) {
    if (!(await exists(`${TDIR}/${v.id}.en.vtt`))) missing.push(v);
  }
  console.log(`[pull] ${videos.length} videos in scope, ${missing.length} missing transcripts`);

  let done = 0, failed = 0;
  for (const v of missing.slice(0, limit)) {
    try {
      await run('yt-dlp', [
        '--write-auto-sub', '--skip-download', '--sub-format', 'vtt', '--sub-langs', 'en',
        '--sleep-requests', '2',
        '-o', `${TDIR}/%(id)s.%(ext)s`,
        `https://www.youtube.com/watch?v=${v.id}`,
      ], { maxBuffer: 8 * 1024 * 1024 });
      done += 1;
      if (done % 10 === 0) console.log(`[pull] ${done}/${missing.length} …`);
    } catch (e) {
      failed += 1;
      console.error(`[pull] FAIL ${v.id} (${v.title.slice(0, 50)}): ${String(e).split('\n')[0].slice(0, 120)}`);
    }
    // Gentle pacing — the 2026-07-12 enumeration burst tripped a 429 +
    // bot-check for ~30 min. Slow is fine; blocked is not.
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(`[pull] done=${done} failed=${failed} remaining=${Math.max(0, missing.length - done - failed)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
