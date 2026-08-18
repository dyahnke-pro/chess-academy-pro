/* The fork plan, computed rather than remembered.
 *
 * For every hand-written note that sits off every taught line, find where its
 * line LEAVES the nearest taught line. That divergence point is the fork: the
 * lesson already walks to it, so adding the note's move as a branch makes the
 * teaching audible without moving the spine (CLAUDE.md, the fork rule).
 *
 * A fork at ply 0-2 is a different opening, not an alternative — those are
 * reported separately and stay free-play material. */
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
