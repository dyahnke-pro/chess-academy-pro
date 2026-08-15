#!/usr/bin/env node
/**
 * batch — run the video pipeline over many videos, best value first.
 *
 * "Best value" is measurable rather than a guess: for each video, how many of
 * its notes have NO position and recite at least two moves. A note with no
 * recited move cannot be certified at any position, so a video full of them is
 * a video the pipeline cannot help, however long it is.
 *
 * Roughly eleven minutes a video, dominated by geometry detection. So this is
 * built to be interrupted and resumed: each video's report is written as it
 * finishes and an existing report is skipped, which means a container that dies
 * loses one video rather than the run.
 *
 * Usage:
 *   node scripts/video-align/batch.mjs [--limit 12] [--apply] [--creator naroditsky]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const LIMIT = Number(arg('limit', '12'));
const APPLY = process.argv.includes('--apply');
const CORPUS = arg('corpus', 'src/data/danya-teachings.json');

const SAN_RE =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

const notes = JSON.parse(readFileSync(CORPUS, 'utf8')).notes;
const byVideo = new Map();
for (const n of notes) {
  const src = (n.sources ?? []).find((s) => s.startsWith('yt:'));
  if (!src) continue;
  const id = src.slice(3);
  if (!byVideo.has(id)) byVideo.set(id, { reachable: 0, unpositioned: 0 });
  const row = byVideo.get(id);
  if ((n.lineSan ?? []).length > 0) continue;
  row.unpositioned += 1;
  const prose = `${n.explains} ${n.teaches} ${n.plans ?? ''}`;
  if ((prose.match(SAN_RE) ?? []).length >= 2) row.reachable += 1;
}

const queue = [...byVideo.entries()]
  .map(([id, v]) => ({ id, ...v }))
  .filter((v) => v.reachable > 0)
  .sort((a, b) => b.reachable - a.reachable)
  .slice(0, LIMIT);

console.log(`${byVideo.size} videos carry notes; running the top ${queue.length} by reachable notes\n`);

let placed = 0;
let done = 0;
for (const v of queue) {
  const report = `audit-reports/video-align-${v.id}.json`;
  if (existsSync(report)) {
    console.log(`${v.id} — already reported, skipping`);
    continue;
  }
  try {
    const args = ['scripts/video-align/run-video.mjs', v.id];
    if (APPLY) args.push('--apply');
    execFileSync('node', args, { stdio: 'inherit', maxBuffer: 64 * 1024 * 1024 });
    done += 1;
    if (existsSync(report)) placed += JSON.parse(readFileSync(report, 'utf8')).accepted;
  } catch (err) {
    // One bad video must not end the run — a private video, a livestream VOD
    // with no board, an expired cookie on a single fetch. Report and continue.
    console.log(`${v.id} — FAILED: ${String(err.message).split('\n')[0]}`);
  }
}
console.log(`\n${done} video(s) processed, ${placed} position(s) recovered`);
