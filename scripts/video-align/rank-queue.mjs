#!/usr/bin/env node
/**
 * rank-queue — put the videos the app can actually use at the FRONT of a queue.
 *
 * The queue was in playlist order, which is upload order, which has nothing to
 * do with what this app teaches. At the rate YouTube will serve — one video at a
 * time with jittered gaps, because four-at-a-time got the IP bot-checked — a
 * 336-video queue is weeks of harvesting. Order is therefore the only lever that
 * matters: it decides which fifty land first, not how many land in total.
 *
 * RANKED AGAINST WHAT THE APP TEACHES, NOT AGAINST WHAT LOOKS IMPORTANT. A video
 * earns its place by naming an opening that has a repertoire entry, a pro-rep
 * entry, or a curated lesson — those are the surfaces a note can attach to. A
 * brilliant lesson on an opening the app does not teach produces a note nothing
 * ever retrieves.
 *
 * Ties break toward the opening-lab playlist, which is one opening per video and
 * therefore the shape that tracks cleanly; speedruns wander across several games
 * per upload and cost more per usable ply.
 *
 * Usage:
 *   node scripts/video-align/rank-queue.mjs data/video-queues/naroditsky.txt [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [queuePath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const write = process.argv.includes('--write');
if (!queuePath) {
  console.error('usage: rank-queue.mjs <queue.txt> [--write]');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync('data/sources/naroditsky-voice/manifest.json', 'utf8'));
const videos = Array.isArray(manifest) ? manifest : (manifest.videos ?? []);
const byId = new Map(videos.map((v) => [v.id, v]));

/** Opening names the app teaches, lowercased.
 *
 *  Two sources, because those are the surfaces a note can attach to: the base
 *  repertoire (the openings a student trains) and the pro repertoires. A name
 *  absent from both has nowhere to land, however good the lesson is. */
// READ THE OPENINGS, NOT EVERYTHING IN THE FILE. `pro-repertoires.json` is
// `{ players, openings }`, and flattening both put PLAYER names into the
// opening vocabulary — which is where `speedrun` came from ("The Speedrun
// Attacking Repertoire" is a repertoire persona, not an opening). Every junk
// keyword traced back to this one line, so the fix belongs here and not in an
// ever-growing stopword list downstream.
const taught = new Set();
const addName = (name) => { if (typeof name === 'string' && name.length > 2) taught.add(name.toLowerCase()); };
const load = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch { return null; }
};
const repertoire = load('src/data/repertoire.json');
// TOP-LEVEL OPENING NAMES ONLY. Variation labels are informal working titles
// ("double fianchetto (g3)", "black declines with Bd7", "vs ...b6 (Owen)") and
// their tokens are ordinary English — `double`, `declines`, `black` — so they
// match titles that have nothing to do with the line. An opening name is the
// one field here written to identify an opening.
for (const r of Array.isArray(repertoire) ? repertoire : []) addName(r?.name);
const pro = load('src/data/pro-repertoires.json');
for (const r of pro?.openings ?? []) addName(r?.name);

// The distinctive WORDS of a taught opening, minus the ones that identify
// nothing on their own. "Defense" matches half the database; "Najdorf" matches
// one thing. Scoring on the generic half is how everything ends up tied.
//
// A HAND-WRITTEN STOPWORD LIST IS NOT ENOUGH, and assuming it was produced a
// ranking that scored all 336 videos identically and reported that as "336 name
// an opening the app teaches" — a discriminator that discriminates nothing,
// announcing success. The token that did it was `speedrun`, from a pro-rep
// entry literally named "The Speedrun Attacking Repertoire", which matches
// every speedrun upload on the channel. No stopword list written in advance
// would have contained it.
//
// So genericness is MEASURED against the corpus being ranked, the same way
// note anchors are screened by how many openings pass through a position
// rather than by depth: a token appearing in a large share of titles cannot be
// telling them apart, whatever it means.
const GENERIC = new Set([
  'defense', 'defence', 'attack', 'game', 'opening', 'variation', 'system',
  'gambit', 'line', 'main', 'classical', 'modern', 'accepted', 'declined',
  'the', 'and', 'with', 'of', 'a', 'an', 'vs', 'king', 'queen', 'pawn',
]);
// WORD BOUNDARIES, NOT SUBSTRINGS. `includes` matched "From's Gambit" against
// the word *from* in a title, and "Open Ruy Lopez" against *Opening* — both
// scored as a confident opening match on a video about neither.
const hasWord = (text, tok) => new RegExp(`\\b${tok}\\b`).test(text);
const titles = videos.map((v) => (v.title ?? '').toLowerCase());
const TOO_COMMON = Math.max(3, Math.floor(titles.length * 0.05));
const keywords = new Map();
for (const name of taught) {
  for (const tok of name.split(/[^a-zà-ÿ]+/i).filter(Boolean)) {
    if (GENERIC.has(tok) || tok.length < 4) continue;
    if (keywords.has(tok)) continue;
    if (titles.filter((t) => hasWord(t, tok)).length > TOO_COMMON) continue;
    keywords.set(tok, name);
  }
}

const score = (video) => {
  const title = (video.title ?? '').toLowerCase();
  const hits = [...keywords.entries()].filter(([tok]) => hasWord(title, tok));
  let s = hits.length ? 100 : 0;
  // One opening per video tracks far more cleanly than a speedrun that wanders
  // across several games — same download cost, more usable plies.
  if (video.playlist === 'opening-lab') s += 10;
  return { s, matched: hits.map(([, name]) => name)[0] ?? null };
};

const ids = readFileSync(queuePath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
const ranked = ids
  .map((id, i) => {
    const v = byId.get(id) ?? { id, title: '' };
    const { s, matched } = score(v);
    return { id, title: v.title ?? '', matched, s, i };
  })
  // Stable within a band: original order is the channel's own, which is as good
  // a tie-break as any and keeps the diff readable.
  .sort((a, b) => b.s - a.s || a.i - b.i);

const useful = ranked.filter((r) => r.s >= 100).length;
console.log(`${ranked.length} queued, ${useful} name an opening the app teaches`);
for (const r of ranked.slice(0, 12)) {
  console.log(`  ${String(r.s).padStart(3)}  ${(r.matched ?? '—').slice(0, 30).padEnd(32)} ${r.title.slice(0, 54)}`);
}

if (write) {
  writeFileSync(queuePath, ranked.map((r) => r.id).join('\n') + '\n');
  console.log(`\nrewrote ${queuePath} — ${useful} useful videos now lead the queue`);
}
