#!/usr/bin/env node
// Propose a REAL data-derived continuation to extend a short middlegame-plan
// playableLine to >=8 plies (David 2026-05-30). Replays the line to its end,
// then walks the MOST-PLAYED masters move at each ply (via the explorer proxy)
// until the line reaches >=8 plies or the position leaves master coverage.
// Prints the new SAN moves + FEN after each, ready to author annotations for.
// If the explorer has no data past the line's end, prints NO-DATA so the line
// is flagged (stays short) rather than padded.
//
// Run: node scripts/extend-plan-line.mjs <planId> [targetPlies=8]
import fs from 'node:fs';
import { Chess } from 'chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MIN_GAMES = 30; // require a reasonably-played continuation, not a one-off

const planId = process.argv[2];
const target = parseInt(process.argv[3] || '8', 10);
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const plan = plans.find((p) => p.id === planId);
if (!plan) { console.error('plan not found:', planId); process.exit(1); }
const line = (plan.playableLines || [])[0];
if (!line) { console.error('no playableLine'); process.exit(1); }

const c = new Chess(line.fen);
for (const m of line.moves) c.move(m);
console.log(`[extend] ${planId}: ${line.moves.length} plies → target ${target}. end FEN: ${c.fen()}`);

const added = [];
while (line.moves.length + added.length < target) {
  await sleep(120);
  // Query the position DIRECTLY by FEN — a mid-game plan position has no
  // startpos move-sequence to pass via play=.
  const j = await fetch(`${PROXY}?source=masters&fen=${encodeURIComponent(c.fen())}`).then((r) => r.json()).catch(() => null);
  const top = j && j.moves && j.moves[0];
  const games = top ? top.white + top.black + top.draws : 0;
  if (!top || games < MIN_GAMES) {
    console.log(`  NO-DATA after +${added.length} (top=${top ? top.san + '/' + games + 'g' : 'none'}, need >=${MIN_GAMES}). FLAG: line stays at ${line.moves.length + added.length} plies.`);
    break;
  }
  const mv = c.move(top.san);
  added.push({ san: top.san, games, fen: c.fen(), turn: mv.color });
}
if (added.length) {
  console.log(`  proposed +${added.length} real moves (most-played, masters):`);
  added.forEach((a, i) => console.log(`   ${i + 1}. ${a.turn} ${a.san}  (${a.games} games)  -> ${a.fen}`));
  console.log(`  extended moves array: ${JSON.stringify([...line.moves, ...added.map((a) => a.san)])}`);
}
