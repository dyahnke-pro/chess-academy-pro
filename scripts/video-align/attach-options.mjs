#!/usr/bin/env node
/**
 * attach-options — pair a PLAN note to the fork it is teaching.
 *
 * WHY THIS EXISTS. Retrofitting `reasons` onto the 27 notes that lacked them
 * turned out to be the wrong repair, and `move-facts` said so before a word was
 * written: for most of them `attacks/defends/controls` came back empty or
 * unclaimed. Reading all 27 in full showed why — they are not claims about the
 * move they sit on. Every one is a COMPARISON: "two bishop developments come
 * into consideration", "two checks are available and only one works", "the
 * natural move and the equalising move are not the same". A note like that
 * asserts nothing about its anchor move's board effects, so there is nothing
 * atomic to check, and inventing a reason would make the checker pass on a
 * claim nobody made — the failure `move-facts` warns about, reached from the
 * other side.
 *
 * What they DO assert is a set of candidate MOVES at a position, and that is
 * every bit as checkable: each option must be legal there. The structure was
 * already sitting in the track — `forks`, recovered from the teacher's own
 * rewinds — unpaired with the prose written about it. The Belgrade note reads
 * "one to d3, and one straight to b5"; its fork's options are Bd3 and Bb5.
 *
 * So a note carries `reasons` when it claims something about its move, and
 * `options` when it teaches a choice. Both are verified; neither is prose the
 * app has to take on trust. That is what "every note has reasoning behind it"
 * means for a note whose reasoning is about the fork.
 *
 * Usage: node scripts/video-align/attach-options.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const TRACK_DIR = 'data/video-tracks';
const NOTE_DIR = 'data/video-notes';
const write = process.argv.includes('--write');

let paired = 0;
let already = 0;
let unmatched = 0;

for (const file of readdirSync(TRACK_DIR).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
  const track = JSON.parse(readFileSync(join(TRACK_DIR, file), 'utf8'));
  const notePath = join(NOTE_DIR, `${track.videoId}.json`);
  if (!existsSync(notePath)) continue;
  const notes = JSON.parse(readFileSync(notePath, 'utf8'));
  const forks = track.forks ?? [];
  let touched = false;

  for (const note of notes) {
    if (note.reasons?.length || note.options?.length) { already += 1; continue; }
    // EXACT line match only. A fork one ply away is a different position, and
    // pairing prose to a choice offered somewhere else is the same mis-anchoring
    // this corpus already had to be cleaned of once.
    const fork = forks.find((f) => (f.line ?? []).join(' ') === note.line.trim());
    if (!fork?.options?.length) { unmatched += 1; continue; }

    // The position the note sits on, and every option legal from it. An option
    // that does not verify is dropped rather than carried — a fork is only
    // teaching if the moves it names can actually be played.
    const board = new Chess();
    let legalLine = true;
    for (const san of note.line.trim().split(/\s+/)) {
      try { board.move(san); } catch { legalLine = false; break; }
    }
    if (!legalLine) {
      console.error(`SKIP ${note.id}: its own line is not legal`);
      continue;
    }
    const options = [];
    for (const o of fork.options) {
      const probe = new Chess(board.fen());
      try { probe.move(o.san); } catch {
        console.error(`DROP ${note.id}: ${o.san} is not legal at this position`);
        continue;
      }
      options.push({ san: o.san, ...(o.continuation ? { continuation: o.continuation } : {}) });
    }
    if (options.length < 2) { unmatched += 1; continue; }
    note.options = options;
    paired += 1;
    touched = true;
    console.log(`✓ ${note.id.padEnd(52)} ${options.map((o) => o.san).join(' / ')}`);
  }

  if (touched && write) writeFileSync(notePath, `${JSON.stringify(notes, null, 1)}\n`);
}

console.log(`\n${paired} note(s) paired to a fork, ${already} already structured, ${unmatched} with no fork at their position`);
if (!write) console.log('(dry run — pass --write)');
