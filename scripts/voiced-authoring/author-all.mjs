#!/usr/bin/env node
/**
 * author-all — batch the MOVE-BY-MOVE voiced authoring across every existing
 * voiced file (David 2026-08-25: "redo all of the narrations to cover each
 * move"). Carries each file's openingName + studentSide forward; infers a
 * missing side from the opening name. Bounded concurrency so the API isn't
 * hammered. Re-runs are idempotent (each file is rewritten in place).
 *
 *   DEEPSEEK_KEY=... node scripts/voiced-authoring/author-all.mjs [--only id,id] [--concurrency 3]
 *
 * Shard mode (for parallel WO sessions) — author an EXPLICIT id list, including
 * bank videos that have NO voiced file yet (a stub is created; openingName is
 * carried from the bank title, side inferred; the corpus notes are position-
 * keyed so an approximate openingName is safe and refined later):
 *   DEEPSEEK_KEY=... node scripts/voiced-authoring/author-all.mjs --ids-file shard.txt --concurrency 4
 *   (shard.txt = one bank video id per line)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { authorVideo } from './author-video.mjs';
import { VOICED, BANK, readBank } from './lib.mjs';

// ⛔ DISABLED — David rejected LLM authoring (message 51: "zero LLM... ALL IN OUR
// OWN WORDS", message 147: "rewriting by hand"). This pipeline used DeepSeek to
// rewrite the transcripts and DROPPED any line it couldn't gate — losing
// teaching AND costing money. Narrations are HAND-authored now: read the
// distilled transcript and write every move yourself, nothing dropped. See
// docs/wo/WO-VOICED-AUTHORING.md. This script stays only as a reference; it will
// not run.
console.error('⛔ DISABLED: LLM authoring was rejected (zero-LLM, hand-authored only).');
console.error('   Hand-author per docs/wo/WO-VOICED-AUTHORING.md — do NOT run this (it costs money and drops content).');
process.exit(1);

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const only = (arg('only', '') || '').split(',').filter(Boolean);
const idsFile = arg('ids-file', '');
const CONC = Number(arg('concurrency', '3')) || 3;

// Best-effort opening name from a messy bank title ("The Italian Game | The
// Sensei Speedrun | GM Naroditsky" → "Italian Game"). Only used for un-voiced
// videos with no recorded openingName; corpus notes are position-keyed so this
// is a label, not a selector.
function openingFromTitle(title) {
  if (!title) return '';
  const seg = title.split('|')[0].trim();
  return seg.replace(/^(the|understanding|unveiling|mastering|tricky|crushing)\s+/i, '').replace(/[!?]+/g, '').trim();
}

// A defense the student plays from Black — used only when the existing file has
// no studentSide recorded (7 Sicilians in the current set).
const BLACK_DEF = /\b(sicilian|caro-kann|caro kann|french|pirc|modern defense|scandinavian|slav|king'?s indian|nimzo|benoni|dutch|grunfeld|grünfeld|alekhine|philidor|petrov|scandi|dragon)\b/i;

function sideFor(voicedPath, opening) {
  try {
    const j = JSON.parse(readFileSync(voicedPath, 'utf8'));
    if (j.studentSide) return j.studentSide;
  } catch { /* fall through */ }
  return BLACK_DEF.test(opening || '') ? 'black' : 'white';
}

let ids;
if (idsFile) {
  ids = readFileSync(idsFile, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
} else {
  ids = readdirSync(VOICED).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
  if (only.length) ids = ids.filter((id) => only.includes(id));
}
// Skip any whose bank is missing (can't author without the transcript).
ids = ids.filter((id) => {
  const has = existsSync(`${BANK}/${id}.json`);
  if (!has) console.warn(`[skip] ${id} — no bank on disk (recover: git show 09120f6:${BANK}/${id}.json)`);
  return has;
});

console.log(`[author-all] ${ids.length} videos, concurrency ${CONC}`);
const results = [];
let cursor = 0, done = 0;
async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++];
    const voicedPath = `${VOICED}/${id}.json`;
    let opening = '';
    if (existsSync(voicedPath)) {
      try { opening = JSON.parse(readFileSync(voicedPath, 'utf8')).openingName || ''; } catch { /* new file */ }
    } else {
      // Un-voiced bank video — label it from the bank title (best-effort).
      try { opening = openingFromTitle(readBank(id).title || ''); } catch { /* leave blank */ }
    }
    const side = sideFor(voicedPath, opening);
    try {
      const r = await authorVideo(id, { opening: opening || undefined, side });
      results.push(r);
    } catch (e) {
      console.error(`[author-all] ${id} FAILED: ${String(e).slice(0, 160)}`);
      results.push({ id, authored: 0, failed: true });
    }
    done += 1;
    if (done % 10 === 0) console.log(`[author-all] progress ${done}/${ids.length}`);
  }
}
await Promise.all(Array.from({ length: Math.min(CONC, ids.length) }, worker));

const totMoves = results.reduce((s, r) => s + (r.authored || 0), 0);
const totDrop = results.reduce((s, r) => s + (r.dropped || 0), 0);
const failed = results.filter((r) => r.failed).length;
const thin = results.filter((r) => (r.authored || 0) < 5 && !r.failed).map((r) => r.id);
console.log(`\n[author-all] DONE ${results.length} videos | ${totMoves} moves authored | ${totDrop} dropped | ${failed} failed`);
if (thin.length) console.log(`[author-all] THIN (<5 moves, review): ${thin.join(', ')}`);
