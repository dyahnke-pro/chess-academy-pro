// L1 SCORE (PLAN.md § PHASE 2 REDESIGN): today's Learn against HIS teaching
// moves, on his own games replayed in the real app.
//
// For each Learn turn (the student's move at ply p and the coach's reply at
// p+1) his teaching moves are the codes on his own words at those two plies,
// in the game itself (`his-bank-tags.json`, segment `game`). Ours are read off
// every fact the turn's deciding places weighed (`everythingEvents`, captured
// by `audit-learn-replay.mjs`), through the one kind → teaching-move table
// (`src/services/teachingMoves.ts`):
//   SAID     — the facts that reached the voice;
//   COMPUTED — every fact weighed, said or held: the ceiling a matrix can pick from.
// A turn scores on each of his teaching moves it makes; a teaching move we
// make that he does not is counted too (what he would not say there).
//
//   node scripts/scoreboard/score-learn.mjs <replay.json …>
import { readFileSync } from 'node:fs';
import { TEACHING_MOVES } from '../../src/services/teachingMoves.ts';

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node scripts/scoreboard/score-learn.mjs <learn-replay.json …>'); process.exit(2); }
const tags = JSON.parse(readFileSync(new URL('./his-bank-tags.json', import.meta.url), 'utf8'));
// his codes per (video, ply), game segment only (the analysis is Review's).
const his = new Map();
for (const [key, v] of Object.entries(tags)) {
  if (v.segment !== 'game') continue;
  const vid = key.slice(0, key.lastIndexOf(':'));
  const k = `${vid}:${v.ply}`;
  const cs = his.get(k) ?? new Set();
  for (const c of v.codes) if (c !== 'X-NARRATION') cs.add(c);
  his.set(k, cs);
}
const movesOf = (kind) => (kind && Object.prototype.hasOwnProperty.call(TEACHING_MOVES, kind) ? TEACHING_MOVES[kind] : null);

const tot = new Map(); const hitSaid = new Map(); const hitComp = new Map(); const ourSaid = new Map(); const extraSaid = new Map();
const unknownKinds = new Map();
let turns = 0; let silent = 0; let withHis = 0;
const bump = (m, k, n = 1) => m.set(k, (m.get(k) ?? 0) + n);
for (const f of files) {
  const r = JSON.parse(readFileSync(f, 'utf8'));
  const vid = r.game;
  for (const t of r.turns) {
    if (typeof t.ply !== 'number') continue;
    turns += 1;
    const H = new Set([...(his.get(`${vid}:${t.ply}`) ?? []), ...(his.get(`${vid}:${t.ply + 1}`) ?? [])]);
    const S = new Set(); const C = new Set();
    for (const row of t.everything ?? []) {
      for (const l of row.lines ?? []) {
        const ms = movesOf(l.kind);
        if (ms === null) { bump(unknownKinds, `${l.kind ?? '∅'} · ${l.computer}`); continue; }
        for (const m of ms) { C.add(m); if (l.said) S.add(m); }
      }
    }
    if (!(t.lines ?? []).length) silent += 1;
    for (const m of S) { bump(ourSaid, m); if (!H.has(m)) bump(extraSaid, m); }
    if (!H.size) continue;
    withHis += 1;
    for (const m of H) { bump(tot, m); if (S.has(m)) bump(hitSaid, m); if (C.has(m)) bump(hitComp, m); }
  }
}
const sum = (m) => [...m.values()].reduce((a, b) => a + b, 0);
const T = sum(tot);
console.log(`${files.length} games · ${turns} turns (${silent} silent) · ${withHis} with his words`);
console.log(`his teaching moves: ${T} · SAID ${sum(hitSaid)} = ${(100 * sum(hitSaid) / Math.max(T, 1)).toFixed(1)}% · COMPUTED ${sum(hitComp)} = ${(100 * sum(hitComp) / Math.max(T, 1)).toFixed(1)}%`);
console.log(`we said ${sum(ourSaid)} teaching moves; ${sum(extraSaid)} of them where he made no such move`);
console.log(`\n${'move'.padEnd(20)}${'his'.padStart(5)}${'said'.padStart(6)}${'comp'.padStart(6)}${'ours'.padStart(6)}${'not his'.padStart(8)}`);
for (const [m, n] of [...tot.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${m.padEnd(20)}${String(n).padStart(5)}${`${Math.round(100 * (hitSaid.get(m) ?? 0) / n)}%`.padStart(6)}${`${Math.round(100 * (hitComp.get(m) ?? 0) / n)}%`.padStart(6)}${String(ourSaid.get(m) ?? 0).padStart(6)}${String(extraSaid.get(m) ?? 0).padStart(8)}`);
}
const ourOnly = [...ourSaid.keys()].filter((m) => !tot.has(m));
if (ourOnly.length) console.log(`\nwe say, he never does in these turns: ${ourOnly.map((m) => `${m} ${ourSaid.get(m)}`).join(', ')}`);
if (unknownKinds.size) console.log(`\nlines with no kind in the table: ${[...unknownKinds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} ×${n}`).join(' | ')}`);
