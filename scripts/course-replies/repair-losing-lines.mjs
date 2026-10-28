// Repair the reply lines that leave the student worse than a pawn, or walk
// past a known mistake without punishing it (WO-COURSE-01, 2026-10-28).
//
// The first soundness pass flagged single moves that lost a pawn (LOSS_CP 100)
// and the grounding gate only fired at −1.5, so 60 lines that DRIFT to between
// −1.0 and −1.5 — no one move bad enough to flag — were still taught, and
// pro lines were only listed for review. One rule for every line, pro or not
// (gambits excepted — their loss is the sacrifice itself):
//   - target: a non-gambit line whose last board is below −100 for the
//     student (the grounding cache), a line the soundness check flagged, or a
//     line where the opponent plays a known mistake and the student's next
//     move is not its punishment;
//   - cut: the punishment's ply; else the flagged ply; else the first student
//     move after the reply that loses ≥ 50cp to the engine's best (depth 16),
//     else the costliest one;
//   - the moves before the cut stand (the trigger and its key never change),
//     the rest is walked again through THE ONE walker (`line-walk.mjs`), and
//     the end is re-read; a line still below −100 is cut again (3 rounds);
//   - a PRO line keeps what the pro played at the cut (`proPlayed`) so the
//     teaching can say it, and its stored eval is refreshed.
//
// Usage:
//   node scripts/course-replies/repair-losing-lines.mjs --shard i/n
//   node scripts/course-replies/repair-losing-lines.mjs --merge [--write]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine } from './engine.mjs';
import { walkToMiddlegame, indexKnownMistakes } from './line-walk.mjs';
import { reachesMiddlegame } from '../../src/data/variationMiddlegameDepth.shared.mjs';

const root = new URL('../..', import.meta.url).pathname;
const J = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const WRITE = process.argv.includes('--write');
const MERGE = process.argv.includes('--merge');
const shardArg = process.argv[process.argv.indexOf('--shard') + 1];
const [I, N] = process.argv.includes('--shard') ? shardArg.split('/').map(Number) : [0, 1];
const LOSING = -100;
const SLIP = 50;
const DEPTH = 16;
const PREFIX = 'losing-lines-repair';
const pos = (f) => f.split(' ').slice(0, 4).join(' ');
const keyOf = (id, tab, s) => `${id}::${tab}::${s.triggerMove}@${s.atPly}`;

const subs = J('src/data/course-sublines.json');

if (MERGE) {
  const report = { repaired: [], unresolved: [] };
  for (const f of readdirSync(root + 'audit-reports').filter((x) => new RegExp(`^${PREFIX}\\.shard-\\d+\\.json$`).test(x))) {
    const part = J('audit-reports/' + f);
    report.repaired.push(...part.repaired);
    report.unresolved.push(...part.unresolved);
  }
  for (const r of report.repaired) {
    const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(r.key);
    const s = subs[m[1]][m[2]].find((x) => x.triggerMove === m[3] && x.atPly === Number(m[4]));
    s.moves = r.after;
    const c = new Chess();
    for (const x of s.moves) c.move(x); // legality, or throw
    s.reachesMiddlegame = reachesMiddlegame(s.moves.join(' ')).pass;
    if (r.pro) {
      s.proPlayed = r.proPlayed;
      s.evalCp = r.endCp;
      s.dubious = r.endCp < LOSING;
      if (!s.dubious) { delete s.engineBest; delete s.engineBestLine; }
    }
  }
  writeFileSync(`${root}audit-reports/${PREFIX}.json`, JSON.stringify(report, null, 1));
  console.log(`[repair] ${report.repaired.length} rebuilt · ${report.unresolved.length} still below ${LOSING}${WRITE ? '' : ' (dry run)'}`);
  if (WRITE) writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(subs));
  process.exit(0);
}

const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const items = J('src/data/grounding-items.json').items;
const evals = J('src/data/grounding-evals.json');
const studentCp = (fen, color) => {
  const e = evals[fen];
  if (!e) return null;
  const w = e.mate != null ? (e.mate > 0 ? 10000 : -10000) : e.cp;
  return color === 'white' ? w : -w;
};

