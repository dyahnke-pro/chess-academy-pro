#!/usr/bin/env node
/**
 * recover-positions — find the TRUE position of a note whose filed position was
 * disproven, instead of condemning the note.
 *
 * WHY THIS EXISTS. The first sweep called 2,164 notes "wrong". That reading was
 * wrong (David: "most of them were wrong because you were looking at them
 * wrong"). The corrected picture, measured on the pre-strip Hikaru corpus:
 *
 *     23 rejected :: d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 Bd3
 *     15 anchored :: d4 Nf6 Nf3 g6 Bf4 Bg7 e3 d6 Bd3     <-- SAME position
 *
 * 15 notes verify TRUE at the exact line the other 23 fail at. The position is
 * real and the prose is real; they are simply not about the same MOMENT. A
 * chunk spans ~5,000 characters of speech and the model writes ~5 notes from
 * it, all inheriting the chunk's single position — but the game moved on during
 * those minutes. Notes about the chunk's opening moment verify; notes about
 * later moments do not.
 *
 * So the note is not wrong, it is mis-filed by a few plies. `anchor-notes`
 * cannot recover it because it only ever searches DB SPINE positions, and a
 * middlegame twenty moves deep is in no spine. But we already know a real
 * position — the chunk's — and the note usually names its own moves. Replaying
 * those FORWARD from the chunk position walks to the moment the note describes.
 *
 * The bar is the same one anchor-notes uses, and it is a GATE not a tiebreak:
 * every piece-on-square claim the note makes must be TRUE at the recovered
 * position, and there must be at least one such claim, because a position with
 * no verifiable claim is a guess. Pure chess.js — no model, no heuristics about
 * prose (G0/G3).
 *
 * Usage:
 *   node scripts/danya-corpus/recover-positions.mjs --creator naroditsky [--apply]
 *
 * Without --apply it only measures and writes the report. THAT IS THE DEFAULT:
 * this touches the primary narration corpus, so seeing the numbers comes first.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveCreator } from './creator.mjs';

const CREATOR = resolveCreator();
const APPLY = process.argv.includes('--apply');
/** How far past the filed position the note's own moves may walk. A note talks
 *  about the next few moves, not the next twenty; a long walk is drift, not
 *  recovery. */
const MAX_WALK = 12;
/** Speech is noisy — a stray unresolvable token between two real moves is
 *  normal. More than this in a row means the thread is lost. */
const MAX_SKIPS = 3;

const PIECE_CODE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p' };
const SAN_RE =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

/** Piece-on-square assertions the prose makes — the same extraction
 *  anchor-notes uses, so the two agree about what a claim is. */
function extractClaims(text) {
  const out = [];
  const push = (sq, word) => {
    const code = PIECE_CODE[word.toLowerCase()];
    if (code) out.push({ square: sq.toLowerCase(), code });
  };
  for (const m of text.matchAll(/\b(knight|bishop|rook|queen|king|pawn)\s+on\s+([a-h][1-8])\b/gi)) push(m[2], m[1]);
  for (const m of text.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi)) push(m[1], m[2]);
  return out;
}

const extractSans = (text) => (text.match(SAN_RE) || []).slice(0, 24);

/** Board map at the current position: square -> piece code. */
function boardMap(chess) {
  const map = {};
  for (const row of chess.board()) {
    for (const cell of row) if (cell) map[cell.square] = cell.type;
  }
  return map;
}

const allTrue = (claims, map) => claims.every((c) => map[c.square] === c.code);

/**
 * Walk forward from `lineSan` along the note's own named moves, testing its
 * claims at every ply. Returns the recovered line, or null when no position on
 * the walk satisfies every claim.
 */
export function recoverPosition(lineSan, prose) {
  const claims = extractClaims(prose);
  // No claim means nothing to verify — a recovered position would be a guess
  // dressed as a fact. Those notes stay unpositioned.
  if (claims.length === 0) return { outcome: 'no-claims', lineSan: null };

  const chess = new Chess();
  for (const san of lineSan) {
    try { chess.move(san); } catch { return { outcome: 'unreplayable-anchor', lineSan: null }; }
  }
  // Already true where it sits? Then it was never mis-filed (anchor-notes
  // rejected it for another reason) and there is nothing to recover.
  if (allTrue(claims, boardMap(chess))) return { outcome: 'already-true', lineSan: [...lineSan] };

  const sans = extractSans(prose);
  if (sans.length === 0) return { outcome: 'no-moves-named', lineSan: null };

  const walked = [...lineSan];
  let skips = 0;
  for (const san of sans) {
    if (walked.length - lineSan.length >= MAX_WALK) break;
    let ok = false;
    try { ok = !!chess.move(san); } catch { ok = false; }
    if (!ok) {
      if (++skips > MAX_SKIPS) break;
      continue;
    }
    skips = 0;
    walked.push(chess.history().slice(-1)[0]);
    if (allTrue(claims, boardMap(chess))) {
      return { outcome: 'recovered', lineSan: [...walked], plies: walked.length - lineSan.length };
    }
  }
  return { outcome: 'unrecoverable', lineSan: null };
}

async function main() {
  const corpus = JSON.parse(await readFile(CREATOR.corpus, 'utf8'));
  const report = JSON.parse(await readFile(`${CREATOR.anchorDir}/report.json`, 'utf8'));
  const flagged = new Set(
    report.results.filter((r) => r.was > 0 && r.outcome !== 'anchored').map((r) => r.id),
  );

  const tally = {};
  const recovered = [];
  for (const n of corpus.notes) {
    if (!flagged.has(n.id) || !n.lineSan?.length) continue;
    const prose = [n.explains, n.teaches, n.plans].filter(Boolean).join(' ');
    const res = recoverPosition(n.lineSan, prose);
    tally[res.outcome] = (tally[res.outcome] ?? 0) + 1;
    if (res.outcome === 'recovered') {
      recovered.push({ id: n.id, from: n.lineSan.join(' '), to: res.lineSan.join(' '), plies: res.plies });
      if (APPLY) n.lineSan = res.lineSan;
    }
  }

  await mkdir(CREATOR.anchorDir, { recursive: true });
  await writeFile(
    `${CREATOR.anchorDir}/recovery.json`,
    JSON.stringify({ creator: CREATOR.key, flagged: flagged.size, tally, recovered }, null, 2),
  );

  if (APPLY && recovered.length > 0) {
    corpus.generatedAt = new Date().toISOString();
    await writeFile(CREATOR.corpus, JSON.stringify(corpus, null, 1));
  }

  console.log(`\n──── RECOVERY (${CREATOR.key}) ────`);
  console.log(`flagged notes with a position: ${flagged.size}`);
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }
  console.log(APPLY ? '\nAPPLIED to the corpus.' : '\nDRY RUN — nothing written to the corpus.');
}

const isMain = process.argv[1]?.endsWith('recover-positions.mjs');
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
