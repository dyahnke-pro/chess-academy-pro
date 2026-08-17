#!/usr/bin/env node
/**
 * reanchor-report — which off-line notes can be rescued, and which cannot.
 *
 * A note anchored off every taught line is silent in Watch and Learn (CLAUDE.md,
 * the anchor-onto-the-taught-line rule). Ten of sixty-four sat on a taught line
 * when that was found. Fixing the rest is worth more than harvesting new video —
 * it multiplies work already paid for — but only if you know WHICH are fixable,
 * because they are not alike:
 *
 *   DIVERGES ON ITS LAST MOVE (shared === plies - 1). The position the note is
 *   written about is one move off a taught line, and that position IS reached in
 *   the lesson. These are the rescuable ones, and they rescue in two different
 *   ways: re-anchor the teaching onto the move the lesson actually plays, or
 *   keep it as an ALTERNATIVE at that fork — the lesson reaches the position,
 *   the note explains a different try from it, which is exactly the
 *   "other lines" content the forks exist for.
 *
 *   DIVERGES EARLY (shared far below plies). The lesson never goes near this
 *   position; the note is free-play and review material and stays where it is.
 *   The Alapin notes share ZERO plies with any taught line — a whole opening the
 *   repertoire teaches by a different move order. Nothing to rescue there, and
 *   forcing it would mean writing prose about a position the note was not
 *   authored at, which is the mis-anchoring this pipeline exists to prevent.
 *
 * Prints both groups so a session can work top-down instead of guessing.
 *
 * Usage:
 *   node scripts/video-align/reanchor-report.mjs
 */
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const sansOf = (pgn) => (pgn ?? '').split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));

/** Every line the repertoire teaches, main and variation alike. */
const taughtLines = (() => {
  const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
  const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
  const out = [];
  for (const r of rows) {
    if (r?.pgn) out.push({ name: r.name ?? '?', sans: sansOf(r.pgn) });
    for (const v of r?.variations ?? []) {
      if (v?.pgn) out.push({ name: `${r.name ?? '?'} / ${v.name ?? '?'}`, sans: sansOf(v.pgn) });
    }
  }
  return out;
})();

const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');

/** Positions the lessons actually walk through. */
const taughtPositions = (() => {
  const seen = new Set();
  for (const line of taughtLines) {
    const g = new Chess();
    for (const san of line.sans) {
      try { if (!g.move(san)) break; } catch { break; }
      seen.add(posKey(g.fen()));
    }
  }
  return seen;
})();

const notes = JSON.parse(readFileSync('src/data/video-teachings.json', 'utf8')).notes
  .filter((n) => n.id.startsWith('vn-'));

const rescuable = [];
const stranded = [];
let onLine = 0;

for (const note of notes) {
  const g = new Chess();
  let legal = true;
  for (const san of note.lineSan) {
    try { if (!g.move(san)) { legal = false; break; } } catch { legal = false; break; }
  }
  if (!legal) continue;
  if (taughtPositions.has(posKey(g.fen()))) { onLine++; continue; }

  // The deepest agreement with any taught line tells you how far the lesson
  // walks alongside this note before parting company.
  let shared = 0;
  let nearest = '';
  for (const line of taughtLines) {
    let i = 0;
    while (i < note.lineSan.length && i < line.sans.length && note.lineSan[i] === line.sans[i]) i++;
    if (i > shared) { shared = i; nearest = line.name; }
  }
  const row = { id: note.id, plies: note.lineSan.length, shared, nearest };
  (shared === note.lineSan.length - 1 ? rescuable : stranded).push(row);
}

const fmt = (r) => `  ${r.id.padEnd(56)} ${r.shared}/${r.plies}  ${r.nearest.slice(0, 36)}`;

console.log(`${notes.length} hand-written notes: ${onLine} already on a taught line\n`);
console.log(`RESCUABLE — the lesson reaches the position, the note explains a different move (${rescuable.length}):`);
console.log('  re-anchor onto the taught move, or keep as a fork alternative at that position');
rescuable.sort((a, b) => b.shared - a.shared).forEach((r) => console.log(fmt(r)));

console.log(`\nSTRANDED — the lesson never goes near these; free-play and review material (${stranded.length}):`);
stranded.sort((a, b) => b.shared - a.shared).slice(0, 12).forEach((r) => console.log(fmt(r)));
if (stranded.length > 12) console.log(`  … and ${stranded.length - 12} more`);
