#!/usr/bin/env node
/**
 * map-openings — which named openings a tracked lesson actually covers.
 *
 * David 2026-08-17: *"right now all we do is map each opening with the
 * narrations and save the builds for later."*
 *
 * A track is keyed by videoId, which is the wrong key for that workflow: the
 * question asked later is "what do we have for the Traxler", not "what is in
 * video ykmGxE9DURo". This resolves the openings a lesson covers and writes an
 * index so a build is retrievable by opening.
 *
 * RESOLVED FROM THE MOVES, NEVER THE TITLE. A video title is marketing ("Busting
 * Unsound Openings"), and `openingFromTitle` exists precisely because it often
 * says nothing useful. Every line the lesson reached is looked up in
 * `openings-lichess.json`, which is the canon (G3): if a line is not in the DB
 * it does not get a name, rather than being given a plausible one.
 *
 * The result is a chain, not a single answer, and that is correct — a Traxler
 * lesson genuinely covers the King's Pawn Game, the Italian, the Two Knights and
 * the Traxler itself. The DEEPEST match is the lesson's real subject; the
 * shallower ones are how a student might arrive at it.
 *
 * Usage:
 *   node scripts/video-align/map-openings.mjs [--write]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { openingFromTitle } from '../danya-corpus/distill-v2.mjs';

// Runs over the SHIPPED corpus by default and over the staging bank on request
// (`VIDEO_TRACK_DIR=data/video-pending`). Staged tracks need the opening
// resolution and the title check as much as shipped ones do — more, in fact,
// since the whole point of the bank is that a later session can write from it
// without re-deriving whether the board matches the title.
const TRACK_DIR = process.env.VIDEO_TRACK_DIR ?? 'data/video-tracks';
const INDEX = join(TRACK_DIR, 'by-opening.json');

// INDEXED BY POSITION, NOT BY MOVE STRING. Occupancy cannot distinguish move
// ORDERS that reach the same board, so the tracker legitimately returns a
// permutation — the Alapin came back as "c3 c5 e4 d5 …" instead of "e4 c5 c3
// d5 …". Keyed on the move text that resolved to ZERO named openings for a
// video that is entirely about one. The position is what the opening IS.
const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
const posKey = (fen) => fen.split(' ').slice(0, 2).join(' ');
const byPos = new Map();
for (const e of db) {
  const c = new Chess();
  let ok = true;
  for (const san of e.pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t))) {
    try { if (!c.move(san)) { ok = false; break; } } catch { ok = false; break; }
  }
  if (!ok) continue;
  const k = posKey(c.fen());
  // First (shallowest) name for a position wins; deeper entries transposing
  // into it are the same board by another route.
  if (!byPos.has(k)) byPos.set(k, { ...e, plies: c.history().length });
}

/** Named openings a track covers, deepest first, each with the share of the
 *  lesson's distinct lines that passes through it.
 *
 *  COVERAGE IS WHAT NAMES THE SUBJECT, NOT DEPTH. Ranking by depth alone picked
 *  "Traxler Counterattack, King March Line" for a lesson that is plainly about
 *  the Traxler as a whole — the deepest name is just the furthest the teacher
 *  happened to walk one branch. The subject is the deepest position nearly
 *  every line passes THROUGH, which is the trunk the lesson keeps returning to.
 *  That is also what a rewind means, so the two agree by construction. */
export function openingsOf(track) {
  let line = [];
  const lines = new Set();
  const hits = new Map();
  for (const m of track.moves) {
    if (!m.line.length) continue;
    line = line.slice(0, m.ply - m.line.length);
    line.push(...m.line);
    lines.add(line.join(' '));
    // Every prefix, so a deep line credits the whole chain it passed through.
    const c = new Chess();
    for (let n = 1; n <= line.length; n++) {
      try { if (!c.move(line[n - 1])) break; } catch { break; }
      const e = byPos.get(posKey(c.fen()));
      if (e && !hits.has(e.name)) {
        hits.set(e.name, { eco: e.eco, plies: n, line: line.slice(0, n).join(' ') });
      }
    }
  }
  const all = [...lines];
  return [...hits.entries()]
    .map(([name, v]) => {
      const through = all.filter((l) => l === v.line || l.startsWith(v.line + ' ')).length;
      return { name, ...v, coverage: Number((through / all.length).toFixed(3)) };
    })
    .sort((a, b) => b.plies - a.plies);
}

const ALL_DB_NAMES = [...byPos.values()].map((e) => e.name);

/** DOES THE BOARD CONFIRM THE TITLE?
 *
 *  A title is a claim about a video written by whoever needed it clicked on;
 *  the board is the evidence. Usually they agree and this is silent. When they
 *  disagree the build has to say so, because the disagreement is invisible
 *  afterwards: an upload titled "Scotch Game" that plays 3.Nc3 for eighty plies
 *  is a Three Knights lesson, and filing its teaching under the title would send
 *  every note to an opening the lesson never touched (h-9MlTRN-fk, 2026-08-17).
 *
 *  ASKED AGAINST THE LESSON'S OWN OPENINGS, NOT THE WHOLE DB. Resolving the
 *  title against all 3,000 names and then checking whether that one position
 *  appeared reads well and is wrong: "French Defense, Adv. Nimzowitsch" resolves
 *  across the full DB to *Nimzowitsch Defense: French Connection* — a genuinely
 *  different opening that shares two words — so a correct title flagged, on a
 *  video whose board had resolved French Advance Nimzowitsch exactly. A warning
 *  that fires on correct input is a warning that gets ignored, which costs more
 *  than not having it.
 *
 *  So the question is not "which opening does the title name" but "can this
 *  title be describing THIS lesson", and the candidates are the openings the
 *  board already proved. The same resolver answers both, which keeps its
 *  hard-won eligibility rules (a name segment must actually identify something;
 *  a one-word name must be said in full) working on our side rather than
 *  against us.
 *
 *  A title that names no opening at all makes no claim — nothing to confirm and
 *  nothing to flag. */
