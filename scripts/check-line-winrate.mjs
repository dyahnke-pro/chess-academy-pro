// "Well-taught line" determination via PRACTICAL RESULTS (David 2026-06-16):
// eval alone is too blunt; query the masters explorer at the line's ending
// position for W/D/L -> the student's practical score. A line is GOOD if the
// student scores acceptably in pro games even at a slightly-negative eval.
// Deep termini often have 0 master games, so walk back to the deepest position
// with >= MIN games.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const MIN = 8;
const root = new URL('..', import.meta.url).pathname;
const REPORT = process.argv[2];
const rep = JSON.parse(readFileSync(REPORT, 'utf8'));
const load = (p) => { try { const j = JSON.parse(readFileSync(root + p, 'utf8')); return j.openings || j; } catch { return []; } };
const all = [...load('src/data/repertoire.json'), ...load('src/data/pro-repertoires.json'), ...load('src/data/gambits.json'), ...load('src/data/anti-openings.json')];
const colorOf = {}; for (const o of all) if (o && o.id) colorOf[o.id] = o.color;
function uciList(pgn) { const t = pgn.trim().split(/\s+/).map((x) => x.replace(/^\d+\.(\.\.)?/, '')).filter((x) => x && !/^\d+\.?$/.test(x)); const c = new Chess(); const u = []; for (const m of t) { try { const r = c.move(m); u.push(r.from + r.to + (r.promotion || '')); } catch { return null; } } return u; }
async function masters(uci) { try { const r = await fetch(`${PROXY}?source=masters&play=${uci.join(',')}`); const d = await r.json(); const w = d.white || 0, dr = d.draws || 0, b = d.black || 0; return { w, dr, b, tot: w + dr + b }; } catch { return null; } }
const lines = (rep.losing || []).slice(0, Number(process.argv[3] || 30));
console.log(`line | eval | deepest>=${MIN}-game ply | master games | STUDENT score% | verdict`);
for (const L of lines) {
  const color = colorOf[L.id]; const u = uciList(L.line); if (!u || !color) continue;
  let res = null, plyUsed = 0;
  for (let k = u.length; k >= 6; k--) { const m = await masters(u.slice(0, k)); await new Promise((r) => setTimeout(r, 250)); if (m && m.tot >= MIN) { res = m; plyUsed = k; break; } }
  if (!res) { console.log(`  ${L.id} [${L.kind}] ${L.label}  eval ${L.eval} | NO master data (line too deep/rare)`); continue; }
  const studentWins = color === 'white' ? res.w : res.b;
  const score = ((studentWins + 0.5 * res.dr) / res.tot) * 100;
  const verdict = score >= 45 ? 'GOOD by results (keep)' : score >= 40 ? 'borderline' : 'BAD by results';
  console.log(`  ${L.id} [${L.kind}] ${L.label}  eval ${L.eval} | ply ${plyUsed} | ${res.tot}g | ${score.toFixed(0)}% | ${verdict}`);
}
console.log('DONE-WINRATE');
