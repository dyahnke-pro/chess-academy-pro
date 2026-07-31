#!/usr/bin/env node
/**
 * batch-bake — bake every Tier-3 GAP opening in one run (David 2026-07-31:
 * "Do all openings now… Tier 2 openings fully in effect?").
 *
 * Per target: pick its dedicated videos from the manifest by title regex,
 * pull any transcript not yet on disk, then run narrate-from-video (which
 * bakes spine + flip + branches + bridges and gates every unit). A target
 * whose bake fails is REPORTED, never silently skipped — and never ships
 * half-baked content (the script's own gates refuse partial narration).
 *
 *   DEEPSEEK_KEY=… node scripts/danya-corpus/batch-bake.mjs [--only <name>]
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MANIFEST = 'data/sources/naroditsky-voice/manifest.json';
const TDIR = 'data/sources/naroditsky-voice/transcripts';
const MAX_VIDEOS = 6; // DeepSeek context bound — the bake clips at 180k chars

// Each target: the canonical ask + the title regex that finds its videos.
// Ordered by corpus depth so the richest openings bake first.
const TARGETS = [
  { ask: 'Sicilian Defense: Accelerated Dragon', re: /accelerated|acc\. dragon/i },
  { ask: "Queen's Gambit Declined", re: /queen.?s gambit declined|\bqgd\b/i },
  { ask: 'Jobava London', re: /jobava/i },
  { ask: 'Sicilian Defense: Rossolimo Variation', re: /rossolimo/i },
  { ask: "Queen's Gambit Accepted", re: /queen.?s gambit accepted|\bqga\b/i },
  { ask: 'Stafford Gambit', re: /stafford/i },
  { ask: 'Torre Attack', re: /torre/i },
  { ask: 'Modern Defense', re: /modern defen/i },
  { ask: 'Closed Sicilian', re: /closed sicilian/i },
  { ask: 'Sicilian Kan Variation', re: /\bkan\b/i },
  { ask: 'Sicilian Classical Variation', re: /sicilian.*classical|classical.*sicilian/i },
  { ask: 'Sicilian Scheveningen', re: /scheveningen/i },
  { ask: 'Nimzowitsch Defense', re: /nimzowitsch defen/i },
  { ask: 'Veresov Attack', re: /veresov/i },
  { ask: 'Ponziani Opening', re: /ponziani/i },
  { ask: "Bishop's Opening", re: /bishop.?s opening/i },
  { ask: 'Center Game', re: /center game|centre game/i },
  { ask: 'Owen Defense', re: /owen/i },
  { ask: 'Bogo-Indian Defense', re: /bogo/i },
];

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

function pullTranscript(id) {
  if (existsSync(`${TDIR}/${id}.en.vtt`) || existsSync(`${TDIR}/${id}.txt`)) return true;
  try {
    execFileSync('yt-dlp', [
      '--write-auto-sub', '--skip-download', '--sub-format', 'vtt', '--sub-langs', 'en',
      '-o', `${TDIR}/%(id)s.%(ext)s`, `https://www.youtube.com/watch?v=${id}`,
    ], { stdio: 'ignore', timeout: 120_000 });
    return existsSync(`${TDIR}/${id}.en.vtt`);
  } catch { return false; }
}

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
const results = [];
for (const t of TARGETS) {
  if (only && t.ask !== only) continue;
  const vids = manifest.videos.filter((v) => t.re.test(v.title)).map((v) => v.id);
  if (vids.length === 0) { results.push({ ask: t.ask, status: 'NO_VIDEOS' }); continue; }
  const usable = [];
  for (const id of vids) {
    if (usable.length >= MAX_VIDEOS) break;
    if (pullTranscript(id)) usable.push(id);
  }
  if (usable.length === 0) { results.push({ ask: t.ask, status: 'NO_TRANSCRIPTS', candidates: vids.length }); continue; }
  console.log(`\n══ ${t.ask} — ${usable.length}/${vids.length} video(s)`);
  try {
    execFileSync('node', [
      'scripts/danya-corpus/narrate-from-video.mjs',
      '--opening', t.ask, '--videos', usable.join(','),
    ], { stdio: 'inherit', timeout: 900_000, env: process.env });
    results.push({ ask: t.ask, status: 'BAKED', videos: usable.length });
  } catch {
    results.push({ ask: t.ask, status: 'FAILED', videos: usable.length });
  }
}

console.log('\n════ BATCH SUMMARY ════');
for (const r of results) console.log(`${r.status.padEnd(15)} ${r.ask}${r.videos ? ` (${r.videos} vids)` : ''}${r.candidates ? ` (${r.candidates} candidates)` : ''}`);
const baked = results.filter((r) => r.status === 'BAKED').length;
console.log(`\n${baked}/${results.length} baked.`);
