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
process.exit(failed ? 1 : 0);
