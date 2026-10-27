// Repair the sublines the soundness check flagged (WO-COURSE-01 C), through
// the ONE course walker. A masterclass subline is rebuilt from its first bad
// student ply: the moves before it stand, the rest is walked again
// (`line-walk.mjs` — a known mistake is punished, masters ≥ 8 games, the
// student's moves engine-checked). The trigger, its ply and its frequency
// never change, so the subline keeps its key.
//
// A PRO subline is the pro's own game line (teach both, David 2026-07-02): only
// a line that stops on the trigger is extended; a pro line whose move the
// engine dislikes is listed for review, never rewritten.
//
// Usage:
//   node scripts/course-replies/repair-sublines.mjs --shard i/n   (walk 1/n of the flagged lines)
//   node scripts/course-replies/repair-sublines.mjs --merge [--write]
// Each shard writes audit-reports/subline-repair.shard-<i>.json; --merge folds
// them into audit-reports/subline-repair.json (every key, its cut, the old and
// new tail) and, with --write, into src/data/course-sublines.json.
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

const subs = J('src/data/course-sublines.json');
const masters = J('public/data/openings-masters-db.json').positions;
const knownMistakes = indexKnownMistakes([...J('src/data/punish-gems.json'), ...J('src/data/gambit-punish-gems.json')]);
const rep = J('src/data/repertoire.json');
const proRaw = J('src/data/pro-repertoires.json');
const pro = Array.isArray(proRaw) ? proRaw : proRaw.openings;
const g = J('src/data/gambits.json');
const gam = Array.isArray(g) ? g : g.openings ?? g.gambits ?? [];
const a = J('src/data/anti-openings.json');
const anti = Array.isArray(a) ? a : a.openings ?? Object.values(a);
const colorOf = new Map([...rep, ...pro, ...gam, ...anti].filter((o) => o?.id).map((o) => [o.id, o.color]));

const dir = root + (process.env.SOUNDNESS_DIR ?? 'audit-reports/subline-soundness/');
const PREFIX = process.env.REPAIR_PREFIX ?? 'subline-repair';
const rows = readdirSync(dir).filter((f) => f.endsWith('.jsonl'))
  .flatMap((f) => readFileSync(dir + f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))
  .filter((r) => r.flags.length);

if (MERGE) {
  const report = { repaired: [], proForReview: [] };
  for (const f of readdirSync(root + 'audit-reports').filter((x) => new RegExp(`^${PREFIX}\\.shard-\\d+\\.json$`).test(x))) {
    const part = JSON.parse(readFileSync(root + 'audit-reports/' + f, 'utf8'));
    report.repaired.push(...part.repaired);
    report.proForReview.push(...part.proForReview);
  }
  for (const r of report.repaired) {
    const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(r.key);
    const s = subs[m[1]][m[2]].find((x) => x.triggerMove === m[3] && x.atPly === Number(m[4]));
    s.moves = [...s.moves.slice(0, r.cut), ...r.after];
    const c = new Chess();
    for (const x of s.moves) c.move(x); // legality, or throw
    s.reachesMiddlegame = reachesMiddlegame(s.moves.join(' ')).pass;
  }
  writeFileSync(`${root}audit-reports/${PREFIX}.json`, JSON.stringify(report, null, 1));
  console.log(`[repair] merged ${report.repaired.length} rebuilt · ${report.proForReview.length} pro lines for review${WRITE ? '' : ' (dry run)'}`);
  if (WRITE) writeFileSync(root + 'src/data/course-sublines.json', JSON.stringify(subs));
  process.exit(0);
}

const engine = new Engine();
const report = { repaired: [], proForReview: [] };
let n = 0;
for (const r of rows.filter((_, k) => k % N === I)) {  const m = /^(.+)::(-?\d+)::(.+)@(\d+)$/.exec(r.key);
  if (!m) continue;
  const [, id, vi, trigger, atPlyS] = m;
  const s = subs[id]?.[vi]?.find((x) => x.triggerMove === trigger && x.atPly === Number(atPlyS));
  if (!s) continue;
  const flag = r.flags[0];
  const isPro = id.startsWith('pro-');
  if (isPro && flag.kind !== 'ends-on-trigger') { report.proForReview.push({ key: r.key, flag }); continue; }
  const cut = flag.kind === 'ends-on-trigger' ? s.atPly + 1 : flag.ply;
  const before = s.moves.slice(cut);
  // At least two student moves past the opponent's reply, and past the cut.
  const minLength = Math.max(cut + 1, s.atPly + 5);
  const moves = await walkToMiddlegame(s.moves.slice(0, cut), {
    studentColor: colorOf.get(id) ?? 'white', engine, masters, knownMistakes, openingId: id, minLength, maxPlies: Math.max(s.moves.length, minLength) + 22,
  });
  report.repaired.push({ key: r.key, flag: flag.kind, cut, before, after: moves.slice(cut) });
  if (++n % 25 === 0) {
    console.log(`[repair ${I}/${N}] ${n} rebuilt`);
    writeFileSync(`${root}audit-reports/${PREFIX}.shard-${I}.json`, JSON.stringify(report));
  }
}
engine.quit();
writeFileSync(`${root}audit-reports/${PREFIX}.shard-${I}.json`, JSON.stringify(report));
console.log(`[repair ${I}/${N}] done: ${report.repaired.length} rebuilt · ${report.proForReview.length} pro lines listed for review`);
