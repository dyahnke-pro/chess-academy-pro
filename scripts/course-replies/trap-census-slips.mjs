// TRAP CENSUS, source 3 of 3 — the slips amateurs actually make on our lines
// (WO-COURSE-01). David 2026-10-27: "make sure we are not missing any traps."
//
// Why traps were missed: the old miner kept ONE gem per board (the biggest),
// asked ≥ 2% and ≥ 100 games, stopped at ply 18 and never scanned the reply
// lines — every other refutable slip at a board was dropped. This reads every
// board on every course line (main, variations, replies) where the opponent
// is to move, from the explorer cache the reply walk already paid for (no new
// lookups), and grades EVERY common slip there the way the gems are graded:
//   screen — the student's eval after the slip ≥ +1.5 and ≥ 1.5 above the board;
//   then the punishment is played out with best moves for both sides and the
//   QUIET end is graded: trap ≥ +3.0 with material won (or mate), mistake
//   ≥ +1.0 with no material lost. A move masters play from that board (≥ 8
//   games) is theory, not a slip. Candidates only — each is read by hand.
//
// Usage: node scripts/course-replies/trap-census-slips.mjs --shard i/n
//        node scripts/course-replies/trap-census-slips.mjs --merge
// → audit-reports/trap-census-slips.shard-<i>.json → trap-census-slips.json
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const arr = (raw) => (Array.isArray(raw) ? raw : raw.openings ?? raw.gambits ?? Object.values(raw));
const tokens = (pgn) => (pgn ?? '').trim().split(/\s+/).map((t) => t.replace(/^\d+\.(\.\.)?/, '')).filter((t) => t && !/^\d+\.?$/.test(t));
const pos = (fen) => fen.split(' ').slice(0, 4).join(' ');

const NODE_SHARE = 0.01;   // ≥ 1% of the games at that board
const REACH = 0.0005;      // ≥ 1 in 2,000 games of the opening
const MAX_PLY = 24;
const SCREEN_CP = 150;
const TRAP_CP = 300;
const MISTAKE_CP = 100;
const MASTER_GAMES = 8;

if (process.argv.includes('--merge')) {
  const rows = readdirSync(root + 'audit-reports').filter((f) => /^trap-census-slips\.shard-\d+\.json$/.test(f))
    .flatMap((f) => J(`audit-reports/${f}`).found);
  rows.sort((a, z) => z.reachPct - a.reachPct);
  writeFileSync(root + 'audit-reports/trap-census-slips.json', JSON.stringify(rows, null, 1));
  const by = (t) => rows.filter((r) => r.kind === t).length;
  console.log(`[slips] ${rows.length} graded slips · trap ${by('trap')} · mistake ${by('mistake')} · initiative-only ${by('initiative')} · new (not a gem) ${rows.filter((r) => r.missingIn.length).length}`);
  process.exit(0);
}
const [I, N] = process.argv[process.argv.indexOf('--shard') + 1].split('/').map(Number);

const cache = J('data/sources/explorer-cache/amateur-1000-1200,1400,1600,1800,2000.json');
const masters = J('public/data/openings-masters-db.json').positions;
const walked = J('audit-reports/course-replies-count.json').openings;
const known = new Set();
for (const g of [...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]) {
  const c = new Chess();
  try { for (const s of tokens(g.lineMoves)) c.move(s); } catch { continue; }
  known.add(`${g.openingId}|${pos(c.fen())}|${g.inaccuracy}`);
}

// Every (board, slip) on a walked opening's lines, with the openings it serves.
const openings = ['repertoire', 'pro-repertoires', 'gambits', 'anti-openings'].flatMap((f) => arr(J(`src/data/${f}.json`)))
  .filter((o) => o?.id && o.pgn && walked[o.id]?.done);
