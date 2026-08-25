#!/usr/bin/env node
/**
 * dump — full authoring view of a banked video (for HAND authoring).
 * Prints, per move: idx, ply, the move(s) played, a compact FEN, and the FULL
 * `said` transcript (untruncated) — everything you need to hand-write `spoken`.
 * Analysis/rewind rows are marked (ANALYSIS) → author them with reanchor:true.
 *   node scripts/voiced-authoring/dump.mjs <id>
 */
import { Chess } from '../../node_modules/chess.js/dist/esm/chess.js';
import { readBank } from './lib.mjs';

const id = process.argv[2];
if (!id) { console.error('usage: dump.mjs <id>'); process.exit(1); }
const b = readBank(id);
console.log(`# ${id} | ${b.title || '(no title)'} | ${b.moves.length} moves`);
const g = new Chess();
let last = 0;
b.moves.forEach((m, i) => {
  const line = Array.isArray(m.line) ? m.line : [];
  const said = (m.said || '').replace(/\s+/g, ' ').trim();
  if (typeof m.ply === 'number' && m.ply <= last) {
    console.log(`\n#${i} ply${m.ply} (ANALYSIS) line=[${line.join(' ')}]\n  said: ${said}`);
    return;
  }
  const snap = g.fen(); let ok = true; const played = [];
  for (const s of line) { try { if (!g.move(s)) { ok = false; break; } played.push(s); } catch { ok = false; break; } }
  if (!ok) { g.load(snap); }
  if (typeof m.ply === 'number') last = m.ply;
  console.log(`\n#${i} ply${m.ply} line=[${(ok ? played : line).join(' ')}]  ${g.fen().split(' ').slice(0, 2).join(' ')}\n  said: ${said}`);
});
