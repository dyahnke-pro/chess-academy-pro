#!/usr/bin/env node
/**
 * note-anchors — where a lesson can be given a note, and which taught line it lands on.
 *
 * Writing a note needs three things at once: the exact move sequence to put in
 * `line`, the timestamp to read the captions at, and whether the position is on
 * a line the repertoire teaches (an off-line note is silent in Watch and Learn).
 * Working those out by hand is three tools and a transposition trap.
 *
 * THE TRAP, WHICH COST A ROUND TRIP: `attach-notes` matches a note by the exact
 * SAN STRING the lesson walked, while `check-notes` matches the taught line by
 * FEN. A lesson that reaches the taught position through a different move order
 * — 4.d4 cxd4 5.Nf3 Nc6 6.cxd4 d6 against the repertoire's 5.cxd4 d6 6.Nf3 Nc6 —
 * is on the taught line and is still REFUSED, because the strings differ. So the
 * `line` a note carries must always be the VIDEO's order. This prints that.
 *
 * Usage: node scripts/video-align/note-anchors.mjs <videoId> [--all]
 *        (default lists only anchors that sit on a taught line)
 */
import { readFileSync, existsSync } from 'node:fs';
import { Chess } from 'chess.js';

const [videoId, ...flags] = process.argv.slice(2);
const all = flags.includes('--all');
if (!videoId) { console.error('usage: note-anchors <videoId> [--all]'); process.exit(2); }

const trackPath = ['data/video-tracks', 'data/video-pending']
  .map((d) => `${d}/${videoId}.json`)
  .find((p) => existsSync(p));
if (!trackPath) { console.error(`no track for ${videoId} in video-tracks or video-pending`); process.exit(2); }

const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

/** Above this, the speech in a window almost certainly spans several boards. */
const LONG_WINDOW = 300;

/** Every position the repertoire walks, labelled by the line that walks it. */
const taught = new Map();
{
  const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
  const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
  const walk = (pgn, label) => {
    const g = new Chess();
    for (const san of (pgn ?? '').split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
      try { if (!g.move(san)) break; } catch { break; }
      const k = posKey(g.fen());
      if (!taught.has(k)) taught.set(k, label);
    }
  };
  for (const r of rows) { walk(r?.pgn, r.name); for (const v of r?.variations ?? []) walk(v?.pgn, `${r.name} / ${v.name}`); }
}

/** Positions that already carry a hand-written note, so a second one is not written. */
const noted = new Set();
{
  const { readdirSync } = await import('node:fs');
  for (const f of readdirSync('data/video-notes').filter((x) => x.endsWith('.json'))) {
    for (const n of JSON.parse(readFileSync(`data/video-notes/${f}`, 'utf8'))) {
      const g = new Chess();
      let ok = true;
      for (const s of n.line.split(' ')) { try { if (!g.move(s)) { ok = false; break; } } catch { ok = false; break; } }
      if (ok) noted.add(posKey(g.fen()));
    }
  }
}

const track = JSON.parse(readFileSync(trackPath, 'utf8'));

/**
 * What was being SAID over each position, from the pairing.
 *
 * A note is written from the captions — the board says what is TRUE here, the
 * captions say which of those true things the lesson is TEACHING — so the words
 * belong in this listing rather than behind a second command. Printing a
 * timestamp and leaving the reader to go fetch it is how four notes came to be
 * written off the board alone: `at.mjs` failed silently on a missing transcript
 * and the gap was not obvious mid-batch.
 */
const said = new Map();
{
  const pairPath = `data/video-narration/${videoId}.json`;
  if (existsSync(pairPath)) {
    for (const m of JSON.parse(readFileSync(pairPath, 'utf8')).moves ?? []) {
      if (m.said?.trim()) said.set(m.fen ? posKey(m.fen) : `ply:${m.ply}`, m.said.trim());
    }
  }
}

console.log(`${track.title}\n${trackPath}${track.titleCheck ? `  titleCheck=${JSON.stringify(track.titleCheck)}` : ''}`);
console.log(said.size ? `captions paired at ${said.size} position(s)\n` : 'NO PAIRED CAPTIONS — run pair-narration.mjs before writing\n');

let line = [];
const seen = new Set();
let onLine = 0;
for (const m of track.moves ?? []) {
  if (!m.line?.length) continue;
  line = line.slice(0, m.ply - m.line.length);
  line.push(...m.line);
  const key = line.join(' ');
  if (seen.has(key)) continue;
  seen.add(key);
  const label = m.fen ? taught.get(posKey(m.fen)) : undefined;
  if (label) onLine += 1;
  if (!label && !all) continue;
  const already = m.fen && noted.has(posKey(m.fen)) ? ' [HAS NOTE]' : '';
  console.log(`ply ${String(m.ply).padStart(3)}  t=${String(Math.round(m.t)).padStart(5)}s  ${label ?? '(off line)'}${already}`);
  console.log(`   ${key}`);
  const words = m.fen ? said.get(posKey(m.fen)) : undefined;
  if (words) {
    // A LONG WINDOW IS A WARNING, NOT A WINDFALL. The window runs from this
    // position settling to the next one settling, so when the tracker loses the
    // board the words of many positions pile into one entry. Measured across the
    // bank: 76% of windows are under 60 words, but 163 windows (0.7%) hold 23%
    // of every paired word. Writing a note from one of those risks attaching
    // teaching that belongs to a board the reader never saw — which is the exact
    // disease this whole pipeline exists to cure.
    const n = words.split(/\s+/).filter(Boolean).length;
    if (n > LONG_WINDOW) {
      console.log(`   ⚠ ${n} words over one position — the tracker lost the board here, so this`);
      console.log('     speech covers several boards. Check it against the video before writing.');
    }
    // Reference only, never quoted — it tells you WHICH established idea the
    // lesson is on here, out of the several it could be making. The shipped
    // prose is original.
    const text = words.length > 1200 && !all ? `${words.slice(0, 1200)} …` : words;
    console.log(`   said: ${text.replace(/\s+/g, ' ')}`);
  } else {
    console.log('   said: (nothing spoken over this position)');
  }
  console.log('');
}
console.log(`\n${onLine} anchor(s) on a taught line, ${seen.size} settled position(s) in the lesson`);
