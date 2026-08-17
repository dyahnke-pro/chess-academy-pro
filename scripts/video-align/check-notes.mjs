#!/usr/bin/env node
/**
 * check-notes — run every hand-written note's reasons against the real board.
 *
 * The standard says verify each board claim with chess.js BEFORE writing it
 * (CLAUDE.md, the hand-written-notes rule). This is that check made repeatable,
 * so a note is re-verified every time rather than only on the day it was
 * written — a note stays true only as long as its line does.
 *
 * It earns its place immediately. Writing the first two notes, the transcript's
 * own words turned out to overstate the position twice: the b8 knight it called
 * deprived still had c6 and a6, and the bishop it called useless had eight
 * squares. Both would have read as confident teaching and both are false. The
 * sharpest fact in that lesson — that blocking on d7 makes Qxd5 illegal, so the
 * pawn can only be regained with the knight — was never said out loud at all.
 *
 * Usage:
 *   node scripts/video-align/check-notes.mjs [videoId]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { checkReasons } from '../../src/services/reasonCheck.ts';

const DIR = 'data/video-notes';

/** Every position the repertoire's taught lines actually walk through.
 *
 *  A NOTE OFF THE TAUGHT LINE IS SILENT IN WATCH AND LEARN. It still fires in
 *  free play and review, where the student reaches whatever they reach — but
 *  that is not where most students meet the coach. Measured when this check was
 *  added: 10 of 64 hand-written notes were on a taught line. The other 54 were
 *  written from wherever the video happened to settle, which is nobody's fault
 *  but is a 16% hit rate on work that is expensive to produce.
 *
 *  The fix is to anchor the note onto the taught line, NEVER to bend the taught
 *  line toward the note: spines are data-chosen (the most-played master move at
 *  each ply), and steering them by what we happen to have prose for would mean
 *  teaching what we can narrate instead of what the data says is theory. */
const taughtPositions = (() => {
  const seen = new Set();
  const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');
  try {
    const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
    const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
    const walk = (pgn) => {
      const g = new Chess();
      for (const san of (pgn ?? '').split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
        try { if (!g.move(san)) break; } catch { break; }
        seen.add(posKey(g.fen()));
      }
    };
    for (const r of rows) { walk(r?.pgn); for (const v of r?.variations ?? []) walk(v?.pgn); }
  } catch { /* no repertoire on disk: skip the check rather than fail every note */ }
  return seen;
})();

/** Opening names that must not appear in a note's prose. Kept short and
 *  literal on purpose — this is a tripwire for the commonest phrasing, not an
 *  attempt to parse chess English. */
const OTHER_OPENINGS = [
  'French', 'Sicilian', 'Caro-Kann', 'Pirc', 'Alekhine', 'Scandinavian',
  'Najdorf', 'Dragon', 'Grunfeld', 'Gr\u00fcnfeld', 'Nimzo', 'Benoni', 'Slav',
  'Dutch', 'Latvian', 'Vienna', 'Traxler', 'Englund', 'London', 'Catalan',
  'Ruy Lopez', 'Italian', 'Scotch', 'Petroff', 'Philidor', 'Queen\u2019s Gambit',
];
const only = process.argv[2];

let checked = 0;
let failed = 0;
let unverifiable = 0;
const offLine = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  if (only && !file.startsWith(only)) continue;
  const notes = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  for (const note of notes) {
    const sans = note.line.trim().split(/\s+/);
    // The line itself is a claim: it must be legal, or every reason under it is
    // being checked against a board that never existed.
    const game = new Chess();
    let legal = true;
    for (const san of sans.slice(0, -1)) {
      try { game.move(san); } catch { legal = false; break; }
    }
    if (!legal) {
      console.log(`✗ ${note.id}\n    line is not legal: ${note.line}`);
      failed++;
      continue;
    }
    const san = sans[sans.length - 1];
    if (!note.reasons?.length) {
      // Not a failure: the older notes predate structured reasons. Counted, so
      // the backlog is visible rather than silently tolerated.
      unverifiable++;
      continue;
    }
    // NAMING ANOTHER OPENING GETS THE NOTE SILENTLY DROPPED. The anchor-
    // integrity guard rejects a note whose prose opens on a different opening,
    // because that is the signature of a mis-anchored note — teaching filed at
    // the right position but written about somewhere else. A perfectly true
    // aside ("the same idea the French is built on") trips it just as hard, and
    // the note then passes every other check here while never reaching a
    // student. Caught only by probing the selector by hand; flagged now so the
    // next writer sees it at authoring time.
    const prose = `${note.teaches} ${note.explains}`;
    const foreign = OTHER_OPENINGS.filter((name) => new RegExp(`\\b${name}\\b`, 'i').test(prose));
    if (foreign.length) {
      console.log(`⚠ ${note.id}\n    names another opening (${foreign.join(', ')}) — it will be dropped at selection`);
      failed++;
      continue;
    }

    // Reachability is a WARNING, not a failure: an off-line note is still real
    // teaching that fires in free play and review. It is surfaced so the choice
    // to leave it there is deliberate rather than accidental.
    if (taughtPositions.size) {
      const after = new Chess(game.fen());
      let reachable = false;
      try { after.move(san); reachable = taughtPositions.has(after.fen().split(' ').slice(0, 2).join(' ')); } catch { /* checked below */ }
      if (!reachable) offLine.push(note.id);
    }

    const verdicts = checkReasons(game.fen(), san, note.reasons);
    const bad = verdicts.filter((v) => !v.holds);
    checked += verdicts.length;
    if (bad.length) {
      failed++;
      console.log(`✗ ${note.id}`);
      for (const v of bad) console.log(`    ${v.reason.kind}: ${v.note}`);
    } else {
      console.log(`✓ ${note.id}  (${verdicts.length} reason${verdicts.length === 1 ? '' : 's'})`);
    }
  }
}

console.log(`\n${checked} reasons checked, ${failed} note(s) failed, ${unverifiable} note(s) carry no structured reasons yet`);
if (offLine.length) {
  console.log(`\n⚠ ${offLine.length} note(s) sit OFF every taught line — silent in Watch/Learn, live only in free play and review:`);
  for (const id of offLine.slice(0, 10)) console.log(`    ${id}`);
  if (offLine.length > 10) console.log(`    … and ${offLine.length - 10} more`);
  console.log('  Anchor onto the taught line where the idea survives the move; never bend the line to the note.');
}
process.exit(failed ? 1 : 0);
