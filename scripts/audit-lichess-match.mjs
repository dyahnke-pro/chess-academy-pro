#!/usr/bin/env node
/**
 * audit-lichess-match.mjs
 * -----------------------
 * For every opening annotation file, verify that its main-line SAN
 * sequence matches a prefix of a Lichess ECO opening's PGN. Catches:
 *
 *   1. Annotation files whose moves don't correspond to any known
 *      Lichess opening (totally off-book from the start).
 *   2. Annotation files where a move diverges from the Lichess name's
 *      canonical line mid-sequence (e.g. "Sicilian Najdorf" file has
 *      the wrong 6th move).
 *
 * Runs purely locally off `src/data/openings-lichess.json` — no network.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Chess } from 'chess.js';

const repoRoot = new URL('..', import.meta.url).pathname;
const annotDir = join(repoRoot, 'src/data/annotations');
const outDir = join(repoRoot, 'audit-reports');
mkdirSync(outDir, { recursive: true });

// Build a lookup: every opening PGN's SAN sequence.
const lichess = JSON.parse(readFileSync(join(repoRoot, 'src/data/openings-lichess.json'), 'utf8'));

function parsePgnToSans(pgn) {
  const chess = new Chess();
  const sans = [];
  for (const token of pgn.split(/\s+/).filter(Boolean)) {
    try {
      const m = chess.move(token);
      if (m) sans.push(m.san);
    } catch {
      return sans; // stop at first bad token
    }
  }
  return sans;
}

// Every lichess entry → its full SAN sequence (so we can check if
// an annotation file's moves match the prefix of any lichess line).
const lichessSequences = lichess.map((o) => ({
  eco: o.eco,
  name: o.name,
  sans: parsePgnToSans(o.pgn),
}));

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Build a name → sequence map for direct lookup too
const byNameSlug = new Map();
for (const entry of lichessSequences) {
  byNameSlug.set(slugify(entry.name), entry);
}

// Given an annotation file's opening id, try to find the best-matching
// lichess entry (by id slug or name-contains).
function findLichessForOpeningId(openingId) {
  // Direct name-slug match
  const direct = byNameSlug.get(openingId);
  if (direct) return direct;
  // American → British spelling swap (file uses "-defence", lichess "-defense")
  const swapped = openingId.replace(/-defence(-|$)/g, '-defense$1');
  const swappedHit = byNameSlug.get(swapped);
  if (swappedHit) return swappedHit;
  // Try partial-match on slug — find an entry whose slug STARTS WITH
  // or CONTAINS the openingId (openingId is usually shorter)
  const candidates = lichessSequences.filter((l) => {
    const slug = slugify(l.name);
    return slug === openingId || slug.startsWith(openingId + '-') || openingId.startsWith(slug + '-');
  });
  if (candidates.length > 0) {
    // Prefer the shortest match (most specific)
    candidates.sort((a, b) => a.sans.length - b.sans.length);
    return candidates[0];
  }
  return null;
}

// For each annotation file, check whether its main-line SANs are a
// prefix of any lichess line's SANs. A more permissive check: the
// file's first N moves MATCH the first N of SOME lichess line whose
// name closely matches the file name.
const files = readdirSync(annotDir).filter((f) => f.endsWith('.json'));

const findings = {
  noLichessMatch: [], // annotation file has NO plausible Lichess parent
  diverges: [], // annotation file diverges from its Lichess parent mid-sequence
  shortLichess: [], // Lichess parent is shorter than annotation file — likely fine, just noted
};

// Build the ON-BOOK position set: every FEN reachable within the
// first 20 plies of ANY Lichess opening line. A file is "on book"
// at ply N if its FEN-after-ply-N is in this set. Handles transpositions
// automatically — different move orders reaching the same position
// are recognized as equivalent.
const onBookFens = new Set();
for (const entry of lichessSequences) {
  const chess = new Chess();
  for (let i = 0; i < Math.min(entry.sans.length, 20); i++) {
    try {
      const m = chess.move(entry.sans[i]);
      if (!m) break;
      // FEN-piece-only (strip move counters + castling + en-passant
      // for tighter equivalence — we care about piece placement, not
      // half-move clock).
      onBookFens.add(chess.fen().split(' ').slice(0, 4).join(' '));
    } catch {
      break;
    }
  }
}

function fenOnBook(fen) {
  return onBookFens.has(fen.split(' ').slice(0, 4).join(' '));
}

// For a given pre-move FEN, is there ANY Lichess line that plays
// a DIFFERENT response from here and stays on book? Used to
// distinguish "file chose an off-book response to a known position"
// (real bug) from "file extended past all Lichess lines" (fine).
function hasBookContinuation(fen) {
  const key = fen.split(' ').slice(0, 4).join(' ');
  // Try every legal response from this FEN; if ANY resolves to an
  // on-book position, the position has book continuations.
  try {
    const chess = new Chess(fen);
    for (const mv of chess.moves({ verbose: true })) {
      chess.move(mv.san);
      const nextKey = chess.fen().split(' ').slice(0, 4).join(' ');
      chess.undo();
      if (onBookFens.has(nextKey)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

for (const file of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(join(annotDir, file), 'utf8'));
  } catch {
    continue;
  }
  const openingId = data.openingId ?? file.replace(/\.json$/, '');
  const moveAnns = Array.isArray(data.moveAnnotations) ? data.moveAnnotations : [];
  const fileSans = moveAnns.map((m) => m?.san).filter(Boolean);
  if (fileSans.length === 0) continue;

  // Walk the file's move sequence ply-by-ply. Only flag divergences
  // when we land off-book AT a position whose pre-move state IS on
  // book AND has book continuations — meaning the file made an
  // off-book choice in known theory territory. If the pre-move
  // position has no book responses, the file has legitimately
  // extended past Lichess's named lines — that's not a bug.
  const chess = new Chess();
  let plyReached = 0;
  let divergeAt = -1;
  let divergeSan = null;
  for (let i = 0; i < Math.min(fileSans.length, 20); i++) {
    const preFen = chess.fen();
    let move;
    try {
      move = chess.move(fileSans[i]);
    } catch {
      // Illegal move — already caught by structural audit. Skip.
      break;
    }
    if (!move) break;
    if (fenOnBook(chess.fen())) {
      plyReached = i + 1;
      continue;
    }
    // Off-book. Is the pre-move position a known theory position
    // with alternative book continuations? If yes, the file made an
    // off-book choice — flag it.
    if (fenOnBook(preFen) && hasBookContinuation(preFen)) {
      divergeAt = i;
      divergeSan = fileSans[i];
    }
    // Either way, stop walking — downstream plies can't be on-book.
    break;
  }

  // If file never reached even ply 2 on book, it's a totally off-book
  // file — flag it.
  if (plyReached < 2 && fileSans.length >= 2) {
    findings.noLichessMatch.push({ file, openingId, firstMoves: fileSans.slice(0, 6) });
    continue;
  }

  if (divergeAt < 0) continue; // on book or extended past theory — OK

  const parent = findLichessForOpeningId(openingId);
  findings.diverges.push({
    file,
    openingId,
    parentName: parent?.name ?? '(no mapped parent)',
    parentEco: parent?.eco ?? '',
    moveIndex: divergeAt,
    fileSan: divergeSan,
    lichessSan: parent?.sans[divergeAt] ?? '(unknown)',
    lichessLine: parent ? parent.sans.slice(0, 10).join(' ') : '',
    fileLine: fileSans.slice(0, 10).join(' '),
  });
}

const summary = {
  filesScanned: files.length,
  noLichessMatch: findings.noLichessMatch.length,
  diverges: findings.diverges.length,
  shortLichess: findings.shortLichess.length,
};

console.log('[audit-lichess-match] summary:');
console.log(JSON.stringify(summary, null, 2));

writeFileSync(
  join(outDir, 'lichess-match.json'),
  JSON.stringify({ summary, findings }, null, 2),
);

const md = ['# Lichess-Match Audit', ''];
md.push('For every opening annotation file, verifies that its main-line SAN sequence matches a prefix of a Lichess ECO opening PGN.');
md.push('');
md.push(`Files scanned: **${summary.filesScanned}**`);
md.push('');
md.push('| Finding | Count |');
md.push('|---|---:|');
md.push(`| No plausible Lichess parent | ${summary.noLichessMatch} |`);
md.push(`| Diverges from parent mid-sequence | ${summary.diverges} |`);
md.push(`| Annotation shorter than Lichess parent (OK) | ${summary.shortLichess} |`);
md.push('');

if (findings.diverges.length > 0) {
  md.push('## Divergences (sorted by move# — earlier = more suspicious)');
  md.push('');
  md.push('| File | Lichess parent (ECO) | Move# | File SAN | Lichess SAN | Lichess line (first 10) |');
  md.push('|---|---|---:|---|---|---|');
  findings.diverges
    .sort((a, b) => a.moveIndex - b.moveIndex)
    .slice(0, 80)
    .forEach((f) => {
      md.push(
        `| ${f.file} | ${f.parentName} (${f.parentEco}) | ${f.moveIndex + 1} | \`${f.fileSan}\` | \`${f.lichessSan}\` | \`${f.lichessLine}\` |`,
      );
    });
  if (findings.diverges.length > 80) md.push(`\n_Showing first 80 of ${findings.diverges.length}_`);
  md.push('');
}

if (findings.noLichessMatch.length > 0) {
  md.push('## Files with no Lichess parent');
  md.push('');
  md.push('| File | Opening ID | First 6 moves |');
  md.push('|---|---|---|');
  findings.noLichessMatch.slice(0, 50).forEach((f) => {
    md.push(`| ${f.file} | ${f.openingId} | \`${f.firstMoves.join(' ')}\` |`);
  });
  if (findings.noLichessMatch.length > 50) md.push(`\n_Showing first 50 of ${findings.noLichessMatch.length}_`);
  md.push('');
}

writeFileSync(join(outDir, 'lichess-match.md'), md.join('\n') + '\n');
console.log('[audit-lichess-match] wrote audit-reports/lichess-match.{json,md}');