const subs = J('src/data/course-sublines.json');
const tasks = new Map(); // `${pos}|${san}` → task
for (const o of openings) {
  const startTotal = cache[pos((() => { const c = new Chess(); for (const s of tokens(walked[o.id].start)) c.move(s); return c.fen(); })())]?.total;
  if (!startTotal) continue;
  const me = o.color === 'white' ? 'w' : 'b';
  const lines = [['main', tokens(o.pgn)], ...(o.variations ?? []).map((v, i) => [`var-${i}`, tokens(v.pgn)]),
    ...Object.entries(subs[o.id] ?? {}).flatMap(([t, l]) => l.map((s) => [`sub-${t}::${s.triggerMove}@${s.atPly}`, s.moves]))];
  for (const [line, sans] of lines) {
    const c = new Chess();
    for (let i = 0; i <= Math.min(sans.length, MAX_PLY); i++) {
      const fen = c.fen();
      const at = cache[pos(fen)];
      if (at && fen.split(' ')[1] !== me) {
        const mastersHere = masters[pos(fen)] ?? [];
        for (const m of at.moves) {
          if (m.games / at.total < NODE_SHARE || m.games / startTotal < REACH) continue;
          if ((mastersHere.find((x) => x.san === m.san)?.games ?? 0) >= MASTER_GAMES) continue;
          const key = `${pos(fen)}|${m.san}`;
          const t = tasks.get(key) ?? { fen, san: m.san, path: sans.slice(0, i).join(' '), share: m.games / at.total, games: m.games, reach: 0, student: me, serves: [] };
          t.reach = Math.max(t.reach, m.games / startTotal);
          if (!t.serves.some((s) => s.openingId === o.id)) t.serves.push({ openingId: o.id, line, ply: i });
          tasks.set(key, t);
        }
      }
      if (i === sans.length) break;
      try { c.move(sans[i]); } catch { break; }
    }
  }
}
const mine = [...tasks.values()].filter((_, k) => k % N === I);
console.log(`[slips ${I}/${N}] ${tasks.size} (board, slip) pairs over ${openings.length} walked openings · this shard ${mine.length}`);

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const material = (c, side) => { let s = 0; for (const row of c.board()) for (const q of row) if (q) s += (q.color === side ? 1 : -1) * (VAL[q.type] ?? 0); return s; };
const uciMove = (c, u) => c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });

const out = existsSync(`${root}audit-reports/trap-census-slips.shard-${I}.json`) ? J(`audit-reports/trap-census-slips.shard-${I}.json`) : { done: [], found: [] };
const done = new Set(out.done);
const engine = new Engine();
let n = 0;
for (const t of mine) {
  const key = `${pos(t.fen)}|${t.san}`;
  if (done.has(key)) continue;
  const before = await engine.analyse(t.fen, { depth: 12 });
  const e0 = before.score === null ? 0 : -before.score; // student's seat
  const c = new Chess(t.fen);
  c.move(t.san);
  const after = await engine.analyse(c.fen(), { depth: 12 });
  const e1 = after.score ?? 0;
  if (after.best && e1 >= SCREEN_CP && e1 - e0 >= SCREEN_CP) {
    const mat0 = material(new Chess(t.fen), t.student);
    const punish = [];
    for (let k = 0; k < 8; k++) {
      const r = await engine.analyse(c.fen(), { depth: 14 });
      if (!r.best) break;
      punish.push(uciMove(c, r.best).san);
    }
    const fin = await engine.analyse(c.fen(), { depth: 16 });
    const mate = c.isCheckmate() || Math.abs(fin.score ?? 0) >= 10000;
    const endCp = c.isCheckmate() ? 100000 : (c.turn() === t.student ? fin.score : -(fin.score ?? 0)) ?? 0;
    const won = material(c, t.student) - mat0;
    const kind = endCp >= TRAP_CP && (won >= 2 || mate) ? 'trap'
      : endCp >= MISTAKE_CP && won >= 0 ? 'mistake'
        : endCp >= MISTAKE_CP ? 'initiative' : null;
    if (kind) {
      out.found.push({
        kind, slip: t.san, punish, endCp, materialWon: won, e0, e1,
        sharePct: +(t.share * 100).toFixed(1), reachPct: +(t.reach * 100).toFixed(3), games: t.games,
        path: t.path, fen: t.fen, serves: t.serves,
        missingIn: t.serves.map((s) => s.openingId).filter((id) => !known.has(`${id}|${pos(t.fen)}|${t.san}`)),
      });
    }
  }
  out.done.push(key);
  if (++n % 25 === 0) {
    writeFileSync(`${root}audit-reports/trap-census-slips.shard-${I}.json`, JSON.stringify(out));
    console.log(`[slips ${I}/${N}] ${n + done.size}/${mine.length} · ${out.found.length} found`);
  }
}
engine.quit();
writeFileSync(`${root}audit-reports/trap-census-slips.shard-${I}.json`, JSON.stringify(out));
console.log(`[slips ${I}/${N}] done ${mine.length} · ${out.found.length} found`);
