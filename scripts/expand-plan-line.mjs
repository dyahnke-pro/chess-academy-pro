// One-off, careful expander for middlegame plan playable lines.
// Usage: node scripts/expand-plan-line.mjs '<json-spec>'
// spec = { planId, lineIndex=0, extend: [ { san, annotation, cue, sources? } ] }
//
// Grounding discipline (David 2026-05-26 "you do it personally here"):
//   - EVERY appended SAN is verified legal by chess.js from the line's
//     current end position; an illegal move aborts the whole write.
//   - Moves come from the masters DB where it reaches, else from the
//     plan's own documented pawnBreaks / pieceManeuvers (already sourced).
//   - annotation = full register (names the squares the plan is about so
//     lead-the-eye can draw grounded arrows). cue = <=8-word short register.
//   - Re-run scripts/add-leadeye-to-plans.mjs after, then the gates.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANS_PATH = join(__dirname, '..', 'src', 'data', 'middlegame-plans.json');

const spec = JSON.parse(process.argv[2]);
const plans = JSON.parse(readFileSync(PLANS_PATH, 'utf8'));
const plan = plans.find((p) => p.id === spec.planId);
if (!plan) throw new Error(`plan not found: ${spec.planId}`);
const line = (plan.playableLines ?? [])[spec.lineIndex ?? 0];
if (!line) throw new Error(`line ${spec.lineIndex ?? 0} not found on ${spec.planId}`);

// Replay to the current end position, verifying the existing line too.
const c = new Chess(line.fen);
for (const m of line.moves) {
  const r = c.move(m);
  if (!r) throw new Error(`existing move illegal?! ${m}`);
}
console.log(`[expand] ${spec.planId} end FEN: ${c.fen()}  (to move: ${c.turn()})`);

// Verify + apply each extension move.
for (const e of spec.extend) {
  const r = c.move(e.san);
  if (!r) {
    console.error(`[expand] ILLEGAL move "${e.san}" from ${c.fen()} — ABORTING, nothing written.`);
    process.exit(1);
  }
  line.moves.push(r.san); // canonical SAN from chess.js
  line.annotations.push(e.annotation);
  if (!Array.isArray(line.learnCues)) line.learnCues = [];
  line.learnCues.push(e.cue);
  if (e.sources && Array.isArray(line.sources)) {
    for (const s of e.sources) if (!line.sources.includes(s)) line.sources.push(s);
  }
  console.log(`[expand]  +${r.san}  -> ${c.fen()}`);
}

// Sanity: arrays stay parallel.
if (line.annotations.length !== line.moves.length || line.learnCues.length !== line.moves.length) {
  throw new Error('array length mismatch after expand — aborting');
}
writeFileSync(PLANS_PATH, JSON.stringify(plans, null, 2) + '\n');
console.log(`[expand] wrote ${spec.planId}: now ${line.moves.length} moves.`);
