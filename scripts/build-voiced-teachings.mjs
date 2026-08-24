#!/usr/bin/env node
/**
 * build-voiced-teachings.mjs — turn the voiced DNA corpus into a POSITION-keyed
 * teaching corpus the whole app can use (David 2026-08-24: the voiced narrations
 * should help free-play, review, tactics — "anywhere we use the corpus").
 *
 * Each voiced beat already carries a board-true position (its `fen`, read off
 * the video) and original prose. This emits them in the DanyaNote/TeachingsBundle
 * shape as `public/data/voiced-teachings.json`, registered as a secondary corpus.
 * Selection stays BY POSITION: a note's `lineSan` replays to exactly the board
 * its prose was authored + verified against (bank-fidelity), so it can only ever
 * be spoken at that position — the corpus-doctrine contract.
 *
 * Only MAIN-LINE beats are emitted (the ply-monotonic spine), so lineSan always
 * replays to the note's own fen. Analysis/rewind beats are skipped.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../node_modules/chess.js/dist/esm/chess.js';

const SRC = 'data/video-narration-voiced';
const OUT = 'public/data/voiced-teachings.json';
const norm = (fen) => fen.split(' ').slice(0, 4).join(' ');
// The secondary-corpus gate bans the medium/attribution + move-number prefixes.
const BANNED = /\b(naroditsky|danya|aman|hambleton|chessbrah|in this video|in the video|the streamer|chat|subscribe|this stream|speedrun)\b/i;
const MOVE_NUM = /\d{1,2}(\.|…|\.\.\.)(?=[NBRQKO]|[a-h][1-8x])/;

function phaseFor(plies) {
  if (plies <= 16) return 'opening';
  if (plies <= 40) return 'middlegame';
  return 'endgame';
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.json'));
const notes = [];
let videos = 0, skipped = 0;
for (const f of files) {
  const j = JSON.parse(readFileSync(`${SRC}/${f}`, 'utf8'));
  const id = j.videoId || f.replace('.json', '');
  const g = new Chess();
  const sans = [];
  let last = 0, used = false;
  for (const m of j.moves) {
    if (typeof m.ply === 'number' && m.ply <= last) continue; // rewind/analysis
    const line = Array.isArray(m.line) ? m.line : [];
    if (!line.length) continue;
    const snap = g.fen();
    const applied = [];
    let ok = true;
    for (const s of line) { try { if (!g.move(s)) { ok = false; break; } applied.push(s); } catch { ok = false; break; } }
    if (!ok) { g.load(snap); continue; }
    for (const s of applied) sans.push(s);
    if (typeof m.ply === 'number') last = m.ply;
    // emit a note at this position when the beat speaks — and only when the
    // replayed board matches the beat's own recorded fen (board-true guarantee).
    const spoken = (m.spoken || '').trim();
    if (!spoken) continue;
    if (m.fen && norm(g.fen()) !== norm(m.fen)) { skipped++; continue; }
    const text = [spoken, m.teaches || '', m.plans || ''].join(' ');
    if (BANNED.test(text) || MOVE_NUM.test(text)) { skipped++; continue; }
    notes.push({
      id: `vc-${id}-${m.ply}`,
      lineSan: [...sans],
      // opening: null — a voiced note teaches its EXACT board (its lineSan/fen),
      // not an opening family. Keeping it position-only means it surfaces solely
      // on an exact-position match and never competes in the opening/family
      // preference tier (which would displace other corpora's notes). Pure
      // position selection is also the strictest reading of the corpus doctrine.
      opening: null,
      phase: phaseFor(sans.length),
      explains: spoken,
      teaches: m.teaches || '',
      plans: m.plans || '',
      concepts: [],
      sources: [`yt:${id}`],
      positionSource: 'high',
    });
    used = true;
  }
  if (used) videos++;
}

const bundle = {
  generatedAt: '2026-08-24',
  videosDistilled: videos,
  noteCount: notes.length,
  notes,
};
writeFileSync(OUT, JSON.stringify(bundle, null, 1));
const positioned = notes.filter((n) => n.lineSan.length > 0).length;
console.log(`wrote ${notes.length} voiced teaching notes (${positioned} position-keyed) from ${videos} videos -> ${OUT} (skipped ${skipped})`);
