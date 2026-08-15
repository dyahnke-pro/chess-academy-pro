#!/usr/bin/env node
/**
 * run-video — one video, end to end: download → geometry → scan → track → align.
 *
 * The five steps existed as five commands with hand-copied numbers between
 * them, which is fine for a pilot and useless for 421 videos. This is the same
 * five steps with the numbers passed automatically and the frames deleted after
 * each one, because they are the expensive part: a 79-minute video at 2fps is
 * 9,547 PNGs and 1.8 GB, and this container has a fixed disk allowance. Keeping
 * two videos' frames around at once is how the batch dies.
 *
 * Usage:
 *   node scripts/video-align/run-video.mjs <videoId> [--apply] [--keep]
 *
 * Requires: yt-dlp + ffmpeg + deno, a running bgutil PO-token provider, and
 * cookies at $YT_COOKIES (default /tmp/vidtest/yt.txt). Cookies expire — a
 * `no longer valid` warning from yt-dlp means they need re-exporting, and no
 * amount of retrying fixes it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VIDEO = process.argv[2];
const APPLY = process.argv.includes('--apply');
const KEEP = process.argv.includes('--keep');
const WORK = process.env.VIDEO_WORK ?? '/tmp/vidtest';
const COOKIES = process.env.YT_COOKIES ?? join(WORK, 'yt.txt');

if (!VIDEO || VIDEO.startsWith('--')) {
  console.error('usage: run-video.mjs <youtube-id> [--apply] [--keep]');
  process.exit(1);
}

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });

const mp4 = join(WORK, `${VIDEO}.mp4`);
const frames = join(WORK, `frames-${VIDEO}`);
const track = join(WORK, `track-${VIDEO}.json`);
const probe = join(frames, 'probe.png');

function step(name, fn) {
  process.stdout.write(`  ${name}… `);
  const t0 = process.hrtime.bigint();
  const out = fn();
  const secs = Number(process.hrtime.bigint() - t0) / 1e9;
  console.log(`${out ?? 'ok'} (${secs.toFixed(1)}s)`);
  return out;
}

console.log(`\n${VIDEO}`);
mkdirSync(frames, { recursive: true });

try {
  if (!existsSync(mp4)) {
    step('download', () => {
      // 396 is the smallest usable mp4 (360p). The board is legible at 360p and
      // a higher rendition costs bandwidth and disk for no extra accuracy — the
      // classifier reads OCCUPANCY, not piece detail.
      run('yt-dlp', [
        '--cookies', COOKIES, '--remote-components', 'ejs:github',
        '-f', '396', '-o', mp4, `https://www.youtube.com/watch?v=${VIDEO}`,
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      return 'ok';
    });
  }

  // GEOMETRY is measured on a frame from the MIDDLE of the video, not the
  // start: a video usually opens on a title card or a talking head, and a probe
  // there finds no board at all.
  const geom = step('geometry', () => {
    // SEVERAL probes, spread through the video, and the detector takes the one
    // they agree on. A single probe is not enough: on the second pilot a frame
    // at 2:30 found the true board and a frame at 10:00 confidently found the
    // WEBCAM PANEL (x=6.5 sq=32.7), which then produced 0 plies from 9,547
    // frames. Streams cut to analysis, to a face, to a title card.
    const probes = [];
    for (const at of ['150', '600', '1200', '2000']) {
      const p = probe.replace('.png', `-${at}.png`);
      try {
        run('ffmpeg', ['-loglevel', 'error', '-ss', at, '-i', mp4, '-frames:v', '1', p, '-y']);
        if (existsSync(p)) probes.push(p);
      } catch { /* past the end of a short video — fine, use the rest */ }
    }
    if (probes.length === 0) throw new Error('no probe frame could be extracted');
    const out = run('python3', ['scripts/video-align/detect_board.py', ...probes]);
    const m = /x=([-\d.]+) y=([-\d.]+) square=([\d.]+)/.exec(out);
    if (!m) throw new Error(`no board found: ${out.trim()}`);
    return `x=${m[1]} y=${m[2]} sq=${m[3]}`;
  });
  const [, x0, y0, sq] = /x=([-\d.]+) y=([-\d.]+) sq=([\d.]+)/.exec(geom);

  step('scan', () => {
    run('python3', [
      'scripts/video-align/scan_video.py', mp4, frames, x0, y0, sq, '2',
    ]);
    return 'ok';
  });

  const tracked = step('track', () => {
    const out = run('node', ['scripts/video-align/track.mjs', join(frames, 'grids.json'), track]);
    const m = /(\d+) game\(s\), (\d+) plies/.exec(out);
    return m ? `${m[1]} games / ${m[2]} plies` : out.trim().split('\n').pop();
  });

  // A video whose board never starts from the initial position tracks nothing —
  // the tracker builds forward from the start and has no way to recognise a
  // position it did not walk into. Saying so here beats an empty alignment
  // report that looks like the notes were the problem.
  if (/^0 games/.test(tracked ?? '')) {
    console.log('  no game tracked — the board never showed the start position');
  } else {
    step('align', () => {
      const args = ['scripts/video-align/align-notes.mjs', '--video', VIDEO, '--track', track];
      if (APPLY) args.push('--apply');
      run('node', args);
      const rep = JSON.parse(readFileSync(`audit-reports/video-align-${VIDEO}.json`, 'utf8'));
      return `${rep.accepted}/${rep.notes - rep.alreadyPositioned} unpositioned notes placed`;
    });
  }
} finally {
  // ALWAYS, even on a throw. A failed video that leaves 1.8 GB behind takes the
  // whole batch down two videos later, and the error you then debug is a disk
  // error rather than the real one.
  if (!KEEP) {
    rmSync(frames, { recursive: true, force: true });
    rmSync(mp4, { force: true });
  }
}