const checkTitle = (track, openings) => {
  const title = track.title ?? '';
  // Does it claim an opening at all? Marketing titles ("Opening Blunders!!")
  // often do not, and silence is not a disagreement.
  const claims = openingFromTitle(title, ALL_DB_NAMES);
  // AN ABSENT VERDICT READS AS A PASSED ONE, so say so explicitly. Returning
  // null here left `titleCheck` unwritten, and a track with no field is
  // indistinguishable from one that was checked and cleared — which is exactly
  // how notes get written over a track nobody verified. Measured 2026-08-20: 6
  // of the 35 banked tracks were in this state, all of them marketing titles
  // that name no opening ("Master Class | Controlling Center", "Never Play
  // F6!"). Silence is still not a disagreement; it is now a RECORDED silence.
  if (!claims) return { claims: null, confirmed: null, unverifiable: 'title names no opening' };
  // Could it be describing one of the openings this lesson actually played?
  const matched = openingFromTitle(title, openings.map((o) => o.name));
  if (matched) return { claims: matched, confirmed: true };
  // A TITLE MAY BE LESS SPECIFIC THAN THE LINE, and that is agreement, not a
  // mistrack: "French Defense" over a lesson that played "French Defense:
  // Rubinstein Variation" is exactly right, and flagging it buries the real
  // mistracks in noise. Confirm when a played opening is a CHILD of the claim
  // (its name extends the claimed one) — never the reverse, since a lesson that
  // played the parent has not demonstrated the specific line a title claims.
  const child = openings.find((o) => o.name.toLowerCase().startsWith(`${claims.toLowerCase()}:`));
  if (child) return { claims, confirmed: true, viaParent: child.name };
  return { claims, confirmed: false };
};

const write = process.argv.includes('--write');
const index = {};
for (const file of readdirSync(TRACK_DIR).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
  const path = join(TRACK_DIR, file);
  const track = JSON.parse(readFileSync(path, 'utf8'));
  const openings = openingsOf(track);
  console.log(`${track.videoId}: ${openings.length} named opening(s)`);
  for (const o of openings.slice(0, 4)) console.log(`   ${o.eco}  ${o.name}  (${o.plies} plies)`);
  if (openings.length > 4) console.log(`   … and ${openings.length - 4} shallower`);

  const titleCheck = checkTitle(track, openings);
  if (titleCheck && titleCheck.claims && !titleCheck.confirmed) {
    console.log(`   ⚠ TITLE UNCONFIRMED — claims "${titleCheck.claims}", which this lesson never played`);
  }

  // The SUBJECT is the deepest name that still carries most of the lesson.
  // A 2-ply match ("King's Pawn Game") covers everything and teaches nothing
  // about what this build contains; the deepest match covers one branch. The
  // subject sits where depth and coverage meet.
  const COVERS = 0.6;
  const subject = openings.filter((o) => o.coverage >= COVERS)[0]?.name ?? openings[0]?.name;
  for (const o of openings) {
    (index[o.name] ??= []).push({
      videoId: track.videoId,
      eco: o.eco,
      plies: o.plies,
      coverage: o.coverage,
      subject: o.name === subject,
      forks: (track.forks ?? []).length,
    });
  }
  if (write) {
    track.openings = openings;
    // The upload's own title stays untouched — it is how the build points back
    // at its source, and rewriting it to what the board says would destroy that
    // link to make the record tidier. The disagreement is recorded ALONGSIDE it.
    //
    // A HAND VERDICT SURVIVES A RE-RUN. When a title is unconfirmed, someone has
    // to look and decide whether the TITLE is wrong or the TRACK is, and that
    // judgement is the expensive part. Recomputing `titleCheck` wholesale wiped
    // it — the verdict on the "Scotch Game" upload vanished the moment this
    // script ran again, which would have put the build straight back into the
    // unresolved pile it had already been rescued from.
    // ANY prior verdict survives — not just one whose `claims` still match.
    // Requiring the match guarded the machine-vs-machine case and missed the
    // one that matters: a HAND verdict is written as {verdict, checkedBy} with
    // no `claims` field at all, so `undefined === "Benko Gambit"` was false and
    // the human judgement was replaced — by the OPPOSITE conclusion. The Benko
    // was hand-checked as `mistracked` ("No notes written") and a re-run turned
    // it into `confirmed: true`, which is how a bad track gets notes written
    // over it. When the machine now disagrees with a standing verdict it says
    // so in `machineClaims` instead of overwriting; nothing is lost and the
    // disagreement is visible to whoever looks next.
    if (titleCheck) {
      const prior = track.titleCheck ?? {};
      if (prior.verdict) {
        const disagrees = prior.claims && prior.claims !== titleCheck.claims;
        track.titleCheck = {
          ...titleCheck,
          verdict: prior.verdict,
          checkedBy: prior.checkedBy,
          ...(disagrees ? { priorClaims: prior.claims } : {}),
        };
      } else {
        track.titleCheck = titleCheck;
      }
    }
    writeFileSync(path, JSON.stringify(track, null, 1));
  }
}

if (write) {
  writeFileSync(INDEX, JSON.stringify(index, null, 1));
  console.log(`\nwrote ${Object.keys(index).length} opening(s) -> ${INDEX}`);
}
