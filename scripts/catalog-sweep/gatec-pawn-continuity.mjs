// Gate C v2: pawn-skeleton continuity for NON-endgame plans. The pawn
// structure is the opening's identity — a plan whose pawn skeleton departs
// sharply from every position on its opening's lines is teaching from a
// different opening. Endgame plans are game-mediated (doctrine) — listed
// separately, not spine-checked.
import { Chess } from 'chess.js';
import fs from 'fs';
const repertoire = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8')).openings;
const anti = JSON.parse(fs.readFileSync('src/data/anti-openings.json', 'utf8'));
const plans = JSON.parse(fs.readFileSync('src/data/middlegame-plans.json', 'utf8'));
const linesByOpening = new Map();
function add(list) { for (const e of list) { const a = linesByOpening.get(e.id) ?? []; if (e.pgn) a.push({ name: '<main>', pgn: e.pgn }); for (const v of e.variations ?? []) if (v?.pgn) a.push({ name: v.name, pgn: v.pgn }); linesByOpening.set(e.id, a); } }
add(repertoire); add(pro); add(anti);
function pawnSet(fenOrChess) {
  const c = typeof fenOrChess === 'string' ? new Chess(fenOrChess) : fenOrChess;
  const s = new Set();
  for (const row of c.board()) for (const sq of row) if (sq && sq.type === 'p') s.add(sq.color + sq.square);
  return s;
}
function setDiff(a, b) { let d = 0; for (const x of a) if (!b.has(x)) d++; for (const x of b) if (!a.has(x)) d++; return d; }
const out = { anchored: 0, continuation: 0, break: [], badfen: [], egNoCheck: 0 };
for (const p of plans) {
  if (p.id.endsWith('-endgame')) { out.egNoCheck++; continue; }
  const lines = linesByOpening.get(p.openingId) ?? [];
  if (!p.criticalPositionFen || lines.length === 0) continue;
  let planPawns; try { planPawns = pawnSet(p.criticalPositionFen); } catch { out.badfen.push(p.id); continue; }
  let best = 99; let where = '';
  for (const ln of lines) {
    const c = new Chess();
    const sans = ln.pgn.trim().split(/\s+/).filter(Boolean);
    let d = setDiff(pawnSet(c), planPawns); if (d < best) { best = d; where = ln.name + '@0'; }
    let i = 0;
    for (const m of sans) { try { if (!c.move(m)) break; } catch { break; } i++; d = setDiff(pawnSet(c), planPawns); if (d < best) { best = d; where = `${ln.name}@${i}`; } }
  }
  if (best === 0) out.anchored++;
  else if (best <= 3) out.continuation++;
  else out.break.push({ id: p.id, openingId: p.openingId, pawnDiff: best, closest: where });
}
out.break.sort((a, b) => b.pawnDiff - a.pawnDiff);
console.log(`anchored(pawn-exact)=${out.anchored} continuation(diff<=3)=${out.continuation} endgame-plans(skipped)=${out.egNoCheck} badfen=${out.badfen.length}`);
console.log(`\n== STRUCTURAL BREAKS (pawn skeleton departs, diff>=4): ${out.break.length}`);
for (const b of out.break) console.log(`  ${String(b.pawnDiff).padStart(2)}  ${b.openingId} :: ${b.id}  (closest ${b.closest})`);
fs.writeFileSync('audit-reports/masterclass-sweep/gatec2.json', JSON.stringify(out, null, 1));
