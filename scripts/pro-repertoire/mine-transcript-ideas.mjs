#!/usr/bin/env node
// Condense a farmed YouTube teaching corpus into per-series IDEA DIGESTS.
//
// A pro's instructional catalog runs to hundreds of thousands of words, most of it
// move-calling, stream chat and banter. This ranks fixed-width windows by how much
// TEACHING they carry — an explanation connective ("because", "the idea is", "so
// that"), strategic vocabulary (outpost, pawn break, weak square), and a concrete
// board reference (a square or a piece) in the same breath — and writes the top
// windows per video into a digest under data/sources/<player>-voice/digests/.
//
// 🚨 The digest is a REFERENCE-ONLY comprehension aid, exactly like the raw
// transcript (plagiarism guard, David 2026-07-02): it tells the author WHICH
// established ideas the pro teaches at each point so they can be re-taught in
// ORIGINAL prose. Digests are gitignored alongside the transcripts; only the
// hand-curated per-opening/*.md notes are committed. Never quote a digest window
// into shipped narration.
//
// Usage:
//   node mine-transcript-ideas.mjs <player> [--series <regex>] [--per-video N] [--window N]

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WHY = /\b(because|the idea (is|behind|here)|the point (is|of|here)|in order to|so that|the reason|which means|that way|the problem (with|is)|allows? (us|me|him|her|them|black|white)|prevents?|stops? (him|her|them|black|white)|otherwise|if (he|she|they|black|white) (ever )?(plays?|goes?|takes?)|you want to|we want to|never|always)\b/gi;
const STRAT = /\b(outpost|weak(ness|er)? square|weakness|pawn structure|pawn break|the break|tempo|initiative|prophylax\w*|diagonal|open file|half-open|majority|minority|isolated|backward|doubled|space|develop\w*|coordinat\w*|king safety|counterplay|blockade|fianchett\w*|centraliz\w*|trade off|trading|endgame|passed pawn|bishop pair|light squares?|dark squares?|pin|fork|skewer|discovered)\b/gi;
const BOARD = /\b([a-h][1-8]|knight|bishop|rook|queen|king|pawn)\b/gi;
const NOISE = /\b(subscribe|patreon|discord|thanks for the|appreciate it|donation|chat|stream|merch|twitch|gifted|prime sub|shout out|coupon|link in the description)\b/gi;

function parseArgs(argv) {
  const player = argv[2];
  if (!player || player.startsWith('--')) {
    console.error('usage: mine-transcript-ideas.mjs <player> [--series <regex>] [--per-video N] [--window N]');
    process.exit(1);
  }
  const opts = { player, perVideo: 12, window: 70 };
  for (let i = 3; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--series') opts.series = new RegExp(argv[++i], 'i');
    else if (a === '--per-video') opts.perVideo = Number(argv[++i]);
    else if (a === '--window') opts.window = Number(argv[++i]);
    else { console.error(`unknown flag ${a}`); process.exit(1); }
  }
  return opts;
}

const count = (text, re) => (text.match(re) || []).length;

function scoreWindows(text, size) {
  const words = text.split(/\s+/);
  const step = Math.max(10, Math.floor(size / 3));
  const out = [];
  for (let i = 0; i + size <= words.length; i += step) {
    const passage = words.slice(i, i + size).join(' ');
    const why = count(passage, WHY);
    const strat = count(passage, STRAT);
    const board = count(passage, BOARD);
    const noise = count(passage, NOISE);
    if (!why || !board) continue;
    const score = why * 3 + strat * 2 + Math.min(board, 8) - noise * 6;
    if (score > 6) out.push({ at: i, score, passage });
  }
  return out.sort((a, b) => b.score - a.score);
}

// Windows overlap by design (step < size); keep the best and drop anything that
// restates it, so a digest of N entries carries N distinct ideas.
function dedupe(windows, size, limit) {
  const kept = [];
  for (const w of windows) {
    if (kept.some((k) => Math.abs(k.at - w.at) < size)) continue;
    kept.push(w);
    if (kept.length >= limit) break;
  }
  return kept.sort((a, b) => a.at - b.at);
}

// "How to WIN with the QUEEN'S GAMBIT | 1400-1500 ELO" → "How to WIN with the QUEEN'S GAMBIT"
function seriesOf(title) {
  return title
    .replace(/\s*\|.*$/, '')
    .replace(/\s*[-–]\s*(Part|Episode|Ep\.?)\s*\d+.*$/i, '')
    .replace(/\s*(Part|Episode|Ep\.?)\s*\d+.*$/i, '')
    .replace(/\s*\d{3,4}\s*-\s*\d{3,4}\s*ELO.*$/i, '')
    .replace(/\s*(FINALE|Finale)\s*$/, '')
    .trim();
}

function main() {
  const opts = parseArgs(process.argv);
  const voiceDir = join('data', 'sources', `${opts.player}-voice`);
  const trDir = join(voiceDir, 'transcripts');
  const outDir = join(voiceDir, 'digests');
  if (!existsSync(trDir)) { console.error(`no transcripts at ${trDir} — run fetch-youtube-transcripts.mjs first`); process.exit(1); }
  mkdirSync(outDir, { recursive: true });

  const catalog = existsSync(join(trDir, 'catalog.json'))
    ? JSON.parse(readFileSync(join(trDir, 'catalog.json'), 'utf8')).videos
    : [];
  const titles = new Map(catalog.map((v) => [v.id, v.title]));

  const files = readdirSync(trDir).filter((f) => f.endsWith('.txt'));
  const bySeries = new Map();
  let mined = 0;

  for (const file of files) {
    const id = file.replace(/\.txt$/, '');
    const title = titles.get(id) || id;
    if (opts.series && !opts.series.test(title)) continue;
    const text = readFileSync(join(trDir, file), 'utf8');
    const picks = dedupe(scoreWindows(text, opts.window), opts.window, opts.perVideo);
    if (!picks.length) continue;
    const series = seriesOf(title);
    if (!bySeries.has(series)) bySeries.set(series, []);
    bySeries.get(series).push({ id, title, words: text.split(/\s+/).length, picks });
    mined += 1;
  }

  for (const [series, videos] of bySeries) {
    const slug = series.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'misc';
    videos.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
    const lines = [
      `# ${series} — teaching digest`,
      '',
      'REFERENCE ONLY — never quote. Auto-extracted high-density teaching windows from',
      'auto-generated captions (so transcription is lossy). Use these to identify WHICH',
      'ideas are taught where, then verify the moves against the DB/engine and write the',
      'narration in ORIGINAL prose.',
      '',
      `${videos.length} videos · ${videos.reduce((n, v) => n + v.words, 0).toLocaleString()} words scanned`,
      '',
    ];
    for (const v of videos) {
      lines.push(`## ${v.title}`, `https://www.youtube.com/watch?v=${v.id} · ${v.words.toLocaleString()} words`, '');
      for (const p of v.picks) lines.push(`- [${p.score}] ${p.passage}`, '');
    }
    writeFileSync(join(outDir, `${slug}.md`), `${lines.join('\n')}\n`);
    console.log(`${slug}.md — ${videos.length} videos, ${videos.reduce((n, v) => n + v.picks.length, 0)} windows`);
  }
  console.log(`[done] ${mined} transcripts mined → ${outDir}`);
}

main();
