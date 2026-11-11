// WHERE EACH OF LEVY'S LINES GOES (WO-OPENINGS-REWRITE-01 R4). For every merged
// line (`_merged.json`), the GothamChess opening of the same seat whose lines
// it stays on the longest (by board, so a transposition counts) — its main line, each tab, each built reply —
// and the ply where it leaves them. A line that leaves before the opening's own
// identity (its first 4 plies) is a new opening; one that leaves later is a
// new tab (a `main` line) or a reply on that tab (a `reply`), or a trap.
//
//   node scripts/levy-lines/placement.mjs   → docs/levy-lines/_placement.json + .md
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const merged = JSON.parse(readFileSync('docs/levy-lines/_merged.json', 'utf8'));
const pro = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf8'));
const subs = JSON.parse(readFileSync('src/data/course-sublines.json', 'utf8'));
const sansOf = (pgn) => String(pgn).split(/\s+/).filter((t) => t && !/^\d+\.+$/.test(t)).map((t) => t.replace(/^\d+\.+/, ''));

const openings = (Array.isArray(pro) ? pro : pro.openings ?? []).filter((o) => String(o.id).startsWith('pro-gothamchess-'));
const known = [];
for (const o of openings) {
  known.push({ id: o.id, color: o.color, tab: null, moves: sansOf(o.pgn) });
  (o.variations ?? []).forEach((v, k) => known.push({ id: o.id, color: o.color, tab: v.name, tabIndex: k, moves: sansOf(v.pgn) }));
  for (const [tabIndex, list] of Object.entries(subs[o.id] ?? {})) for (const r of list) known.push({ id: o.id, color: o.color, tab: `reply@${tabIndex}`, moves: r.moves });
}
const posKey = (fen) => fen.split(' ').slice(0, 4).join(' ');
const positions = (moves) => { const c = new Chess(); return moves.map((m) => { c.move(m); return posKey(c.fen()); }); };
// Each known line's positions, so a line that reaches the same board by
// another move order (2.Bf4 before Nf3) is found on it.
for (const k of known) { try { k.pos = new Set(positions(k.moves)); } catch { k.pos = new Set(); } }
/** How far a line stays on a known line: the deepest of its plies whose board
 *  the known line also reaches (a transposition counts). */
const shared = (linePos, k) => { let n = 0; linePos.forEach((p, i) => { if (k.pos.has(p)) n = i + 1; }); return n; };

/** What names an opening: its name without the generic words, as one phrase
 *  ("london" for "London System", "closed sicilian" for "Closed Sicilian"), so
 *  a Sicilian line is not taken for the Closed Sicilian. */
const GENERIC = new Set(['system', 'defense', 'defence', 'game', 'opening', 'attack', 'variation', 'gambit', 'refuted', 'refutation', 'white', 'black', 'the', 'vs']);
const nameKey = (name) => String(name).toLowerCase().split(/[^a-z-]+/).filter((w) => w && !GENERIC.has(w)).join(' ') || null;

const out = [];
for (const l of merged.filter((x) => !x.statuses.includes('duplicate'))) {
  const moves = l.moves.split(' ');
  const linePos = positions(moves);
  let best = null;
  for (const k of known) {
    if (k.color !== l.side) continue;
    const n = shared(linePos, k);
    if (!best || n > best.n) best = { n, k };
  }
  // A line whose family names one of his openings belongs to it even when it
  // leaves early by move order (the London by 2.Bf4).
  if ((best?.n ?? 0) < 4) {
    const named = openings.find((o) => o.color === l.side && nameKey(o.name) && l.openings.concat(l.names).some((t) => String(t).toLowerCase().includes(nameKey(o.name))));
    if (named) {
      let nb = null;
      for (const k of known) if (k.id === named.id) { const n = shared(linePos, k); if (!nb || n > nb.n) nb = { n, k }; }
      if (nb) best = { n: Math.max(nb.n, 4), k: nb.k };
    }
  }
  const leaves = best?.n ?? 0;
  const place = leaves >= moves.length ? 'inside' : leaves < 4 ? 'new-opening' : l.kinds.includes('trap') ? 'trap' : l.kinds.includes('reply') ? 'reply' : 'tab';
  out.push({ place, opening: leaves >= 4 ? best.k.id : null, nearTab: best?.k.tab ?? null, leavesAt: leaves, plies: moves.length, side: l.side, name: l.names[0], family: l.openings[0], kinds: l.kinds, taught: l.taught, played: l.played, evalCp: l.evalCp, masters: l.masters, moves: l.moves });
}
writeFileSync('docs/levy-lines/_placement.json', JSON.stringify(out, null, 1));

const tally = {};
for (const r of out) { const k = `${r.taught ? 'taught' : 'played'} ${r.place}`; tally[k] = (tally[k] ?? 0) + 1; }
const md = ['# Where Levy\'s lines go', '', ...Object.entries(tally).sort().map(([k, v]) => `- ${k}: ${v}`), ''];
const byOpening = {};
for (const r of out.filter((x) => x.taught && x.opening && x.place !== 'inside')) (byOpening[r.opening] ??= []).push(r);
for (const [id, rs] of Object.entries(byOpening).sort((a, b) => b[1].length - a[1].length)) {
  md.push(`## ${id} — ${rs.length} taught (${['tab', 'reply', 'trap'].map((p) => `${rs.filter((r) => r.place === p).length} ${p}`).join(', ')})`);
  for (const r of rs.sort((a, b) => a.leavesAt - b.leavesAt)) md.push(`- [${r.place}] leaves ${r.nearTab ?? 'main'} at ply ${r.leavesAt + 1}/${r.plies}: ${r.name} — ${r.moves}`);
  md.push('');
}
const fams = {};
for (const r of out.filter((x) => x.taught && x.place === 'new-opening')) (fams[`${r.side} ${r.family}`] ??= []).push(r);
md.push('## New openings (taught, leaves every Gotham opening before ply 5)');
for (const [f, rs] of Object.entries(fams).sort((a, b) => b[1].length - a[1].length)) md.push(`- ${f}: ${rs.length}`);
writeFileSync('docs/levy-lines/_placement.md', md.join('\n'));
console.log(md.slice(0, Object.keys(tally).length + 3).join('\n'));
