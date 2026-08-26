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
 * Only MAIN-LINE beats are emitted (the fen-anchored spine), so lineSan always
 * replays to the note's own fen. Analysis/rewind beats are skipped — see
 * scripts/voiced-authoring/fen-spine.mjs for why the ply-monotonic guard this
 * once used was insufficient (rewinds that walk a new variation climb past the
 * old max ply and were spliced in).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { reconstructSpineFen } from './voiced-authoring/fen-spine.mjs';

const SRC = 'data/video-narration-voiced';
const OUT = 'public/data/voiced-teachings.json';
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
  let used = false;
  // Fen-anchored main line: each accepted node carries its cumulative lineSan and
  // the board after it, guaranteed to replay to that node's own recorded fen.
  const { nodes } = reconstructSpineFen(j.moves);
  for (const m of nodes) {
    const sans = m.lineSan;
    const spoken = (m.spoken || '').trim();
    if (!spoken) continue;
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
  generatedAt: new Date().toISOString().slice(0, 10),
  videosDistilled: videos,
  noteCount: notes.length,
  notes,
};
writeFileSync(OUT, JSON.stringify(bundle, null, 1));
const positioned = notes.filter((n) => n.lineSan.length > 0).length;
console.log(`wrote ${notes.length} voiced teaching notes (${positioned} position-keyed) from ${videos} videos -> ${OUT} (skipped ${skipped})`);
