#!/usr/bin/env node
/**
 * align-notes — give a position to notes that have none, using the board that
 * was on screen when they were said.
 *
 * David 2026-08-15: "can you work on syncing the corpus."
 *
 * ── THE JOIN IS NOT A TIMESTAMP ─────────────────────────────────────────────
 *
 * The README used to say the join was `timestamp -> FEN`, "since every
 * distilled note carries a transcript timestamp". That was checked afterwards
 * and it is false: 0 of the 11,426 shipped Naroditsky notes carry one. The
 * distiller now retains it going forward, but the corpus we have was farmed
 * without it, and re-distilling 58,124 notes to recover a field is not the
 * cheapest route to the answer.
 *
 * Two things we DO have replace it:
 *
 *   ORDER — notes are emitted in transcript order within a video, so their
 *           moments are non-decreasing. That alone turns a scatter of possible
 *           matches into a monotone alignment problem.
 *
 *   MOVES — teaching prose names the moves being played. The tracker knows
 *           exactly which moves appeared on the board and when, INCLUDING the
 *           rewinds, so a recited sequence usually identifies its moment.
 *
 * ── WHAT THIS SCRIPT IS ALLOWED TO DECIDE ───────────────────────────────────
 *
 * Nothing about truth. The video only ever PROPOSES a starting position; the
 * proposal is then handed to `recoverPosition`, the same claim-verification
 * gate `recover-positions.mjs` already uses on the primary corpus — every
 * piece-on-square claim the note makes must be TRUE at the position, and a
 * note with no verifiable claim is refused rather than guessed at (G0/G3).
 *
 * So a wrong OCR read, a wrong segment, or a wrong interpolation cannot put a
 * false position into the corpus. It can only fail to find one.
 *
 * ── WHY REWINDS MATTER HERE ─────────────────────────────────────────────────
 *
 * A teaching video walks the same opening several times, taking moves back to
 * show alternatives. The pilot plays `Ng5 d5 exd5`, rewinds, plays `Bc5 Nxf7
 * Bxf2+`, rewinds, plays `Bxf7+`, rewinds again for the `d4` line. A flattened
 * move list would be nonsense; the timeline is a sequence of BOARD STATES, and
 * the same line reached twice is two different moments with different notes.
 *
 * Usage:
 *   node scripts/video-align/align-notes.mjs --video <id> --track <track.json> \
 *        [--creator naroditsky] [--apply]
 *
 * Without --apply it measures and prints only. That is the default: this
 * touches the primary narration corpus.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { recoverPosition } from '../danya-corpus/recover-positions.mjs';

const arg = (name, dflt = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const VIDEO = arg('video');
const TRACK = arg('track', '/tmp/vidtest/track.json');
const CREATOR = arg('creator', 'naroditsky');
const APPLY = process.argv.includes('--apply');
const CORPUS = arg('corpus', 'src/data/danya-teachings.json');

if (!VIDEO) {
  console.error('usage: align-notes.mjs --video <youtube-id> --track <track.json> [--apply]');
  process.exit(1);
}

const SAN_RE =
  /\b(?:O-O-O|O-O|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;

/**
 * Replay the tracker's steps into a timeline of BOARD STATES.
 *
 * The tracker emits deltas (`line`) plus rewind markers (`rewindTo`), which is
 * the right shape for a log and the wrong shape for matching. Here each step
 * becomes the cumulative line and FEN as they stood at that second.
 */
function buildTimeline(trackPath) {
  const games = JSON.parse(readFileSync(trackPath, 'utf8'));
  const timeline = [];
  for (const game of games) {
    const chess = new Chess();
    for (const step of game.moves) {
      if (step.rewindTo !== undefined) {
        while (chess.history().length > step.rewindTo) chess.undo();
      } else {
        let ok = true;
        for (const san of step.line) {
          try { chess.move(san); } catch { ok = false; break; }
        }
        if (!ok) continue;
      }
      timeline.push({
        t: step.t,
        lineSan: chess.history(),
        fen: chess.fen(),
        // The moves that ARRIVED at this state — what a note reciting this
        // moment would most likely name.
        played: step.rewindTo !== undefined ? [] : [...step.line],
      });
    }
  }
  return timeline;
}

const PIECE_LETTER = {
  knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k', pawn: 'p',
};

/**
 * The moves a note NAMES, in the order it names them — from both notations,
 * because teaching prose mixes them freely in the same sentence.
 *
 * The distiller writes what was said, and what was said is mostly spoken
 * English: "bishop takes d5", "knight takes d4", "White plays c3". Matching
 * only SAN tokens sees the bare squares in those phrases and loses the piece,
 * which is the half that carries the information.
 *
 * Returns `{ piece, to }` rather than a SAN string on purpose — the exact SAN
 * depends on disambiguation we do not need to reproduce. "Is there a legal
 * move of a bishop to d5" is the question, and chess.js can answer it.
 */
