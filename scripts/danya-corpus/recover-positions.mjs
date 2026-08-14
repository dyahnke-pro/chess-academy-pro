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

/**
 * 🚨 TEACHING TALKS ABOUT MOVES THAT HAVE NOT HAPPENED YET, AND THAT IS THE
 * POINT (David 2026-08-14: "i want to hear future moves and ideas. that's a
 * large part of teaching chess" — and, on this very sweep, "double check they
 * are truly false, and you're not just viewing something incorrectly").
 *
 * The first cut of this function read the whole note as present-tense
 * assertions about the board. It is not. "After White plays f3 and g4, Black's
 * bishop on e4 seems trapped" says nothing about where the bishop is NOW — it
 * describes a position several plies away. Read literally, 323 of the 1,079
 * notes this sweep condemned were not false at all: 287 make no present-tense
 * claim whatsoever and 36 were simply true. It also MOVED 44 notes off the
 * moment they teach, because walking forward until the hypothetical came true
 * lands the anchor AFTER the move the note is telling the student to play.
 *
 * So this mirrors `boardClaimValidator.stripDisprovenSentences` exactly:
 * sentence by sentence, truncate at the FIRST future marker, and extract only
 * from what remains. Truncating rather than skipping the whole sentence is
 * deliberate and load-bearing — "the knight on f6 threatens your queen" must
 * still be checked on an empty f6 (David 2026-06-05: "the gate must FULLY
 * close every time there is a contradiction"), so the marker ends the checked
 * region instead of exempting the sentence.
 *
 * Keeping the two extractors identical is the actual contract: this decides
 * where a note is FILED, that one decides what survives being SPOKEN. If this
 * one is stricter, notes get relocated away from positions the app was
 * perfectly happy with.
 */
const FUTURE_MARKER_RE =
  /\b(after|if|once|then|would|will|could|should|when|next|prepares?|preparing|plan(?:s|ning)?|threatens?|going to|about to)\b/i;

function extractClaims(text) {
  const out = [];
  const push = (sq, word) => {
    const code = PIECE_CODE[word.toLowerCase()];
    if (code) out.push({ square: sq.toLowerCase(), code });
  };
  for (const full of text.split(/(?<=[.!?])\s+/)) {
    const fm = FUTURE_MARKER_RE.exec(full);
    const s = fm ? full.slice(0, fm.index) : full;
    if (!s.trim()) continue;
    for (const m of s.matchAll(/\b(knight|bishop|rook|queen|king|pawn)\s+on\s+([a-h][1-8])\b/gi)) push(m[2], m[1]);
    for (const m of s.matchAll(/\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi)) push(m[1], m[2]);
  }
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

/**
 * Which notes to judge. The anchor report narrows the sweep to the notes
 * anchor-notes flagged, but it is FARM-TIME state living in a gitignored
 * directory — on a fresh clone it is simply absent, and a sweep of an
 * already-shipped corpus is exactly when it is needed most.
 *
 * Absent, judge EVERY positioned note. That is safe rather than merely
 * convenient: `recoverPosition` verifies claims against the board, and a note
 * anchor-notes VERIFIED satisfies those same claims by construction — it comes
 * back `already-true` and is left untouched. The wider sweep can therefore only
 * ever find notes the narrow one would have found too.
 */
async function flaggedIds() {
  try {
    const report = JSON.parse(await readFile(`${CREATOR.anchorDir}/report.json`, 'utf8'));
    return new Set(report.results.filter((r) => r.was > 0 && r.outcome !== 'anchored').map((r) => r.id));
  } catch {
    return null; // no report — judge everything positioned
  }
}

async function main() {
  const corpus = JSON.parse(await readFile(CREATOR.corpus, 'utf8'));
  const flagged = await flaggedIds();

  const tally = {};
  const recovered = [];
  for (const n of corpus.notes) {
    if (!n.lineSan?.length) continue;
    if (flagged && !flagged.has(n.id)) continue;
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
    JSON.stringify({ creator: CREATOR.key, scope: flagged ? 'anchor-flagged' : 'all-positioned', judged: flagged?.size ?? null, tally, recovered }, null, 2),
  );

  if (APPLY && recovered.length > 0) {
    corpus.generatedAt = new Date().toISOString();
    await writeFile(CREATOR.corpus, JSON.stringify(corpus, null, 1));
  }

  console.log(`\n──── RECOVERY (${CREATOR.key}) ────`);
  console.log(`scope: ${flagged ? `${flagged.size} anchor-flagged notes` : 'every positioned note (no anchor report on disk)'}`);
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }
  console.log(APPLY ? '\nAPPLIED to the corpus.' : '\nDRY RUN — nothing written to the corpus.');
}

const isMain = process.argv[1]?.endsWith('recover-positions.mjs');
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });
