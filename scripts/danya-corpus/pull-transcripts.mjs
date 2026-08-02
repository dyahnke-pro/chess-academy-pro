#!/usr/bin/env node
/**
 * pull-transcripts — download auto-subs (VTT) for manifest videos into the
 * GITIGNORED transcripts dir (REFERENCE ONLY — never committed, never quoted;
 * David 2026-07-02 plagiarism guard). Skips videos whose VTT already exists.
 * Rate-limited; resumable — re-run until it prints "0 missing".
 *
 * Usage:
 *   node scripts/danya-corpus/pull-transcripts.mjs [--playlist key] [--limit N]
 *                                                  [--budget-minutes M]
 *
 * The budget is what makes the farm CONVERGE instead of stalling. Every
 * transcript this run downloads is useless until the distiller reads it, and
 * the distiller only runs after this script EXITS — so a pull that keeps
 * grinding is not slow progress, it is zero progress. Run 4 on 2026-08-01
 * pulled for 3.7 hours, got cancelled mid-step, and shipped nothing at all;
 * runs 1-3 the same. Stopping on a clock and handing over what is already on
 * disk turns every run into a committed chunk, and the resume-by-existence
 * check means the next run picks up exactly where this one stopped.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, access, writeFile } from 'node:fs/promises';

const run = promisify(execFile);
import { resolveCreator } from './creator.mjs';

const CREATOR = resolveCreator();
const TDIR = CREATOR.transcripts;

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function main() {
  const playlist = arg('playlist', null);
  const limit = Number(arg('limit', '10000'));
  const manifest = JSON.parse(await readFile(CREATOR.manifest, 'utf8'));
  let videos = manifest.videos;
  if (playlist) videos = videos.filter((v) => v.playlist === playlist);

  const missing = [];
  for (const v of videos) {
    if (!(await exists(`${TDIR}/${v.id}.en.vtt`))) missing.push(v);
  }
  console.log(`[pull] ${videos.length} videos in scope, ${missing.length} missing transcripts`);

  let done = 0, failed = 0, streak = 0, recovered = 0;
  const pauseMs = Number(process.env.PULL_PACE_MS ?? '5000');
  const budgetMs = Number(arg('budget-minutes', process.env.PULL_BUDGET_MIN ?? '0')) * 60_000;
  const deadline = budgetMs > 0 ? Date.now() + budgetMs : Infinity;
  const timeLeft = () => deadline - Date.now();
  const fetchOne = (id) => run('yt-dlp', [
    '--write-auto-sub', '--skip-download', '--sub-format', 'vtt', '--sub-langs', 'en',
    '--sleep-requests', '2',
    '-o', `${TDIR}/%(id)s.%(ext)s`,
    `https://www.youtube.com/watch?v=${id}`,
  ], { maxBuffer: 8 * 1024 * 1024 });

  let stoppedEarly = null;
  for (const v of missing.slice(0, limit)) {
    if (timeLeft() <= 0) {
      stoppedEarly = 'budget';
      break;
    }
    try {
      // ONE retry before this counts as a failure (2026-08-01). Measured on the
      // Saint Louis pull: every one of the 12 "failures" downloaded fine on an
      // immediate manual retry — they are transient, not blocks. Without the
      // retry, five unlucky ones in a row trip the circuit breaker below and
      // burn 30 idle minutes; that is what left the Hanging Pawns pull at
      // 475/540. The breaker still catches a REAL bot-check, because that
      // fails the retry too.
      try {
        await fetchOne(v.id);
      } catch {
        await new Promise((r) => setTimeout(r, 8000));
        await fetchOne(v.id);
        recovered += 1;
      }
      done += 1;
      streak = 0;
      if (done % 10 === 0) console.log(`[pull] ${done}/${missing.length} … (${recovered} recovered on retry)`);
    } catch (e) {
      failed += 1;
      streak += 1;
      console.error(`[pull] FAIL ${v.id} (${v.title.slice(0, 50)}): ${String(e).split('\n')[0].slice(0, 120)}`);
      // CIRCUIT BREAKER — 2026-07-29: after ~74 pulls YouTube bot-checked the
      // IP and every subsequent request failed; the old loop burned the whole
      // remaining queue on failures in minutes. Sustained failure means
      // blocked, not unlucky: stop hammering, cool down long, then resume.
      // …but never cool down past the budget. Sleeping 30 minutes with 5 left
      // spends the whole run on an idle timer and hands the distiller nothing;
      // ending now ships what is already on disk and the next run gets a fresh
      // runner IP anyway, which is the actual cure for a bot-check.
      if (streak >= 5) {
        if (timeLeft() < 31 * 60 * 1000) {
          stoppedEarly = 'rate-limited with no room left to cool down';
          break;
        }
        console.log(`[pull] ${streak} consecutive failures — rate-limited. Cooling down 30 min…`);
        await new Promise((r) => setTimeout(r, 30 * 60 * 1000));
        streak = 0;
      }
    }
    // Gentle pacing — the 2026-07-12 enumeration burst tripped a 429 +
    // bot-check for ~30 min. Slow is fine; blocked is not.
    await new Promise((r) => setTimeout(r, pauseMs));
  }
  if (stoppedEarly) {
    console.log(`[pull] stopped early (${stoppedEarly}) — handing ${done} transcripts to the distiller`);
  }
  console.log(`[pull] done=${done} failed=${failed} remaining=${Math.max(0, missing.length - done - failed)}`);
  // The farm treats "shipped no notes" as a failure, which is right while
  // there is still a backlog and wrong once there is not: a finished creator
  // has nothing left to pull and would otherwise go red forever. Record what
  // was actually left so the caller can tell those two apart.
  // Fixed path, not the per-creator transcripts dir: the CI step that reads it
  // is shell, and making shell resolve a creator config is how you get a
  // guard that silently reads "unknown" and stops guarding anything.
  await writeFile(
    '.pull-status.json',
    JSON.stringify({ missingAtStart: missing.length, done, failed, stoppedEarly }),
  );
}

main().catch((e) => { console.error(e); process.exit(1); });
