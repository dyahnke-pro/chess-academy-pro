#!/usr/bin/env node
/**
 * fetch-manifest — enumerate the Naroditsky teaching playlists into
 * data/sources/naroditsky-voice/manifest.json (committed metadata: video id,
 * title, playlist). The manifest is the work-queue for pull-transcripts +
 * distill; re-running refreshes it (new uploads appear, nothing is lost).
 *
 * Usage: node scripts/danya-corpus/fetch-manifest.mjs [playlistKey ...]
 *   (no args = all playlists + the channel-uploads sweep)
 *
 * CHANNEL SWEEP (2026-07-31): ~160 uploads live on the channel but in no
 * teaching playlist. The no-args run also enumerates the channel's uploads
 * and files any video not already claimed by a playlist under the
 * `channel-other` tag, so bake sessions can DISCOVER them by title. A
 * playlist tag always wins over `channel-other` on refresh.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolveCreator } from './creator.mjs';

const CREATOR = resolveCreator();

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

const OUT = CREATOR.manifest;

/** Playlists to enumerate for this creator. Naroditsky ships an explicit map
 *  (his 10 teaching playlists); a creator with `playlistFilter` instead has
 *  its channel's playlist index enumerated and filtered by TITLE — the Saint
 *  Louis club channel carries ~260 playlists of which only the "Lectures
 *  with …" series are teaching material, and new lecturers appear constantly.
 */
async function resolvePlaylists() {
  if (!CREATOR.playlistFilter) {
    return Object.entries(PLAYLISTS).map(([key, pl]) => ({ key, id: pl.id, title: pl.title }));
  }
  const include = new RegExp(CREATOR.playlistFilter, 'i');
  const exclude = CREATOR.playlistExclude ? new RegExp(CREATOR.playlistExclude, 'i') : null;
  const { stdout } = await run('yt-dlp', [
    '--flat-playlist', '--print', '%(id)s\t%(title)s', CREATOR.channel,
  ], { maxBuffer: 32 * 1024 * 1024 });
  const out = [];
  for (const line of stdout.split('\n')) {
    const [id, ...t] = line.split('\t');
    const title = t.join('\t').trim();
    if (!id?.trim() || !title) continue;
    if (!include.test(title)) continue;
    if (exclude && exclude.test(title)) continue;
    // Playlist key = a slug of its title, so the manifest records WHICH
    // series a video came from (useful when one lecturer distills thin).
    out.push({ key: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60), id: id.trim(), title });
  }
  console.log(`[manifest] ${CREATOR.key}: ${out.length} playlist(s) matched the teaching filter`);
  return out;
}

async function main() {
  const argKeys = process.argv.slice(2).filter((a) => !a.startsWith('--') && a !== CREATOR.key);
  const all = await resolvePlaylists();
  const selected = argKeys.length ? all.filter((p) => argKeys.includes(p.key)) : all;
  let existing = { videos: [] };
  try { existing = JSON.parse(await readFile(OUT, 'utf8')); } catch { /* fresh */ }
  const byId = new Map(existing.videos.map((v) => [v.id, v]));

  for (const pl of selected) {
    const key = pl.key;
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

  // Channel sweep — only on a full (no-args) run. Playlist tags win: a
  // video already filed under a playlist is never demoted to channel-other,
  // and a channel-other video that later joins a playlist gets promoted by
  // the playlist pass above (it runs first).
  if (argKeys.length === 0 && !CREATOR.playlistFilter) {
    console.log('[manifest] channel sweep …');
    const { stdout } = await run('yt-dlp', [
      '--flat-playlist', '--print', '%(id)s\t%(title)s',
      'https://www.youtube.com/@DanielNaroditskyGM/videos',
    ], { maxBuffer: 16 * 1024 * 1024 });
    let added = 0;
    for (const line of stdout.split('\n')) {
      const [id, ...t] = line.split('\t');
      if (!id?.trim() || byId.has(id.trim())) continue;
      byId.set(id.trim(), { id: id.trim(), title: t.join('\t').trim(), playlist: 'channel-other' });
      added += 1;
    }
    console.log(`[manifest] channel sweep: ${added} non-playlist videos filed as channel-other`);
  }

  const videos = [...byId.values()];
  await mkdir(CREATOR.voiceDir, { recursive: true });
  await writeFile(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), videos }, null, 2));
  console.log(`[manifest] total ${videos.length} videos → ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
