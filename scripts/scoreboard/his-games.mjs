// His games, as played: the game segment of each voiced video (before the
// first re-anchor / step back), chess.js-validated.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const DIR = 'data/video-narration-voiced';
const out = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8'));
  if (d.studentSide !== 'white' && d.studentSide !== 'black') continue;
  const c = new Chess(); let last = 0; let bad = null;
  for (const m of d.moves) {
    if (m.reanchor || m.ply < last) break;
    last = m.ply;
    for (const s of m.line ?? []) { try { c.move(s); } catch { bad = `${m.ply}:${s}`; break; } }
    if (bad) break;
  }
  out.push({ id: d.videoId, seat: d.studentSide, opening: d.openingName ?? '', plies: c.history().length, bad, sans: c.history().join(' '), result: c.isCheckmate() ? 'mate' : '' });
}
writeFileSync(process.argv[2], JSON.stringify(out));
const ok = out.filter((g) => !g.bad && g.plies >= 40);
console.log(`${out.length} videos, ${ok.length} clean games ≥ 40 plies (white ${ok.filter((g) => g.seat === 'white').length}, black ${ok.filter((g) => g.seat === 'black').length}); with an illegal move: ${out.filter((g) => g.bad).length}`);
