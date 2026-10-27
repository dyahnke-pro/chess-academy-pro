// Every STUDENT move in every course subline, checked by the engine
// (WO-COURSE-01 C). A subline is a line we teach the student to play; a move in
// it that throws away a pawn, misses the punishment of a known mistake, or a
// line that stops on the opponent's move with no answer, teaches the wrong
// thing however well it is narrated.
//
// Flags per subline (first offending student ply wins):
//   ends-on-trigger   — the line stops on the opponent's deviation
//   missed-punishment — the trigger is a known mistake (engine-verified gem,
//                       ≥ +0.5) and the student's first reply is not its punish
//   loses-material    — a student move scores ≥ LOSS_CP worse than the best
//                       move at depth DEPTH (skipped when the position is
//                       already decided both ways: best and played both ≥ +5
//                       or both ≤ −5 for the student)
//   thin-step         — informational: a move taken from fewer than 8 master
//                       games (the masterclass rule's floor)
//
// Usage: node scripts/course-replies/subline-soundness.mjs <shard i/n>
// Writes audit-reports/subline-soundness/shard-<i>.jsonl, one row per
// subline, appended as it goes (a killed run resumes). Progress every 50.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';

const root = new URL('../..', import.meta.url).pathname;
const [I, N] = (process.argv[2] ?? '0/1').split('/').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 12);
const LOSS_CP = Number(process.env.LOSS_CP ?? 100);
const DECIDED = 500;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const pos = (f) => f.split(' ').slice(0, 4).join(' ');

const subs = J('src/data/course-sublines.json');
const masters = J('public/data/openings-masters-db.json').positions;
const gems = [...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')];
const rep = J('src/data/repertoire.json');
const proRaw = J('src/data/pro-repertoires.json');
const pro = Array.isArray(proRaw) ? proRaw : proRaw.openings;
const g = J('src/data/gambits.json');
const gam = Array.isArray(g) ? g : g.openings ?? g.gambits ?? [];
const a = J('src/data/anti-openings.json');
const anti = Array.isArray(a) ? a : a.openings ?? Object.values(a);
const colorOf = new Map([...rep, ...pro, ...gam, ...anti].filter((o) => o?.id).map((o) => [o.id, o.color]));

const gemAt = new Map();
for (const gm of gems) {
  if (gm.tier !== 'confirmed' && gm.tier !== 'positional') continue;
  const c = new Chess();
  try { for (const s of gm.lineMoves.trim().split(/\s+/).filter(Boolean)) c.move(s); } catch { continue; }
  gemAt.set(`${gm.openingId}|${pos(c.fen())}|${gm.inaccuracy}`, gm);
}

const all = [];
for (const [id, vs] of Object.entries(subs)) for (const [vi, arr] of Object.entries(vs)) for (const s of arr) all.push({ id, vi, s });
const onlyKeys = process.env.ONLY_KEYS_FILE ? new Set(JSON.parse(readFileSync(process.env.ONLY_KEYS_FILE, 'utf8'))) : null;
const mine = all.filter((x, k) => k % N === I && (!onlyKeys || onlyKeys.has(`${x.id}::${x.vi}::${x.s.triggerMove}@${x.s.atPly}`)));

const outDir = root + (process.env.OUT_DIR ?? 'audit-reports/subline-soundness/');
mkdirSync(outDir, { recursive: true });
const outFile = `${outDir}shard-${I}.jsonl`;
const done = new Set(existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).key) : []);

const eng = new Engine();
const t0 = Date.now();
let n = 0;
for (const { id, vi, s } of mine) {
  const key = `${id}::${vi}::${s.triggerMove}@${s.atPly}`;
  if (done.has(key)) continue;
  const color = colorOf.get(id) ?? 'white';
  const studentTurn = color === 'white' ? 'w' : 'b';
  const row = { key, flags: [], thin: [] };
  if (s.moves.length <= s.atPly + 1) row.flags.push({ kind: 'ends-on-trigger', ply: s.atPly + 1 });
  const c = new Chess();
  for (let i = 0; i < s.moves.length; i++) {
    const fen = c.fen();
    const san = s.moves[i];
    const ms = masters[pos(fen)] ?? [];
    const tot = ms.reduce((t, m) => t + m.games, 0);
    const hit = ms.find((m) => m.san === san);
    if (i > s.atPly && hit && tot < 8) row.thin.push(i);
    let mv;
    try { mv = c.move(san); } catch { row.flags.push({ kind: 'illegal', ply: i, san }); break; }
    if (i > s.atPly && fen.split(' ')[1] === studentTurn && !row.flags.length) {
      if (i === s.atPly + 1) {
        const before = new Chess(); for (const x of s.moves.slice(0, s.atPly)) before.move(x);
        const gm = gemAt.get(`${id}|${pos(before.fen())}|${s.moves[s.atPly]}`);
        if (gm && mv.san !== gm.punish) row.flags.push({ kind: 'missed-punishment', ply: i, san: mv.san, punish: gm.punish, gemCp: gm.engineCp });
      }
      if (!row.flags.length) {
        const best = await eng.analyse(fen, { depth: DEPTH });
        const uci = mv.from + mv.to + (mv.promotion ?? '');
        const played = best.best === uci ? best : await eng.analyse(fen, { depth: DEPTH, searchmoves: [uci] });
        if (best.score !== null && played.score !== null) {
          const loss = best.score - played.score;
          const decided = (best.score >= DECIDED && played.score >= DECIDED) || (best.score <= -DECIDED && played.score <= -DECIDED);
          if (loss >= LOSS_CP && !decided) row.flags.push({ kind: 'loses-material', ply: i, san: mv.san, best: best.best, loss, bestCp: best.score });
        }
      }
    }
  }
  appendFileSync(outFile, JSON.stringify(row) + '\n');
  if (++n % 50 === 0) console.log(`[soundness ${I}/${N}] ${n + done.size}/${mine.length} · ${Math.round((Date.now() - t0) / 60000)}min`);
}
eng.quit();
console.log(`[soundness ${I}/${N}] done ${mine.length}`);
