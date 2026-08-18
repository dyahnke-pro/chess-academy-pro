#!/usr/bin/env node
/**
 * fork-plan — where every off-line note leaves the lines we teach.
 *
 * For each hand-written note stranded off every taught line, find the ply where
 * its line parts company with the nearest one. That divergence IS the fork: the
 * lesson already walks to it, so adding the note's move as a branch makes the
 * teaching audible without moving the spine an inch (CLAUDE.md, the fork rule).
 *
 * Read it as a WORK LIST, not a verdict. Notes cluster: four notes anchored at
 * successive plies of one branch need ONE variation between them, so the number
 * of lines to add is far smaller than the number of notes to rescue. Grouping
 * by host and by branch is what makes that visible.
 *
 * A fork at ply 0-3 is a different opening, not an alternative, and is reported
 * separately — those notes stay free-play and review material.
 *
 * Pipeline: fork-plan (what to add) -> build-opening-spine (how the line
 * continues, from master data) -> fork-check (is it fit, and what does it buy)
 * -> line-profile (where a flagged line goes wrong).
 *
 * Usage:
 *   node scripts/video-align/fork-plan.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';
const sansOf = (p) => (p ?? '').split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t));
const raw = JSON.parse(readFileSync('src/data/repertoire.json', 'utf8'));
const rows = Array.isArray(raw) ? raw : Object.values(raw).flat();
const lines = [];
for (const r of rows) {
  if (r?.pgn) lines.push({ id: r.id, color: r.color, name: r.name, sans: sansOf(r.pgn) });
  for (const v of r?.variations ?? []) if (v?.pgn) lines.push({ id: r.id, color: r.color, name: `${r.name} / ${v.name}`, sans: sansOf(v.pgn) });
}
const posKey = (f) => f.split(' ').slice(0, 2).join(' ');
const taught = new Set();
for (const l of lines) { const g = new Chess(); for (const s of l.sans) { try { if (!g.move(s)) break; } catch { break; } taught.add(posKey(g.fen())); } }

const out = [];
for (const f of readdirSync('data/video-notes').filter((x) => x.endsWith('.json'))) {
  for (const n of JSON.parse(readFileSync(`data/video-notes/${f}`, 'utf8'))) {
    const sans = n.line.trim().split(/\s+/);
    const g = new Chess(); let ok = true;
    for (const s of sans) { try { if (!g.move(s)) { ok = false; break; } } catch { ok = false; break; } }
    if (!ok) { console.log(`ILLEGAL ${n.id}`); continue; }
    if (taught.has(posKey(g.fen()))) continue;
    let best = null;
    for (const l of lines) {
      let i = 0;
      while (i < sans.length && i < l.sans.length && sans[i] === l.sans[i]) i++;
      if (!best || i > best.shared) best = { shared: i, line: l };
    }
    out.push({ id: n.id, video: f.replace('.json', ''), plies: sans.length, shared: best.shared,
               host: best.line.name, hostId: best.line.id, color: best.line.color,
               diverge: sans[best.shared], after: sans.slice(0, best.shared).join(' '),
               tail: sans.slice(best.shared).join(' ') });
  }
}
out.sort((a, b) => b.shared - a.shared);
const deep = out.filter((r) => r.shared >= 4);
console.log(`FORKABLE (divergence at ply 4+): ${deep.length}\n`);
let host = '';
for (const r of deep) {
  if (r.host !== host) { host = r.host; console.log(`\n== ${host}  [${r.hostId}, ${r.color}]`); }
  console.log(`  ply ${String(r.shared).padStart(2)}  ${r.id}`);
  console.log(`         after : ${r.after}`);
  console.log(`         branch: ${r.tail}   (video ${r.video})`);
}
console.log(`\nGENERIC (ply 0-3, stays free-play): ${out.length - deep.length}`);
for (const r of out.filter((x) => x.shared < 4)) console.log(`  ply ${r.shared}  ${r.id}  [${r.host}]`);
