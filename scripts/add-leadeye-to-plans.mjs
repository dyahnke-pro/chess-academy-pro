// Lead-the-eye generator for middlegame playable lines (Ruy + Pirc).
//
// David's NON-NEGOTIABLE: the arrows + highlights must lead the user's eye
// to whatever the narration is talking about, so they listen to the words
// instead of hunting for pieces and angles.
//
// Per move, deterministically derived (never invented):
//   - arrows[i] = GREEN vision arrows ONLY. For every square the annotation
//     NAMES, if a named non-pawn piece (or the piece that just moved) has a
//     clear sight-line to it, draw a green arrow. No "move arrow" — the move
//     itself is shown by the orange last-move highlight, not an arrow (David
//     2026-05-21: fewer colours, less clutter). Geometrically verified;
//     blocked rays are skipped, not faked. Capped so the board stays clean.
//   - highlights[i] = the move's from+to squares in ORANGE (the last move,
//     replacing the move arrow), plus every key/called-out square the
//     annotation names in YELLOW.
//
// Colour language (David's locked scheme 2026-05-21):
//   ORANGE  = the move just played (its two squares).
//   GREEN   = vision — what a piece is looking at.
//   YELLOW  = a key square the narration is calling out.
//
// Grounding contract (enforced by middlegamePlanner.test.ts): every yellow
// highlight and every vision-arrow endpoint must appear as a square token in
// that move's annotation. The orange move-squares are exempt — they ARE the
// move. Re-runnable: regenerates arrows + highlights from scratch.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_PATH = join(__dirname, '..', 'src', 'data', 'middlegame-plans.json');

const VISION_ARROW_COLOR = 'rgba(34, 197, 94, 0.85)'; // green — piece vision
const HL_MOVE = 'rgba(255, 165, 0, 0.55)'; // orange — the move's two squares
const HL_KEY = 'rgba(255, 235, 59, 0.5)'; // yellow — a called-out key square

const MAX_VISION_ARROWS = 2;
const MAX_HIGHLIGHTS = 6;

const SQUARE_RE = /\b([a-h][1-8])\b/g;
const PIECE_SQUARE_RE = /\b([NBRQK])([a-h][1-8])\b/g;

function fileRank(sq) {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}

function clearRay(c, from, to) {
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  let f = ff + df;
  let r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = String.fromCharCode(97 + f) + String(r + 1);
    if (c.get(sq)) return false;
    f += df;
    r += dr;
  }
  return true;
}

function sees(c, from, to) {
  if (from === to) return false;
  const pc = c.get(from);
  if (!pc) return false;
  const [ff, fr] = fileRank(from);
  const [tf, tr] = fileRank(to);
  const adf = Math.abs(tf - ff);
  const adr = Math.abs(tr - fr);
  switch (pc.type) {
    case 'n':
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'b':
      return adf === adr && adf > 0 && clearRay(c, from, to);
    case 'r':
      return ((adf === 0) !== (adr === 0)) && clearRay(c, from, to);
    case 'q':
      return (adf === adr || adf === 0 || adr === 0) && clearRay(c, from, to);
    case 'k':
      return adf <= 1 && adr <= 1 && (adf > 0 || adr > 0);
    default:
      return false; // pawns never get vision arrows
  }
}

/** Squares named in an annotation, in order, deduped. Returns both the set of
 *  all named squares and the set named via a piece token (e.g. "Bb3"). */
function namedSquares(text) {
  const pieceSquares = new Set();
  let m;
  PIECE_SQUARE_RE.lastIndex = 0;
  while ((m = PIECE_SQUARE_RE.exec(text)) !== null) {
    pieceSquares.add(m[2]);
  }
  const ordered = [];
  const seen = new Set();
  SQUARE_RE.lastIndex = 0;
  while ((m = SQUARE_RE.exec(text)) !== null) {
    const sq = m[1];
    if (!seen.has(sq)) {
      seen.add(sq);
      ordered.push(sq);
    }
  }
  return { ordered, pieceSquares };
}

function buildLeadEye(line) {
  const arrows = [];
  const highlights = [];
  const chess = new Chess(line.fen);

  line.moves.forEach((san, i) => {
    const mv = chess.move(san); // throws if the data ever drifts illegal
    const ann = line.annotations[i] ?? '';
    const { ordered, pieceSquares } = namedSquares(ann);

    // ── arrows — GREEN vision only (no move arrow) ───────────────────────
    // Prefer the piece that just moved, then any named piece-square, each
    // pointing at a DIFFERENT named square it sees.
    const sources = [mv.to, ...[...pieceSquares].filter((s) => s !== mv.to)];
    const visionPairs = [];
    const usedTargets = new Set([mv.from, mv.to]);
    for (const src of sources) {
      for (const tgt of ordered) {
        if (usedTargets.has(tgt)) continue;
        if (src === tgt) continue;
        if (sees(chess, src, tgt)) {
          visionPairs.push({ from: src, to: tgt, color: VISION_ARROW_COLOR });
          usedTargets.add(tgt);
          if (visionPairs.length >= MAX_VISION_ARROWS) break;
        }
      }
      if (visionPairs.length >= MAX_VISION_ARROWS) break;
    }
    arrows.push(visionPairs);

    // ── highlights — ORANGE move-squares + YELLOW called-out squares ─────
    const hl = [];
    const pushHl = (square, color) => {
      if (hl.some((h) => h.square === square)) return;
      hl.push({ square, color });
    };
    // The move just played: its two squares, orange (replaces the arrow).
    pushHl(mv.to, HL_MOVE);
    pushHl(mv.from, HL_MOVE);
    // Every other square the narration names: yellow key squares.
    for (const sq of ordered) {
      if (hl.length >= MAX_HIGHLIGHTS) break;
      pushHl(sq, HL_KEY);
    }
    highlights.push(hl);
  });

  return { arrows, highlights };
}

function main() {
  const plans = JSON.parse(readFileSync(PLANS_PATH, 'utf8'));
  let touchedPlans = 0;
  let touchedLines = 0;

  for (const plan of plans) {
    if (plan.openingId !== 'ruy-lopez' && plan.openingId !== 'pirc-defence' && plan.openingId !== 'vienna-game') continue;
    const lines = plan.playableLines ?? [];
    if (lines.length === 0) continue;
    let planTouched = false;
    for (const line of lines) {
      const { arrows, highlights } = buildLeadEye(line);
      line.arrows = arrows;
      line.highlights = highlights;
      touchedLines += 1;
      planTouched = true;
    }
    if (planTouched) touchedPlans += 1;
  }

  writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2) + '\n');
  console.log(`[lead-the-eye] enriched ${touchedLines} lines across ${touchedPlans} plans`);
}

main();
