// Gate C triage: for every plan whose criticalPositionFen is NOT on its
// opening's main/variation lines, measure how far it sits from the closest
// position on those lines (square-diff + move-number delta). Small diff at/
// beyond the terminus = a continuation (fine); large diff = orphan (real break).
import { Chess } from 'chess.js';
import fs from 'fs';

const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));

const linesByOpening = new Map();
function add(list) {
  for (const e of list) {
    const arr = linesByOpening.get(e.id) ?? [];
    if (e.pgn) arr.push({ name: '<main>', pgn: e.pgn });
    for (const v of e.variations ?? []) if (v?.pgn) arr.push({ name: v.name, pgn: v.pgn });
    linesByOpening.set(e.id, arr);
  }
}
add(repertoire); add(pro); add(anti);

function boardArr(fen) {
  const c = new Chess(fen);
  const out = [];
  for (const row of c.board()) for (const sq of row) out.push(sq ? sq.color + sq.type : '.');
  return out;
}
function diffCount(a, b) { let d = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) d++; return d; }
function moveNum(fen) { return Number(fen.split(' ')[5] ?? 0); }

const results = [];
for (const p of plans) {
  const lines = linesByOpening.get(p.openingId) ?? [];
  if (!p.criticalPositionFen) { results.push({ id: p.id, openingId: p.openingId, cls: 'no-fen' }); continue; }
  let planBoard;
  try { planBoard = boardArr(p.criticalPositionFen); } catch { results.push({ id: p.id, openingId: p.openingId, cls: 'bad-fen' }); continue; }
  let best = { diff: 99, at: null, terminal: false, termMove: 0 };
  let onLine = false;
  for (const ln of lines) {
    const c = new Chess();
    const sans = ln.pgn.trim().split(/\s+/).filter(Boolean);
    let arr = boardArr(c.fen());
    let idx = 0;
    const check = (isTerm) => {
      const d = diffCount(arr, planBoard);
      if (d === 0) onLine = true;
      if (d < best.diff) best = { diff: d, at: `${ln.name}@${idx}`, terminal: isTerm, termMove: Math.ceil(sans.length / 2) };
    };
    check(sans.length === 0);
    for (const m of sans) { try { if (!c.move(m)) break; } catch { break; } idx++; arr = boardArr(c.fen()); check(idx === sans.length); }
  }
  if (onLine) continue; // anchored — fine
  const mn = moveNum(p.criticalPositionFen);
  const cls = lines.length === 0 ? 'no-lines'
    : best.diff <= 4 ? 'continuation'
    : best.diff <= 8 ? 'drifted'
    : 'orphan';
  results.push({ id: p.id, openingId: p.openingId, cls, bestDiff: best.diff, closest: best.at, planMove: mn, endgame: p.id.endsWith('-endgame') });
}
const byCls = {};
for (const r of results) (byCls[r.cls] ??= []).push(r);
for (const [cls, rs] of Object.entries(byCls)) {
  console.log(`\n== ${cls}: ${rs.length}`);
  for (const r of rs.slice(0, 40)) console.log(`  ${r.openingId} :: ${r.id} ${r.bestDiff != null ? `(diff ${r.bestDiff} vs ${r.closest}${r.endgame ? ', endgame' : ''})` : ''}`);
  if (rs.length > 40) console.log(`  ... +${rs.length - 40}`);
}
fs.writeFileSync('audit-reports/masterclass-sweep/gatec.json', JSON.stringify(results, null, 1));
console.log('\nDONE');
