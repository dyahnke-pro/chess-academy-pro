#!/usr/bin/env node
/**
 * fix-middlegame-plans.mjs
 * ------------------------
 * Applies the structural audit's findings for middlegame-plans.json
 * and common-mistakes.json:
 *
 *   1. SAN drift   — replace declared SAN with the chess.js-replayed
 *                    SAN (e.g. "Nac7" -> "Nc7", "exf4" -> "exf4+").
 *   2. Illegal arrows — when arrow.from doesn't contain the piece
 *                       that made the move, rewrite arrow.from to
 *                       the actual moved piece's from-square.
 *   3. Illegal moves — remove the offending subline entirely. The
 *                      line is broken (PGN won't parse from the
 *                      critical FEN), better to drop than to guess.
 *
 * Usage:
 *   node scripts/fix-middlegame-plans.mjs          # dry-run
 *   node scripts/fix-middlegame-plans.mjs --write  # apply
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const dryRun = !process.argv.includes('--write');
const PLANS_PATH = 'src/data/middlegame-plans.json';
const MISTAKES_PATH = 'src/data/common-mistakes.json';
const AUDIT_PATH = 'audit-reports/structural.json';

const audit = JSON.parse(readFileSync(AUDIT_PATH, 'utf8'));
const plans = JSON.parse(readFileSync(PLANS_PATH, 'utf8'));
const mistakes = JSON.parse(readFileSync(MISTAKES_PATH, 'utf8'));

let sanFixed = 0;
let arrowFixed = 0;
let linesDropped = 0;

// ─── 1. SAN DRIFT ──────────────────────────────────────────────────
for (const f of audit.findings.sanDrift) {
  if (f.source !== 'middlegame-plan') continue;
  // Multiple plans can share the same openingId (e.g. italian-game
  // has mp-italian-d4 AND mp-italian-f4). Search all of them for
  // the line with the matching title.
  let plan = null;
  let line = null;
  for (const p of plans.filter((x) => x.openingId === f.openingId)) {
    const l = p.playableLines?.find((ll) => ll.title === f.sublineName);
    if (l) { plan = p; line = l; break; }
  }
  if (!plan || !line || !Array.isArray(line.moves)) continue;
  if (line.moves[f.moveIndex] === f.declared) {
    line.moves[f.moveIndex] = f.replayed;
    sanFixed++;
    if (!dryRun) {
      console.log(`  SAN fix: ${f.openingId}/${f.sublineName} move ${f.moveIndex} "${f.declared}" -> "${f.replayed}"`);
    }
  }
}

// ─── 2. ILLEGAL ARROWS ─────────────────────────────────────────────
// For each illegal arrow, re-play the line up to that move and find
// the square the moved piece actually came from, then rewrite arrow.from.
for (const f of audit.findings.illegalArrows) {
  if (f.source !== 'middlegame-plan') continue;
  let plan = null;
  let line = null;
  for (const p of plans.filter((x) => x.openingId === f.openingId)) {
    const l = p.playableLines?.find((ll) => ll.title === f.sublineName);
    if (l) { plan = p; line = l; break; }
  }
  if (!plan || !line) continue;

  const [arrowFromDeclared, arrowToDeclared] = f.arrow.split('->');
  // Re-play to just BEFORE the move in question
  const chess = new Chess(plan.criticalPositionFen);
  let replayOk = true;
  for (let i = 0; i < f.moveIndex; i++) {
    try {
      const move = chess.move(line.moves[i]);
      if (!move) { replayOk = false; break; }
    } catch {
      replayOk = false;
      break;
    }
  }
  if (!replayOk) continue;
  // Try the move and find actual from-square
  let played;
  try {
    played = chess.move(line.moves[f.moveIndex]);
  } catch {
    continue;
  }
  if (!played) continue;

  // Arrows live at line.arrows[moveIndex] (parallel array) as an
  // array of { from, to } objects.
  const arrows = line.arrows?.[f.moveIndex];
  if (!Array.isArray(arrows)) continue;
  for (const arr of arrows) {
    if (arr.from === arrowFromDeclared && arr.to === arrowToDeclared) {
      arr.from = played.from;
      arrowFixed++;
      if (!dryRun) {
        console.log(`  Arrow fix: ${f.openingId}/${f.sublineName} move ${f.moveIndex} ${arrowFromDeclared}->${arrowToDeclared} -> ${played.from}->${arrowToDeclared}`);
      }
      break;
    }
  }
}

// ─── 3. ILLEGAL MOVES ──────────────────────────────────────────────
// Drop the entire subline. In middlegame-plans this means removing
// that entry from playableLines; in common-mistakes, removing the
// offending mistake index.
for (const f of audit.findings.illegalMoves) {
  if (f.source === 'middlegame-plan') {
    // Search all plans with matching openingId — multiple plans can
    // share an openingId (italian-game has mp-italian-d4 AND mp-italian-f4).
    let targetPlan = null;
    let idx = -1;
    for (const p of plans.filter((x) => x.openingId === f.openingId)) {
      const i = p.playableLines?.findIndex((l) => l.title === f.sublineName) ?? -1;
      if (i >= 0) { targetPlan = p; idx = i; break; }
    }
    if (targetPlan && idx >= 0) {
      targetPlan.playableLines.splice(idx, 1);
      linesDropped++;
      if (!dryRun) {
        console.log(`  Drop broken line: ${f.openingId}/"${f.sublineName}"`);
      }
    }
  } else if (f.source === 'common-mistake-correct' || f.source === 'common-mistake-wrong') {
    // common-mistakes.json is keyed by openingId -> array of mistakes.
    // sublineName is "mistake[N].correct" or "mistake[N].wrong"
    const match = f.sublineName.match(/mistake\[(\d+)\]/);
    if (!match) continue;
    const mistakeIdx = parseInt(match[1], 10);
    const arr = mistakes[f.openingId];
    if (!Array.isArray(arr) || !arr[mistakeIdx]) continue;
    arr[mistakeIdx].__drop = true;
    linesDropped++;
    if (!dryRun) {
      console.log(`  Drop broken mistake: ${f.openingId} mistake[${mistakeIdx}]`);
    }
  }
}
// Prune dropped mistakes
for (const key of Object.keys(mistakes)) {
  if (Array.isArray(mistakes[key])) {
    mistakes[key] = mistakes[key].filter((m) => !m.__drop);
  }
}

// ─── 4. FINAL SWEEP — remove any arrow that is STILL illegal after
// the from-fix attempt above. These are arrows whose `to` square
// doesn't match the moved piece's destination — they represent
// tactical-target lines (e.g. "Qg3 attacks g7") rather than the
// actual move, and the renderer can't draw them. Better no arrow
// than a broken one.
let arrowsRemoved = 0;
for (const plan of plans) {
  if (!Array.isArray(plan.playableLines)) continue;
  for (const line of plan.playableLines) {
    if (!Array.isArray(line.arrows) || !Array.isArray(line.moves)) continue;
    const chess = new Chess(plan.criticalPositionFen ?? line.fen);
    for (let i = 0; i < line.moves.length; i++) {
      // Compute legal moves from the position BEFORE this ply
      let legalMoves = [];
      try {
        legalMoves = chess.moves({ verbose: true });
      } catch {
        legalMoves = [];
      }
      const arrowsAtPly = line.arrows[i];
      if (Array.isArray(arrowsAtPly)) {
        const before = arrowsAtPly.length;
        line.arrows[i] = arrowsAtPly.filter((arr) => {
          return legalMoves.some((m) => m.from === arr.from && m.to === arr.to);
        });
        arrowsRemoved += before - line.arrows[i].length;
      }
      // Advance the board for the next iteration
      try { chess.move(line.moves[i]); } catch { break; }
    }
  }
}

console.log('\n[fix-middlegame-plans] summary:');
console.log({ sanFixed, arrowFixed, arrowsRemoved, linesDropped, dryRun });

if (!dryRun) {
  writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2) + '\n');
  writeFileSync(MISTAKES_PATH, JSON.stringify(mistakes, null, 2) + '\n');
  console.log('\nWrote', PLANS_PATH);
  console.log('Wrote', MISTAKES_PATH);
} else {
  console.log('\nDry-run. Pass --write to apply.');
}
