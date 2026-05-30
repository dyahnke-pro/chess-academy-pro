#!/usr/bin/env node
// Extract a clean >=8-ply middlegame teaching segment from a variation's real
// model game, for re-anchoring its middlegame plan (David 2026-05-30: use the
// games that actually reached the opening/middlegame). Writes a JSON report to
// /tmp so shell quoting never mangles FENs. Picks the segment by an anchor move
// number; prints per-ply san/fen/turn so the author can write theme narration.
//
// Run: node scripts/extract-game-segment.mjs <modelGameId> <anchorMoveNumber> <plies>
import fs from 'node:fs';
import { Chess } from 'chess.js';
const id = process.argv[2];
const anchorMove = parseInt(process.argv[3] || '8', 10);
const plies = parseInt(process.argv[4] || '10', 10);
const mg = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8')).find((g) => g.id === id);
if (!mg) { console.error('model game not found:', id); process.exit(1); }
const hist = mg.pgn.trim().split(/\s+/);
const c = new Chess();
const anchorPly = (anchorMove - 1) * 2; // white-to-move at the start of anchorMove
for (let i = 0; i < anchorPly && i < hist.length; i++) c.move(hist[i]);
const anchorFen = c.fen();
const seg = [];
for (let i = anchorPly; i < Math.min(anchorPly + plies, hist.length); i++) {
  const mv = c.move(hist[i]);
  seg.push({ ply: i + 1, san: mv.san, turn: mv.color, to: mv.to, fen: c.fen() });
}
const out = { id, white: mg.white, black: mg.black, result: mg.result, studentSide: mg.studentSide, variation: mg.variation, anchorMove, anchorFen, segment: seg, segmentSans: seg.map((s) => s.san) };
const path = `/tmp/seg-${id}.json`;
fs.writeFileSync(path, JSON.stringify(out, null, 2));
console.log(`${mg.white} vs ${mg.black} ${mg.result} | anchor move ${anchorMove}`);
console.log('anchorFen:', anchorFen);
seg.forEach((s) => console.log(`  ${s.ply} ${s.turn} ${s.san.padEnd(6)} to=${s.to}`));
console.log('segmentSans:', JSON.stringify(seg.map((s) => s.san)));
console.log('report:', path);
