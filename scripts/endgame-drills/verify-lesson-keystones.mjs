// Tablebase check of every endgame LESSON keystone (≤7 pieces): the claimed
// result at the start, and every move of its line keeps it. Endgame hand walk
// 2026-10-01 found 9 lessons teaching a result the tablebase contradicts.
// Run from the repo root: node scripts/endgame-drills/verify-lesson-keystones.mjs
import { Chess } from 'chess.js';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const CACHE = '/tmp/endgame-keystone-tb-cache.json';
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const TB = async (fen) => {
  if (cache[fen]) return cache[fen];
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://chess-academy-pro.vercel.app/api/lichess-tablebase?fen=${encodeURIComponent(fen)}`);
    if (r.ok) { const j = await r.json(); cache[fen] = { category: j.category, moves: (j.moves ?? []).map((m) => ({ san: m.san, category: m.category })) }; await new Promise((s) => setTimeout(s, 200)); return cache[fen]; }
    await new Promise((s) => setTimeout(s, 1500 * (a + 1)));
  }
  return null;
};
// The side-to-move category → the result for White.
const forWhite = (cat, turn) => {
  if (cat === 'draw' || cat === 'cursed-win' || cat === 'blessed-loss') return 'draw';
  if (cat === 'win') return turn === 'w' ? 'white-wins' : 'black-wins';
  if (cat === 'loss') return turn === 'w' ? 'black-wins' : 'white-wins';
  return cat;
};
const files = ['pawn-endings', 'rook-endings', 'drawn-patterns', 'endgame-principles'];
const out = [];
for (const f of files) {
  const d = JSON.parse(readFileSync(`src/data/${f}.json`, 'utf8'));
  for (const p of d) for (const [i, lp] of (p.positions ?? []).entries()) {
    const c = new Chess(lp.fen);
    const n = c.board().flat().filter(Boolean).length;
    if (n > 7) { out.push(`SKIP ${f}/${p.id}#${i} (${n} pieces) claims ${lp.result}`); continue; }
    const t0 = await TB(lp.fen); if (!t0) { out.push(`ERR ${f}/${p.id}#${i}`); continue; }
    const actual = forWhite(t0.category, c.turn());
    const bad = [];
    if (actual !== lp.result) bad.push(`start is ${actual}, lesson says ${lp.result}`);
    for (const [k, san] of (lp.solution ?? []).entries()) {
      let mv; try { mv = c.move(san); } catch { bad.push(`ply ${k + 1} ${san} illegal`); break; }
      if (c.isGameOver()) break;
      const t = await TB(c.fen()); if (!t) break;
      const now = forWhite(t.category, c.turn());
      if (now !== actual) { bad.push(`ply ${k + 1} ${san} turns ${actual} into ${now}`); break; }
    }
    out.push(`${bad.length ? 'BAD ' : 'ok  '} ${f}/${p.id}#${i} ${lp.result}${bad.length ? ' :: ' + bad.join('; ') : ''}`);
  }
}
writeFileSync(CACHE, JSON.stringify(cache));
console.log(out.join('\n'));
