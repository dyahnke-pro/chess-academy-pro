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

/** Lines the repertoire teaches, for the fork computation below. */
const TAUGHT_LINES = (() => {
  try {
    const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
    const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
    const sansOf = (pgn) => (pgn ?? '').split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
    const out = [];
    for (const r of rows) {
      if (r?.pgn) out.push({ name: r.name ?? '?', sans: sansOf(r.pgn) });
      for (const v of r?.variations ?? []) {
        if (v?.pgn) out.push({ name: `${r.name ?? '?'} / ${v.name ?? '?'}`, sans: sansOf(v.pgn) });
      }
    }
    return out;
  } catch { return []; }
})();

/** The fork this note sits on, when its line matches a taught line up to its
 *  own last move. Anything shallower is a different line, not a fork, and
 *  claiming otherwise would put the note at a position it was not authored at. */
function forkOf(lineSan) {
  let best = null;
  for (const line of TAUGHT_LINES) {
    let i = 0;
    while (i < lineSan.length && i < line.sans.length && lineSan[i] === line.sans[i]) i++;
    if (i === lineSan.length - 1 && i < line.sans.length && (!best || i > best.i)) best = { i, line };
  }
  if (!best) return null;
  return {
    atLine: lineSan.slice(0, best.i),
    taughtMove: best.line.sans[best.i],
    alternative: lineSan[best.i],
    lineName: best.line.name,
  };
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
      // 🔒 THE REASONS MUST SURVIVE THE BAKE. They were dropped here for the
      // field's entire life: 24 note files carried structured reasons, the
      // authoring check verified every one against the board, and then this
      // builder rebuilt the note without the field — so `video-teachings.json`
      // shipped with ZERO occurrences of "reasons" and `reasonCheck.ts` had no
      // runtime importer at all. The multi-reason rule (David 2026-08-17) was
      // therefore build-time only: it proved the prose was true on the day it
      // was written and handed the app nothing it could re-check.
      //
      // That is the whole point of storing reasons atomically. In free play the
      // student reaches a SIMILAR position, not this one, so which reasons still
      // hold varies with their board — and only a structured reason can be
      // tested there. Without the field the coach must choose between silence
      // and a claim it cannot verify, which is exactly the choice G0 exists to
      // remove. Gated by `videoNoteReasons.test.ts`.
      ...(n.reasons?.length ? { reasons: n.reasons } : {}),
      // The OTHER checkable shape. A comparison note ("two bishop developments
      // come into consideration") asserts nothing about the move it sits on, so
      // it carries no reasons — what it asserts is the set of candidate moves at
      // this position, each one legal there. That is the fork content David
      // locked on 2026-08-17: Learn names that a choice exists, Review walks it.
      ...(n.options?.length ? { options: n.options } : {}),
      // A structural note claims neither. Declared rather than left blank so
      // "no reasons" can never again mean "nobody looked" — the state is a
      // decision with a recorded justification, and the gate holds the count.
      ...(n.structural ? { structural: n.structural } : {}),
      // A note one move off a taught line is not off-line teaching to be
      // discarded — it is a FORK. Computed here so the relationship can never
      // be typed wrong: the shared prefix is the position the student actually
      // reaches, and both the taught move and this note's alternative come off
      // the real lines. David 2026-08-17 chose this over re-anchoring, because
      // re-anchoring onto the taught move throws away what the note teaches
      // while the fork keeps it AND supplies the "other lines" content.
      ...(forkOf(lineSan) ? { forkOf: forkOf(lineSan) } : {}),
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
