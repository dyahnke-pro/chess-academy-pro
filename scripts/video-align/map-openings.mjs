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

const TRACK_DIR = 'data/video-tracks';
const INDEX = join(TRACK_DIR, 'by-opening.json');

const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
const byLine = new Map();
for (const e of db) {
  const sans = e.pgn.trim().split(/\s+/).filter((t) => !/^\d+\.+$/.test(t));
  byLine.set(sans.join(' '), e);
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
    for (let n = line.length; n >= 2; n--) {
      const key = line.slice(0, n).join(' ');
      const e = byLine.get(key);
      if (e && !hits.has(e.name)) hits.set(e.name, { eco: e.eco, plies: n, line: key });
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

const write = process.argv.includes('--write');
const index = {};
for (const file of readdirSync(TRACK_DIR).filter((f) => f.endsWith('.json') && f !== 'by-opening.json')) {
  const path = join(TRACK_DIR, file);
  const track = JSON.parse(readFileSync(path, 'utf8'));
  const openings = openingsOf(track);
  console.log(`${track.videoId}: ${openings.length} named opening(s)`);
  for (const o of openings.slice(0, 4)) console.log(`   ${o.eco}  ${o.name}  (${o.plies} plies)`);
  if (openings.length > 4) console.log(`   … and ${openings.length - 4} shallower`);

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
    writeFileSync(path, JSON.stringify(track, null, 1));
  }
}

if (write) {
  writeFileSync(INDEX, JSON.stringify(index, null, 1));
  console.log(`\nwrote ${Object.keys(index).length} opening(s) -> ${INDEX}`);
}
