#!/usr/bin/env node
// derive-note-anchors — give a teaching note the position it is ALREADY about.
//
// David 2026-08-08: "Lots missing as far as narrations go… missing maturity of
// the corpus. Don't stop until all gaps are filled."
//
// THE GAP, measured: only 6,768 of 58,124 farmed notes carry a position, and a
// note without one is unreachable by design — selection requires that the
// note's own taught line PRODUCE the ply's position, and nothing else selects
// (CLAUDE.md, locked). So 88% of the teaching we farmed cannot be spoken. The
// locked rule is that coverage grows by farming and BAKING, never by loosening
// selection, and this script is the baking half.
//
// ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
// It is NOT anchoring by the note's `opening` TAG. That was measured first and
// rejected: 23,088 unanchored notes carry a tag whose canonical line is a real
// position, and 8,423 of them survive every runtime filter — but reading the
// output shows why the number is a trap. Six notes tagged "French Defense" all
// resolve to `e4 e6 d4 d5`, and their prose is about entirely different boards
// ("Black chose the King's Indian setup with Nf6 and g6"; "f3 creates a mate
// threat on a1"). The tag is a VIDEO-level label, not a position. Deriving from
// it is the banned fuzzy name-tier wearing a bake-time disguise — and worse
// than the runtime version, because once written to a data file the guess is
// invisible. `noteDescribesPosition` caught 283 of 8,423; it was built for a
// 3.8% mis-anchor rate among genuinely position-distilled notes, not to
// validate 23,088 speculative anchors.
//
// ── WHAT THIS IS ─────────────────────────────────────────────────────────────
// The note's OWN PROSE names the line it teaches. The distiller recorded a
// truncation (or nothing) while the sentence carried the whole thing:
//
//   dt-5ql  anchor: e4 e5 Nf3 Nc6
//           prose:  "In the Traxler Counterattack, after e4 e5 Nf3 Nc6 Bc4 Nf6
//                    Ng5 Bc5, the natural Nxf7? leads to wild complications…"
//
// The correct anchor is in the text. `MIN_TEACHING_ANCHOR_PLIES` in
// danyaTeachingService already reached this conclusion for the ≤2-ply notes —
// "proof that the anchor is a truncation, not the position being taught."
//
// So: extract the move run, and accept it only under rules that make the anchor
// as trustworthy as an authored one.
//
// ── THE RULES, and the failure each one closes ───────────────────────────────
//  1. LEGAL FROM MOVE ONE. chess.js replays it or it is not a line (G3).
//  2. DB-REAL. Its first 4 plies must exist in openings-lichess.json — the DB
//     is the canon (locked: "the DB owns the MOVES"). This is what refuses a
//     mid-game FRAGMENT that merely happens to replay: `dt-bl` yielded
//     "c4 a5 b4" from a sentence about a position where "Black has castled
//     queenside", which is nonsense three plies in. 873 such fragments refused.
//  3. NO SPLICING onto the recorded anchor. An earlier cut also tried
//     anchor+run, which manufactured hybrids: `dt-2d` grafted an English line
//     onto a French anchor and replayed legally while meaning nothing. A run is
//     either a complete line or a hypothetical continuation ("playing a4 first
//     would have been better… after a5"), and those two cannot be told apart —
//     so only the complete line is used.
//  4. UNAMBIGUOUS. Prose naming two different complete lines is skipped.
//  5. SELF-DESCRIBING. `noteDescribesPosition` must accept the note at the
//     derived board, the same gate an authored anchor faces. That predicate is
//     TypeScript, so it is enforced by `noteAnchorDerivation.test.ts` rather
//     than reimplemented here — a second copy of an integrity rule is a second
//     rule, and it would drift. The gate also RE-DERIVES every entry instead of
//     trusting the file, so a hand-edited sidecar fails the build.
//
// A derived anchor then goes through the SAME unchanged selection as any other
// note — ≥3 plies, phase match, opening-conflict, scope, board grading. Nothing
// downstream knows the difference, which is the point: this adds notes to the
// position-keyed pool, it does not add a way to reach them.
//
// Output is a SIDECAR (`src/data/note-anchors.json`), not a rewrite of the
// 37 MB corpus files: the derivation stays reviewable in a diff and revertible
// in one commit — which matters, given the first approach looked good in
// aggregate and was wrong.
//
// Usage:  node scripts/derive-note-anchors.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const CORPORA = [
  'src/data/danya-teachings.json',
  'src/data/chessbrah-teachings.json',
  'public/data/hangingpawns-teachings.json',
  'public/data/saintlouis-teachings.json',
];
const OUT = 'src/data/note-anchors.json';

/** How many opening plies must match the DB before a run counts as a real
 *  line. Four is one full move each — enough to name an opening, and the
 *  measured knee: at 2 the mid-game fragments come back. */
