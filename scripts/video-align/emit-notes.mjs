#!/usr/bin/env node
/**
 * emit-notes — builds -> `src/data/video-teachings.json`, the corpus the app reads.
 *
 * David 2026-08-17: *"i also want the narrations attached to the perspective
 * opening so i can test them in the morning."* A note sitting in a build file is
 * a record; nothing in the running app opens `data/video-tracks/`. This converts
 * the hand-written notes into the same `DanyaNote` shape the teaching service
 * already selects from, so they are reachable at the board through the existing
 * retrieval rather than through a second path invented for them.
 *
 * WHY `positionSource: 'high'`. That field decides whether a note is allowed to
 * describe a board (`isVerifiedPosition`), and it is the strongest claim in the
 * corpus — so it has to be earned. For the farmed notes it means an anchor pass
 * re-derived the position from the transcript and checked the note's claims
 * against it. For these it means something stronger: the position was READ OFF
 * THE SCREEN, frame by frame, and every move was validated by chess.js before
 * the tracker would accept it. There is no inference anywhere in the chain, so
 * these are the best-evidenced positions we have.
 *
 * THE OPENING TAG COMES FROM THE BOARD, NEVER THE TITLE — `map-openings` resolves
 * it, and the one video whose title disagreed with its own board (an upload
 * called "Scotch Game" that plays 3.Nc3 for eighty plies) is exactly why.
 *
 * Usage: node scripts/video-align/emit-notes.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const TRACK_DIR = 'data/video-tracks';
const OUT = 'src/data/video-teachings.json';

/** Opening vs middlegame by the same rough test the corpus uses: a note's phase
 *  has to match the board or `notePhaseMismatchesBoard` drops it. Endgame is not
 *  claimed here — none of these notes teach one, and guessing the phase is how a
 *  note gets rejected for a reason that has nothing to do with its content. */
const phaseFor = (fen, ply) => {
  const board = fen.split(' ')[0];
  const pieces = board.replace(/[^a-zA-Z]/g, '').length;
  if (pieces <= 12) return 'endgame';
  return ply <= 24 ? 'opening' : 'middlegame';
};

/** HOW GENERIC IS THIS POSITION? — the count of DB openings whose line passes
 *  through it.
 *
 *  A note anchored somewhere too generic speaks in almost every game that opens
 *  the same way, which is not teaching about a position but noise competing with
 *  the notes that are. The Glek lesson's only fork sits after 1.e4 e5, where a
 *  note would fire in every open game in the app.
 *
 *  PLY DEPTH IS THE WRONG PROXY FOR THIS, which a first cut got wrong and this
 *  measurement settled. Counting openings through each position: 1.e4 e5 has
 *  1020, three plies of the Englund (1.d4 e5 2.dxe5) has 8, and the Englund's
 *  own lines have 0-2. A depth rule at six plies would have thrown away the
 *  Englund's best teaching — which lives at plies 4 and 5 because the opening
 *  IS short — while a five-ply Three Knights line at 47 is perfectly specific.
 *  Specificity is what was actually meant, so it is what gets measured. */
const GENERIC_LIMIT = 100;

const openingsThrough = new Map();
{
  const dbAll = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
  for (const e of dbAll) {
    const c = new Chess();
    for (const san of e.pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
      try { c.move(san); } catch { break; }
      const k = c.fen().split(' ').slice(0, 2).join(' ');
      openingsThrough.set(k, (openingsThrough.get(k) ?? 0) + 1);
    }
  }
}

const notes = [];
const perVideo = [];
for (const file of readdirSync(TRACK_DIR).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
  const track = JSON.parse(readFileSync(join(TRACK_DIR, file), 'utf8'));
  if (!track.notes?.length) continue;
  // The subject is the deepest opening most of the lesson passes through.
  const subject = (track.openings ?? []).filter((o) => o.coverage >= 0.6)[0]?.name
    ?? (track.openings ?? [])[0]?.name ?? null;

  for (const n of track.notes) {
    const lineSan = n.line.split(' ').filter(Boolean);
    const generic = openingsThrough.get(n.fen.split(' ').slice(0, 2).join(' ')) ?? 0;
    if (generic > GENERIC_LIMIT) {
      console.error(`SKIP ${n.id}: ${generic} openings pass through this position — too generic to teach at`);
      continue;
    }
    // Replay rather than trust: the build gate already proves this, and doing it
    // again here costs nothing and means a corrupted build cannot ship prose
    // attached to a position that does not exist.
    const c = new Chess();
    let ok = true;
    for (const san of lineSan) {
      try { c.move(san); } catch { ok = false; break; }
    }
    if (!ok || c.fen().split(' ').slice(0, 2).join(' ') !== n.fen.split(' ').slice(0, 2).join(' ')) {
      console.error(`SKIP ${n.id}: line does not produce its stored position`);
      continue;
    }
    notes.push({
      id: n.id,
      lineSan,
      opening: subject,
      phase: phaseFor(n.fen, lineSan.length),
      explains: n.explains,
      teaches: n.teaches,
      plans: n.plans ?? '',
      concepts: n.concepts ?? [],
      sources: [n.source],
      positionSource: 'high',
    });
  }
  perVideo.push(`${track.videoId} (${track.notes.length}) -> ${subject}`);
}

const bundle = {
  generatedAt: new Date().toISOString().slice(0, 10),
  videosDistilled: perVideo.length,
  noteCount: notes.length,
  notes,
};

console.log(perVideo.map((s) => `  ${s}`).join('\n'));
console.log(`\n${notes.length} note(s) from ${perVideo.length} lesson(s)`);
if (process.argv.includes('--write')) {
  writeFileSync(OUT, JSON.stringify(bundle, null, 1));
  console.log(`wrote ${OUT}`);
}