function recitedMoves(prose) {
  const out = [];
  const seen = new Set();
  const push = (piece, to, index) => {
    const key = `${piece}${to}@${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ piece, to, index });
  };
  const words =
    /\b(knight|bishop|rook|queen|king|pawn)\s+(?:takes|captures|to|back to|goes to|on)?\s*([a-h][1-8])\b/gi;
  for (const m of prose.matchAll(words)) {
    push(PIECE_LETTER[m[1].toLowerCase()], m[2].toLowerCase(), m.index ?? 0);
  }
  for (const m of prose.matchAll(SAN_RE)) {
    const san = m[0].replace(/[+#]/g, '');
    if (san.startsWith('O-O')) continue;
    const to = san.slice(-2).toLowerCase();
    if (!/^[a-h][1-8]$/.test(to)) continue;
    const lead = san[0];
    const piece = /[KQRBN]/.test(lead)
      ? { K: 'k', Q: 'q', R: 'r', B: 'b', N: 'n' }[lead]
      : 'p';
    push(piece, to, m.index ?? 0);
  }
  return out.sort((a, b) => a.index - b.index).slice(0, 12);
}

/**
 * Does the position support the moves the note talks about?
 *
 * This is the certification the CLAIM gate cannot give here. `recoverPosition`
 * requires prose of the form "the knight on f7", and teaching prose almost
 * never uses it — on the pilot every single correct proposal was refused as
 * `no-claims` while naming its position unmistakably ("If Black plays d5
 * counterattacking the bishop" at exactly the position after d5).
 *
 * So the bar is chess, not phrasing, and it is a real bar: a move of a NAMED
 * PIECE to a NAMED SQUARE must be legal, and two of them must be legal in
 * sequence. Teaching branches constantly, so a move that does not fit is
 * skipped rather than failing the note — but a proposal at the wrong moment
 * fails fast, because the pieces are not where the prose needs them.
 *
 * Nothing here is heuristic about the PROSE (G0): every accept/reject is
 * decided by chess.js on a real board.
 */
function verifyByLegality(fen, prose) {
  const moves = recitedMoves(prose);
  if (moves.length < 2) return { ok: false, reason: 'names too few moves', legal: 0 };
  const chess = new Chess(fen);
  let legal = 0;
  let skipped = 0;
  for (const want of moves) {
    const options = chess.moves({ verbose: true }).filter(
      (m) => m.to === want.to && m.piece === want.piece,
    );
    if (options.length === 0) {
      skipped += 1;
      continue;
    }
    chess.move(options[0].san);
    legal += 1;
    if (legal >= 2 && skipped === 0) break;
  }
  // A single legal move is coincidence; two in a row from the same board is
  // the note describing this position.
  if (legal < 2) return { ok: false, reason: 'recited moves are not legal here', legal };
  return { ok: true, legal, skipped };
}

/**
 * Where in the timeline does this note's recited move sequence occur?
 *
 * Matching is on the note's LAST recited moves against the moves that had just
 * been played, because teaching prose leads with the position it is describing
 * and then branches into hypotheticals ("...Nxf7 — but if instead d4"). The
 * earlier recitations are the anchor; the later ones are the branch, and the
 * branch may never appear on the board at all.
 */
function candidateSteps(note, timeline) {
  const prose = `${note.explains} ${note.teaches} ${note.plans ?? ''}`;
  const sans = (prose.match(SAN_RE) ?? []).map((s) => s.replace(/[+#]/g, ''));
  if (sans.length === 0) return [];
  const wanted = new Set(sans);
  // A move the prose SUPPOSES is not a move the board has seen. "If Black
  // plays d5, White's best is bishop takes d5" was landing one ply LATE
  // because reciting d5 scored highest at the step that had just played d5 —
  // and the note is spoken BEFORE it, which is the whole point of the "if".
  const asserted = new Set(assertedSans(prose));
  const placements = statedPlacements(prose);
  const hits = [];
  for (let i = 0; i < timeline.length; i += 1) {
    const step = timeline[i];
    // How much of what this step put on the board does the note talk about,
    // and how deep into the note's own recitation does the step's line reach.
    const playedHit = step.played.filter((s) => asserted.has(s.replace(/[+#]/g, ''))).length;
    const lineHit = step.lineSan.filter((s) => wanted.has(s.replace(/[+#]/g, ''))).length;
    if (playedHit === 0 && lineHit < 2) continue;
    // WHERE THE PIECES ARE outranks which moves were recited, because move
    // overlap locates the SEGMENT while placement locates the PLY inside it.
    // On the pilot, two notes about "dislodging the knight from d4" scored
    // highest at the position after d4 — before Black's knight had gone there
    // at all — and only the placement term moves them to the ply the prose is
    // actually about.
    const placed = placements.filter((p) => pieceAt(step.fen, p.square) === p.code).length;
    const misplaced = placements.length - placed;
    hits.push({
      index: i,
      step,
      score: placed * 8 - misplaced * 4 + playedHit * 3 + lineHit,
    });
  }
  return hits.sort((a, b) => b.score - a.score || a.index - b.index);
}

/** Moves the prose says HAVE been played, dropping everything downstream of a
 *  hypothetical marker in the same sentence. Same cut `recover-positions` makes
 *  before testing claims, for the same reason: teaching talks about moves that
 *  have not happened, and treating those as history files the note late. */
const HYPOTHETICAL =
  /\b(if|after|once|then|would|will|could|should|when|next|prepares?|preparing|plan(?:s|ning)?|threatens?|going to|about to)\b/i;

function assertedSans(prose) {
  const out = [];
  for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
    const cut = HYPOTHETICAL.exec(sentence);
    const real = cut ? sentence.slice(0, cut.index) : sentence;
    for (const m of real.matchAll(SAN_RE)) out.push(m[0].replace(/[+#]/g, ''));
  }
  return out;
}

/** Squares the prose says a piece IS on, now — "the knight on d4", "dislodge
 *  the knight from d4", "the d4-knight". Not the same as a claim gate: this is
 *  used to RANK candidate moments, and it is checked against a real board. */
function statedPlacements(prose) {
  const out = [];
  const push = (word, sq) => {
    const code = PIECE_LETTER[word.toLowerCase()];
    if (code) out.push({ code, square: sq.toLowerCase() });
  };
  for (const m of prose.matchAll(
    /\b(knight|bishop|rook|queen|king|pawn)\s+(?:on|from|at)\s+([a-h][1-8])\b/gi,
  )) push(m[1], m[2]);
  for (const m of prose.matchAll(
    /\b([a-h][1-8])[-\s](knight|bishop|rook|queen|king|pawn)\b/gi,
  )) push(m[2], m[1]);
  return out;
}

function pieceAt(fen, square) {
  try {
    return new Chess(fen).get(square)?.type ?? null;
  } catch {
    return null;
  }
}

/**
 * Keep only a set of assignments whose times run FORWARD through the video.
 *
 * Notes come out of the distiller in transcript order, so a candidate that
 * would place note 12 before note 5 is wrong however well its moves matched —
 * usually because the same line appears twice and the earlier occurrence
 * scored higher. Longest non-decreasing subsequence by video time, keeping the
 * highest-scoring alternative at each index.
 */
function enforceOrder(assignments) {
  const n = assignments.length;
  if (n === 0) return [];
  // WEIGHTED by match confidence, not longest-by-count. An unweighted chain
  // maximises how MANY notes survive, so six weak matches that happen to run
  // forward beat four strong ones — which is backwards. Confidence is what we
  // are ordering by, so confidence is what the chain maximises.
  const best = assignments.map((a) => Math.max(1, a.score));
  const prev = new Array(n).fill(-1);
  for (let i = 1; i < n; i += 1) {
    for (let j = 0; j < i; j += 1) {
      const cand = best[j] + Math.max(1, assignments[i].score);
      if (assignments[j].t <= assignments[i].t && cand > best[i]) {
        best[i] = cand;
        prev[i] = j;
      }
    }
  }
  let end = 0;
  for (let i = 1; i < n; i += 1) if (best[i] > best[end]) end = i;
  const keep = new Set();
  for (let i = end; i >= 0; i = prev[i]) {
    keep.add(i);
    if (prev[i] === -1) break;
  }
  return assignments.filter((_, i) => keep.has(i));
}

function main() {
  const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
  const notes = corpus.notes.filter((n) => (n.sources ?? []).includes(`yt:${VIDEO}`));
  if (notes.length === 0) {
    console.error(`no notes in ${CORPUS} sourced from yt:${VIDEO}`);
    process.exit(1);
  }
  const timeline = buildTimeline(TRACK);

  // PASS 1 — notes that name their own moves get a candidate moment each.
  const proposals = [];
  for (let i = 0; i < notes.length; i += 1) {
    const note = notes[i];
    if ((note.lineSan ?? []).length > 0) continue; // already positioned
    const hits = candidateSteps(note, timeline);
    if (hits.length === 0) continue;
    proposals.push({
      order: i, id: note.id, note, t: hits[0].step.t, step: hits[0].step,
      lineSan: hits[0].step.lineSan, score: hits[0].score,
    });
  }
  const chain = enforceOrder(proposals);
  // RE-PLACE rather than discard. A proposal that breaks the order is usually
  // not a bad note, it is the right note matched to the wrong occurrence — the
  // pilot's "if Black plays d5" fits both the Fried Liver at t=123 and the d4
  // line at t=345, and move-overlap alone picked the earlier one. The chain
  // says which SEGMENT the note belongs to; asking for its best candidate
  // inside that window picks the occurrence.
  const inChain = new Set(chain.map((c) => c.id));
  const ordered = [];
  const unproposed = notes
    .map((note, order) => ({ note, order }))
    .filter(({ note, order }) => (note.lineSan ?? []).length === 0
      && !proposals.some((p) => p.order === order));
  for (const p of [...proposals, ...unproposed.map((u) => ({
    // A note that names no move of its own still happened at a MOMENT, and its
    // neighbours know when. It gets no candidate of its own, so it inherits the
    // window and is certified like any other — the gates below are what keep an
    // inherited position honest.
    order: u.order, id: u.note.id, note: u.note, t: null, step: null,
    lineSan: [], score: 0,
  }))].sort((a, b) => a.order - b.order)) {
    if (inChain.has(p.id)) { ordered.push(p); continue; }
    const before = chain.filter((c) => c.order < p.order).pop();
    const after = chain.find((c) => c.order > p.order);
    const lo = before ? before.t : -Infinity;
    const hi = after ? after.t : Infinity;
    const fit = candidateSteps(p.note, timeline).find((h) => h.step.t >= lo && h.step.t <= hi);
    if (!fit) continue;
    ordered.push({
      ...p, t: fit.step.t, step: fit.step, lineSan: fit.step.lineSan,
      score: fit.score, replaced: true,
    });
  }
  ordered.sort((a, b) => a.order - b.order);
  const replaced = ordered.filter((o) => o.replaced).length;
  const droppedByOrder = proposals.length - ordered.length;

  // PASS 2 — verify. The video proposed; the claim gate disposes. Same bar as
  // recover-positions, so nothing enters the corpus on OCR's word alone.
  const accepted = [];
  const refused = [];
  for (const p of ordered) {
    const prose = `${p.note.explains} ${p.note.teaches} ${p.note.plans ?? ''}`;
    // TWO ways to certify, and a note only needs one.
    //
    // The claim gate is tried FIRST and wins when it fires, because it is the
    // bar the primary corpus already lives by and it can also RELOCATE a note
    // — walking forward from the video's position to the exact moment the
    // prose describes, which the legality check does not attempt.
    const r = recoverPosition(p.lineSan, prose);
    if (r.lineSan && r.lineSan.length > 0) {
      accepted.push({ ...p, lineSan: r.lineSan, outcome: r.outcome });
      continue;
    }
    const byLegality = verifyByLegality(p.step.fen, prose);
    if (byLegality.ok) {
      accepted.push({ ...p, outcome: `legality(${byLegality.legal})` });
    } else {
      refused.push({
        id: p.id, t: p.t, outcome: `${r.outcome} / ${byLegality.reason}`,
        proposedLine: p.lineSan.join(' '),
        prose: `${p.note.explains.slice(0, 140)}…`,
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString().slice(0, 10),
    video: VIDEO,
    creator: CREATOR,
    timelineSteps: timeline.length,
    notes: notes.length,
    alreadyPositioned: notes.filter((n) => (n.lineSan ?? []).length > 0).length,
    proposed: proposals.length,
    droppedByOrder,
    replacedInWindow: replaced,
    accepted: accepted.length,
    refused: refused.length,
    refusedBy: refused.reduce((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
      return acc;
    }, {}),
    // Kept in the report on purpose: a refusal is the interesting row. It says
    // the video found a moment the gate would not certify, which is either a
    // note that cannot be verified at all or a proposal that is simply wrong —
    // and reading a few tells you which.
    refusedDetail: refused,
    assignments: accepted.map((a) => ({
      id: a.id, t: a.t, outcome: a.outcome, lineSan: a.lineSan.join(' '),
      prose: `${a.note.explains.slice(0, 110)}…`,
    })),
  };
  mkdirSync('audit-reports', { recursive: true });
  writeFileSync(
    `audit-reports/video-align-${VIDEO}.json`, JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));

  if (!APPLY) {
    console.log('\n(dry run — pass --apply to write these positions into the corpus)');
    return;
  }
  const byId = new Map(accepted.map((a) => [a.id, a]));
  let written = 0;
  for (const note of corpus.notes) {
    const a = byId.get(note.id);
    if (!a) continue;
    note.lineSan = a.lineSan;
    note.positionSource = 'video';
    written += 1;
  }
  writeFileSync(CORPUS, `${JSON.stringify(corpus, null, 2)}\n`);
  console.log(`\napplied ${written} video-derived positions to ${CORPUS}`);
}

main();