// Targets from the grounding cache (non-gambit lines ending below −100) …
const targets = new Map();
const gambit = new Set(items.filter((it) => it.cat === 'subline' && it.isGambit).map((it) => it.name));
for (const it of items) {
  if (it.cat !== 'subline' || it.isGambit) continue;
  const cp = studentCp(it.terminalFen, it.color);
  if (cp != null && cp < LOSING) targets.set(it.name, { why: 'ends-losing', color: it.color, endBefore: cp });
}
// … the soundness check's pro list …
for (const p of J('audit-reports/subline-repair.json').proForReview) {
  if (!targets.has(p.key)) targets.set(p.key, { why: 'loses-material', cut: p.flag.ply });
  else targets.get(p.key).cut = p.flag.ply;
}
// … and every line that walks past a known mistake without punishing it.
const colorOf = new Map(items.filter((it) => it.cat === 'subline').map((it) => [it.id, it.color]));
for (const [id, tabs] of Object.entries(subs)) {
  for (const [tab, list] of Object.entries(tabs)) {
    for (const s of list) {
      const c = new Chess();
      for (let i = 0; i < s.moves.length - 1; i++) {
        const before = pos(c.fen());
        c.move(s.moves[i]);
        if (i < s.atPly) continue;
        const gem = knownMistakes.get(`${id}|${before}|${s.moves[i]}`);
        if (gem && s.moves[i + 1] !== gem.punishSeq[0]) {
          const k = keyOf(id, tab, s);
          const t = targets.get(k) ?? { why: 'missed-punishment' };
          t.cut = Math.min(t.cut ?? Infinity, i + 1);
          t.why = 'missed-punishment';
          targets.set(k, t);
          break;
        }
      }
    }
  }
}

const engine = new Engine();
const color = (id) => colorOf.get(id) ?? 'white';
/** Student-POV eval of a board, the side to move searched at DEPTH. */
async function evalFor(fen, studentWhite) {
  const r = await engine.analyse(fen, { depth: DEPTH });
  const stm = new Chess(fen).turn() === 'w';
  return stm === studentWhite ? r.score : -r.score;
}
/** The cut on a line: the first student move after the reply losing ≥ SLIP,
 *  else the costliest. */
async function findCut(moves, atPly, studentWhite) {
  const c = new Chess();
  let worst = null;
  for (let i = 0; i < moves.length; i++) {
    const studentMove = (i % 2 === 0) === studentWhite;
    if (studentMove && i > atPly) {
      const before = c.fen();
      const best = await engine.analyse(before, { depth: DEPTH });
      const after = new Chess(before); after.move(moves[i]);
      const played = after.isCheckmate() ? 100000 : -(await engine.analyse(after.fen(), { depth: DEPTH })).score;
      const loss = best.score - played;
      if (loss >= SLIP) return { ply: i, loss };
      if (!worst || loss > worst.loss) worst = { ply: i, loss };
    }
    c.move(moves[i]);
  }
  return worst;
}

const report = { repaired: [], unresolved: [] };
const mine = [...targets.entries()].filter((_, k) => k % N === I);
let n = 0;
for (const [key, t] of mine) {
  const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(key);
  if (!m) continue;
  const [, id, tab, trigger, atPlyS] = m;
  const s = subs[id]?.[tab]?.find((x) => x.triggerMove === trigger && x.atPly === Number(atPlyS));
  if (!s) continue;
  const studentWhite = color(id) === 'white';
  const isPro = id.startsWith('pro-');
  let moves = [...s.moves];
  let firstCut = null;
  let endCp = null;
  for (let round = 0; round < 3; round++) {
    const cut = round === 0 && t.cut != null ? { ply: t.cut, loss: null } : await findCut(moves, s.atPly, studentWhite);
    if (!cut) break;
    if (firstCut == null) firstCut = cut.ply;
    const minLength = Math.max(cut.ply + 1, s.atPly + 5);
    moves = await walkToMiddlegame(moves.slice(0, cut.ply), {
      studentColor: color(id), engine, masters, knownMistakes, openingId: id, minLength,
      maxPlies: Math.max(s.moves.length, minLength) + 22, depth: 14,
    });
    const end = new Chess(); for (const x of moves) end.move(x);
    endCp = end.isCheckmate() ? (end.turn() === (studentWhite ? 'w' : 'b') ? -100000 : 100000) : await evalFor(end.fen(), studentWhite);
    // A gambit line is repaired for its one bad move, never judged by its end.
    if (endCp >= LOSING || gambit.has(key)) break;
  }
  const row = {
    key, why: t.why, pro: isPro, cut: firstCut,
    before: s.moves, after: moves, endBefore: t.endBefore ?? null, endCp,
    ...(isPro && firstCut != null && s.moves[firstCut] ? { proPlayed: { ply: firstCut, san: s.moves[firstCut] } } : {}),
  };
  if (moves.join(' ') !== s.moves.join(' ')) report.repaired.push(row);
  if (endCp != null && endCp < LOSING && !gambit.has(key)) report.unresolved.push({ key, why: t.why, endCp });
  if (++n % 5 === 0) {
    console.log(`[repair ${I}/${N}] ${n}/${mine.length}`);
    writeFileSync(`${root}audit-reports/${PREFIX}.shard-${I}.json`, JSON.stringify(report));
  }
}
engine.quit();
writeFileSync(`${root}audit-reports/${PREFIX}.shard-${I}.json`, JSON.stringify(report));
console.log(`[repair ${I}/${N}] done: ${report.repaired.length} rebuilt · ${report.unresolved.length} still below ${LOSING} · of ${mine.length} targets`);
