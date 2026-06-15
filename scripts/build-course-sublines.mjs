// Precompute frequency-derived SUBLINES for each masterclass opening's variations
// from the offline masters DB. A subline = an opponent deviation at an opponent-
// to-move node ALONG the variation spine, played in >= N master games, walked along
// the most-played continuation to the middlegame, RANKED most->least common with
// its frequency %. Grounded (G3): every move from the masters DB, nothing invented.
// Emits compact src/data/course-sublines.json (the 37MB DB never ships to client).
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('..', import.meta.url).pathname;
const db = JSON.parse(readFileSync(root + 'public/data/openings-masters-db.json', 'utf8')).positions;
const rep = JSON.parse(readFileSync(root + 'src/data/repertoire.json', 'utf8'));
const manifests = JSON.parse(readFileSync(root + 'src/data/opening-manifests.json', 'utf8'));
const eco = JSON.parse(readFileSync(root + 'src/data/openings-lichess.json', 'utf8'));
const ecoEntries = (Array.isArray(eco) ? eco : eco.openings || Object.values(eco)).filter(e => e && e.pgn && e.name);
const reps = Array.isArray(rep) ? rep : rep.openings || Object.values(rep);
const masterclassIds = Object.keys(manifests).filter(k => !k.startsWith('_'));
const only = process.env.OPENINGS ? new Set(process.env.OPENINGS.split(',')) : null;

const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const movesAt = (fen) => db[key(fen)] || [];
function sansFromPgn(pgn) {
  const toks = pgn.trim().split(/\s+/).map(t => t.replace(/^\d+\.(\.\.)?/, '')).filter(t => t && !/^\d+\.?$/.test(t));
  const c = new Chess(); const out = [];
  for (const t of toks) { try { out.push(c.move(t).san); } catch { return []; } }
  return out;
}
// Precompute ECO names once: normalized-SAN-pgn -> name (prefix map).
const ecoMap = new Map();
for (const e of ecoEntries) { const p = sansFromPgn(e.pgn).join(' '); if (p && !ecoMap.has(p)) ecoMap.set(p, e.name); }
function nameFor(sans) {
  for (let len = sans.length; len >= 2; len--) { const n = ecoMap.get(sans.slice(0, len).join(' ')); if (n) return n; }
  return null;
}
function walkMostPlayed(startSans, maxPlies = 30) {
  const c = new Chess(); for (const s of startSans) c.move(s);
  const out = [...startSans];
  while (out.length < maxPlies) {
    if (reachesMiddlegame(out.join(' ')).pass) break;
    const ms = movesAt(c.fen()); if (!ms.length) break;
    const top = ms.slice().sort((a, b) => b.games - a.games)[0];
    try { c.move(top.san); out.push(top.san); } catch { break; }
  }
  return out;
}
function buildSublines(variationPgn, studentColor) {
  const spine = sansFromPgn(variationPgn);
  if (spine.length < 2) return [];
  const oppIsWhite = studentColor === 'black';
  // Establishment ply: the variation's identity is set when its ECO name first
  // specializes (gains a ':' sub-variation). Branch ONLY after that, so sublines
  // are the opponent's choices WITHIN this variation, not the system-level fork
  // (which IS another chapter). Floor at 4 so we never branch on moves 1-2.
  let establishment = 4;
  for (let k = 2; k <= spine.length; k++) { const nm = nameFor(spine.slice(0, k)); if (nm && nm.includes(':')) { establishment = Math.max(4, k); break; } }
  const c = new Chess(); const subs = [];
  for (let i = 0; i < spine.length; i++) {
    const fenBefore = c.fen();
    const opponentNode = (c.turn() === 'w') === oppIsWhite;
    if (opponentNode && i >= establishment) {
      const ms = movesAt(fenBefore);
      const total = ms.reduce((s, m) => s + m.games, 0) || 1;
      const spineMove = spine[i];
      const thresh = Math.max(4, total * 0.02);
      for (const m of ms) {
        if (m.san === spineMove || m.games < thresh) continue;
        const dev = walkMostPlayed([...spine.slice(0, i), m.san], i + 1 + 22);
        subs.push({ triggerMove: m.san, atPly: i, games: m.games, pct: Math.round((m.games / total) * 100),
          name: nameFor(dev) || `${m.san} line`, moves: dev, reachesMiddlegame: reachesMiddlegame(dev.join(' ')).pass });
      }
    }
    try { c.move(spine[i]); } catch { break; }
  }
  return subs.sort((a, b) => b.games - a.games).slice(0, 10);
}

const out = {}; let totalSubs = 0;
for (const id of masterclassIds) {
  if (only && !only.has(id)) continue;
  const o = reps.find(x => x && x.id === id);
  if (!o || !o.variations) continue;
  const perVar = {};
  o.variations.forEach((v, idx) => { const subs = buildSublines(v.pgn, o.color); if (subs.length) { perVar[idx] = subs; totalSubs += subs.length; } });
  if (Object.keys(perVar).length) out[id] = perVar;
  console.log(`${id.padEnd(22)} ${o.color.padEnd(5)} vars=${o.variations.length} sublines/var=[${o.variations.map((v,i)=>(perVar[i]?.length||0)).join(',')}]`);
}
if (!only) { writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(out)); console.log(`\nwrote src/data/course-sublines.json — ${Object.keys(out).length} openings, ${totalSubs} sublines`); }
else {
  console.log(`\n[dry-run] ${totalSubs} sublines. Sample (caro-kann var 1):`);
  const s = out['caro-kann']?.[1] || Object.values(out)[0]?.[Object.keys(Object.values(out)[0])[0]] || [];
  for (const x of (s||[]).slice(0,6)) console.log(`  ${x.triggerMove.padEnd(5)} ${String(x.pct+'%').padEnd(5)} (${x.games}g) "${x.name}" ${x.moves.length}plies mg=${x.reachesMiddlegame}`);
}
