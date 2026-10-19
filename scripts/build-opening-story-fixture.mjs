// Builds the masters-count fixture for openingStory.test.ts from the LIVE
// masters explorer through the app's own proxy (G3: real games, no authoring).
// Walks the same trees `prefetchOpeningStory` looks up: every position of each
// test line, two plies of book after it, and the pruned plan walk from it.
import { Chess } from 'chess.js';
import { writeFileSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer?source=masters&fen=';
const OUT = 'src/services/__fixtures__/opening-story-masters.json';
const LINES = [
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6 f3 Be7 Qd2 O-O O-O-O Nbd7 g4 b5',
  'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 e6 O-O Nf6 Qe2 Be7 Rd1 e5',
  'b3 e5 Bb2 Nc6 e3 d5 Bb5 Bd6 f4 Qh4+ g3 Qe7 Nf3 f6',
];
const key = (fen) => fen.split(' ').slice(0, 4).join(' ');
const db = {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function movesAt(fen) {
  const k = key(fen);
  if (k in db) return db[k];
  for (let a = 0; a < 4; a += 1) {
    const r = await fetch(PROXY + encodeURIComponent(fen));
    if (r.status === 429) { await sleep(60000); continue; }
    if (!r.ok) { await sleep(2000); continue; }
    const j = await r.json();
    db[k] = (j.moves ?? []).map((m) => ({ san: m.san, games: (m.white ?? 0) + (m.draws ?? 0) + (m.black ?? 0) })).filter((m) => m.games > 0);
    await sleep(250);
    return db[k];
  }
  throw new Error(`explorer failed at ${fen}`);
}
async function walk(root, { plies, branchShare, minNodeGames, minWeight, max }) {
  let level = [{ fen: root, w: 1 }]; let n = 0; const seen = new Set();
  for (let d = 0; d <= plies && level.length; d += 1) {
    const batch = level.filter((x) => !seen.has(key(x.fen)) && seen.add(key(x.fen))).sort((a, b) => b.w - a.w).slice(0, max - n);
    n += batch.length; const next = [];
    for (const x of batch) {
      const ms = await movesAt(x.fen); const tot = ms.reduce((s, m) => s + m.games, 0);
      if (d === plies || tot < minNodeGames) continue;
      for (const m of ms) { const w = x.w * m.games / tot; if (m.games / tot < branchShare || w < minWeight) continue; const c = new Chess(x.fen); c.move(m.san); next.push({ fen: c.fen(), w }); }
    }
    level = next;
  }
}
for (const line of LINES) {
  const c = new Chess();
  const fens = [c.fen()];
  for (const s of line.split(' ')) { c.move(s); fens.push(c.fen()); }
  for (const f of fens) {
    await walk(f, { plies: 1, branchShare: 0.1, minNodeGames: 1, minWeight: 0, max: 40 });
    await walk(f, { plies: 12, branchShare: 0.1, minNodeGames: 20, minWeight: 0.05, max: 80 });
    process.stdout.write(`\r${line.slice(0, 20)}… ${Object.keys(db).length} positions`);
  }
  console.log();
}
writeFileSync(OUT, JSON.stringify({ source: 'lichess masters explorer via /api/lichess-explorer', builtAt: new Date().toISOString().slice(0, 10), positions: db }));
console.log('wrote', OUT, Object.keys(db).length);
