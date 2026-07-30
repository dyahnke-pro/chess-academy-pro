#!/usr/bin/env node
// Build the chessbrah distillation work queue from the farmed transcript catalog.
//
// The distiller needs an external prior naming the opening — it fails closed
// without one rather than guessing a position (a wrong board handed over as
// authoritative is the "Bg5 pins the knight" failure manufactured at scale).
// For Naroditsky the video title IS that prior. Aman's series titles are
// marketing wrappers ("How to WIN with the QUEEN'S GAMBIT | 1400-1500 ELO",
// "Play the Sicilian Taimanov like a Grandmaster! | 2000-2100"), whose tokens
// dilute the name match below threshold — measured: 0 of 208 videos aligned.
//
// So the prior is curated here instead: one series → one canonical DB opening
// name, mapped by hand and verified against openings-lichess.json. A series
// that roams across openings (Building Habits, the mixed speedruns) maps to
// null ON PURPOSE — those notes key by concept and carry no position, which is
// correct, not a shortfall.
//
//   node scripts/danya-corpus/build-chessbrah-manifest.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const TDIR = 'data/sources/chessbrah-voice/transcripts';
const OUT = 'data/sources/chessbrah-voice/manifest.json';

// [title match, canonical DB opening name | null]. First match wins.
const SERIES_OPENING = [
  [/Play the Sicilian Taimanov/i, 'Sicilian Defense: Taimanov Variation'],
  [/QUEEN.S GAMBIT/i, "Queen's Gambit Declined"],
  [/Colle.?Zukertort/i, 'Colle System'],
  [/every game with 1\. ?b4/i, 'Polish Opening'],
  [/London System/i, 'Indian Defense: London System'],
  [/English Speedrun|EXPLAINS: The English/i, 'English Opening'],
  [/using the Stonewall/i, "Queen's Pawn Game: Stonewall Attack"],
  // Deliberately unmapped — these roam across openings, so no position prior.
  [/BUILDING HABITS/i, null],
  [/Building Repertoires/i, null],
  [/Attacking Speedrun/i, null],
  [/Let Aman Cook/i, null],
];

function hintFor(title) {
  for (const [re, opening] of SERIES_OPENING) if (re.test(title)) return opening;
  return null;
}

function main() {
  const catalog = JSON.parse(readFileSync(`${TDIR}/catalog.json`, 'utf8')).videos;
  const titles = new Map(catalog.map((v) => [v.id, v.title]));
  const ids = readdirSync(TDIR).filter((f) => f.endsWith('.txt')).map((f) => f.replace(/\.txt$/, ''));

  const videos = ids.map((id) => {
    const title = titles.get(id) ?? id;
    return { id, title, playlist: null, openingHint: hintFor(title) };
  });

  writeFileSync(OUT, `${JSON.stringify({ videos }, null, 2)}\n`);

  const byHint = new Map();
  for (const v of videos) {
    const k = v.openingHint ?? '(no position prior)';
    byHint.set(k, (byHint.get(k) ?? 0) + 1);
  }
  console.log(`${videos.length} videos → ${OUT}`);
  for (const [k, n] of [...byHint].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${k}`);
  }
}

main();
