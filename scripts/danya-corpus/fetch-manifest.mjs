#!/usr/bin/env node
/**
 * fetch-manifest — enumerate the Naroditsky teaching playlists into
 * data/sources/naroditsky-voice/manifest.json (committed metadata: video id,
 * title, playlist). The manifest is the work-queue for pull-transcripts +
 * distill; re-running refreshes it (new uploads appear, nothing is lost).
 *
 * Usage: node scripts/danya-corpus/fetch-manifest.mjs [playlistKey ...]
 *   (no args = all playlists)
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const run = promisify(execFile);

export const PLAYLISTS = {
  'opening-lab':        { id: 'PLT1F2nOxLHOfzUTCQ7rCaiS5gbfaEkpDj', title: "Naroditsky's Opening Lab" },
  'top-theory':         { id: 'PLT1F2nOxLHOc80pNT3XH1xUDyeom46R3X', title: 'Top Theory Speedrun' },
  'sensei':             { id: 'PLT1F2nOxLHOeyyw85utYJpWtSmxvA-2WR', title: 'The Sensei SpeedRun' },
  'master-class':       { id: 'PLT1F2nOxLHOefj_z54LNBpnASnIROm43e', title: 'Master Class Speedrun' },
  'speedrun-original':  { id: 'PLT1F2nOxLHOcmi_qi1BbY6axf5xLFEcit', title: 'SpeedRun' },
  'dyi':                { id: 'PLT1F2nOxLHOdrvOyOXb_l2yGJrkwLA72Z', title: 'DYI Develop Your Instincts Speedrun' },
  'beginner-to-master': { id: 'PLT1F2nOxLHOfQ-eoJTpyvKkQFwYewDduj', title: 'Beginner to Master Speedrun' },
  'endgame':            { id: 'PLT1F2nOxLHOfQI_hFiDnnWj4lb5KsviJ_', title: 'End Game' },
  'grandmaster-guide':  { id: 'PLT1F2nOxLHOfUGsnb1GREeaQ3vP9k_ys6', title: 'Grandmaster Guide' },
  'mastery-explained':  { id: 'PLT1F2nOxLHOcZlKiT0J-ov5-RsM9taTvm', title: 'Chess Mastery Explained' },
};

const OUT = 'data/sources/naroditsky-voice/manifest.json';

async function main() {
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PLAYLISTS);
  let existing = { videos: [] };
  try { existing = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* fresh */ }
  const byId = new Map(existing.videos.map((v) => [v.id, v]));

  for (const key of keys) {
    const pl = PLAYLISTS[key];
    if (!pl) { console.error(`unknown playlist key: ${key}`); continue; }
    console.log(`[manifest] ${key} …`);
    const { stdout } = await run('yt-dlp', [
      '--flat-playlist', '--print', '%(id)s\t%(title)s',
      `https://www.youtube.com/playlist?list=${pl.id}`,
    ], { maxBuffer: 16 * 1024 * 1024 });
    let n = 0;
    for (const line of stdout.split('\n')) {
      const [id, ...t] = line.split('\t');
      if (!id?.trim()) continue;
      byId.set(id.trim(), { id: id.trim(), title: t.join('\t').trim(), playlist: key });
      n += 1;
    }
    console.log(`[manifest] ${key}: ${n} videos`);
  }

  const videos = [...byId.values()];
  await mkdir('data/sources/naroditsky-voice', { recursive: true });
  await writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), videos }, null, 2));
  console.log(`[manifest] total ${videos.length} videos → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