const DB_PREFIX_PLIES = 4;

const SAN =
  /(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|[a-h]x[a-h][1-8](?:=[QRBN])?|[a-h][1-8](?:=[QRBN])?)[+#]?/;
const TOKEN = new RegExp(`^(?:\\d+\\.(?:\\.\\.)?|\\.{3}|…)?(${SAN.source})[!?]*$`);

/** Maximal runs of consecutive SAN-shaped tokens. Prose separates a line from
 *  the teaching around it with ordinary punctuation, so a run breaks exactly
 *  where the sentence stops reciting moves. */
export function sanRuns(text, min = 2) {
  const runs = [];
  let cur = [];
  for (const raw of String(text ?? '').split(/[\s,;()]+/)) {
    const m = raw.replace(/[.,;:]+$/, '').match(TOKEN);
    if (m) cur.push(m[1].replace(/[!?]+$/, ''));
    else {
      if (cur.length >= min) runs.push(cur);
      cur = [];
    }
  }
  if (cur.length >= min) runs.push(cur);
  return runs;
}

const sansOfPgn = (pgn) =>
  String(pgn).replace(/\d+\.(\.\.)?/g, ' ').trim().split(/\s+/).filter(Boolean);

function buildDbPrefixes() {
  const db = JSON.parse(readFileSync('src/data/openings-lichess.json', 'utf8'));
  const set = new Set();
  for (const e of db) {
    const s = sansOfPgn(e.pgn);
    if (s.length >= DB_PREFIX_PLIES) set.add(s.slice(0, DB_PREFIX_PLIES).join(' '));
  }
  return set;
}

function replay(line) {
  const c = new Chess();
  for (const san of line) {
    try {
      c.move(san);
    } catch {
      return null;
    }
  }
  return c.fen();
}

/** The one derivation. Exported so the gate re-derives instead of trusting the
 *  file it is supposed to be checking. */
export function deriveAnchor(note, dbPrefixes) {
  const anchor = note.lineSan ?? [];
  const runs = sanRuns(`${note.explains ?? ''} ${note.teaches ?? ''} ${note.plans ?? ''}`);
  const lines = [];
  for (const run of runs) {
    if (run.length < DB_PREFIX_PLIES) continue;
    if (!dbPrefixes.has(run.slice(0, DB_PREFIX_PLIES).join(' '))) continue; // rule 2
    if (!replay(run)) continue; // rule 1
    lines.push(run);
  }
  const deeper = lines.filter((l) => l.length > anchor.length);
  const uniq = [...new Set(deeper.map((l) => l.join(' ')))];
  if (uniq.length !== 1) return null; // rule 4 (and "nothing found")
  return uniq[0].split(' ');
}

function main() {
  const dry = process.argv.includes('--dry');
  const dbPrefixes = buildDbPrefixes();
  const anchors = {};
  const stats = { scanned: 0, derived: 0, deepened: 0, newlyAnchored: 0 };

  for (const file of CORPORA) {
    let bundle;
    try {
      bundle = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      // A missing corpus is a real signal — the two big ones live in public/
      // and are fetched at runtime. Fail loudly rather than bake a partial set.
      console.error(`FATAL: cannot read ${file}: ${err.message}`);
      process.exit(1);
    }
    for (const note of bundle.notes ?? []) {
      stats.scanned += 1;
      const line = deriveAnchor(note, dbPrefixes);
      if (!line) continue;
      anchors[note.id] = line;
      stats.derived += 1;
      if ((note.lineSan ?? []).length) stats.deepened += 1;
      else stats.newlyAnchored += 1;
    }
  }

  // Sorted, so a re-bake produces a diff of what CHANGED rather than a
  // reshuffle. The derivation is deterministic; the file should be too.
  const sorted = Object.fromEntries(Object.keys(anchors).sort().map((k) => [k, anchors[k]]));
  const out = {
    note:
      'DERIVED anchors — each is the line the note\'s OWN PROSE names, verified '
      + 'legal and DB-real. Regenerate with: node scripts/derive-note-anchors.mjs. '
      + 'Never hand-edit; see the script header for why the opening TAG is not usable.',
    derivedFrom: CORPORA,
    count: stats.derived,
    anchors: sorted,
  };
  if (!dry) writeFileSync(OUT, `${JSON.stringify(out, null, 1)}\n`);
  console.log(
    `scanned ${stats.scanned} | derived ${stats.derived} `
    + `(deepened ${stats.deepened}, newly anchored ${stats.newlyAnchored})`
    + `${dry ? ' [dry run, nothing written]' : ` → ${OUT}`}`,
  );
}

if (process.argv[1] && process.argv[1].endsWith('derive-note-anchors.mjs')) main();
