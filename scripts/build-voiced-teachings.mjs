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

/** A source field that may be ONE idea or a LIST of them, rendered as one
 *  string. Semicolons, because the items are clauses ("provoke h4 then fix it
 *  with h3") and a comma join reads as a single run-on idea. */
const asText = (v) => (Array.isArray(v) ? v.filter(Boolean).join('; ') : (v || ''));

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
  // Fail loudly rather than defaulting: an undeclared seat silently becomes a
  // WRONG seat on half the corpus, and the guard downstream cannot tell a
  // default from a fact. All 430 sources declare it today.
  const seat = j.studentSide;
  if (seat !== 'white' && seat !== 'black') {
    throw new Error(`${f}: studentSide must be 'white' or 'black', got ${JSON.stringify(seat)}`);
  }
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
      // 🚨 COERCE TO TEXT. The source bank writes these as EITHER a string or a
      // LIST of ideas, and this passed through whichever it found — so 691
      // `teaches` and 26 `plans` shipped as ARRAYS against a type that says
      // `string`. `teachingBeatText` does `(part ?? '').trim()` and threw
      // `TypeError: .trim is not a function` on all 694, swallowed by two
      // "the corpus is a bonus" catches: a SILENT teaching loss, the whole
      // teaching line vanishing from the facts package whenever one was picked.
      // Five other readers stringified the array instead, giving comma-jammed
      // prose ("the French central tension,the d4 break").
      teaches: asText(m.teaches),
      plans: asText(m.plans),
      concepts: [],
      sources: [`yt:${id}`],
      positionSource: 'high',
      // The SEAT the prose was authored from. Voiced narration says "you/your"
      // for the video's student and "they/their" for the opponent, so a note
      // served to a student sitting on the OTHER side inverts every pronoun in
      // it — "your knight" becomes a claim about the opponent's piece, on a
      // board where the geometry is identical. The position match cannot see
      // that: both seats share the FEN. Carried here so selection can refuse.
      studentSide: seat,
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
