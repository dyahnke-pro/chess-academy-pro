#!/usr/bin/env node
/*
 * Re-read the boards near the losing bar at a deeper search (WO-COURSE-01,
 * 2026-10-28). The grounding gates judge a line by the cache's depth-14 eval,
 * and depth 14 is noisy in sharp positions: of 16 lines it read below −1.0,
 * six were −0.60 to −0.96 at depth 20. A gate that fires on noise sends work
 * after lines that are fine. So every board whose depth-14 read sits within
 * reach of the bar (student −1.6 to −0.6) is searched again at depth 20 and
 * the deeper read is what the cache keeps — the builder treats a deeper entry
 * as cached, so a rebuild never overwrites it.
 *
 * Usage:
 *   GROUNDING_ENGINE=native node scripts/ci/deepen-grounding.cjs --shard i/n
 *   node scripts/ci/deepen-grounding.cjs --merge
 */
const fs = require('fs');
const path = require('path');
const { makeEngine } = require('./grounding-engine.cjs');

const root = path.join(__dirname, '..', '..');
const EVALS = path.join(root, 'src/data/grounding-evals.json');
const ITEMS = path.join(root, 'src/data/grounding-items.json');
const DEPTH = 20;
const args = process.argv.slice(2);
const shardOut = (i) => path.join(root, `audit-reports/grounding-deepen.shard-${i}.json`);

const evals = JSON.parse(fs.readFileSync(EVALS, 'utf8'));

if (args.includes('--merge')) {
  let n = 0;
  for (const f of fs.readdirSync(path.join(root, 'audit-reports')).filter((x) => /^grounding-deepen\.shard-\d+\.json$/.test(x))) {
    const part = JSON.parse(fs.readFileSync(path.join(root, 'audit-reports', f), 'utf8'));
    for (const [fen, e] of Object.entries(part)) { evals[fen] = e; n++; }
  }
  // Same file shape the builder writes (one line, insertion order kept).
  const raw = fs.readFileSync(EVALS, 'utf8');
  fs.writeFileSync(EVALS, JSON.stringify(evals) + (raw.endsWith('\n') ? '\n' : ''));
  console.log(`[deepen] ${n} boards re-read at depth ${DEPTH}`);
  process.exit(0);
}

const [I, N] = (args[args.indexOf('--shard') + 1] ?? '0/1').split('/').map(Number);
const { items } = JSON.parse(fs.readFileSync(ITEMS, 'utf8'));
const near = new Set();
for (const it of items) {
  const e = it.terminalFen && evals[it.terminalFen];
  if (!e || e.mate != null || it.color == null || (e.depth ?? 0) >= DEPTH) continue;
  const s = it.color === 'white' ? e.cp : -e.cp;
  if (s > -160 && s < -60) near.add(it.terminalFen);
}
const mine = [...near].sort().filter((_, k) => k % N === I);
const out = fs.existsSync(shardOut(I)) ? JSON.parse(fs.readFileSync(shardOut(I), 'utf8')) : {};
(async () => {
  const engine = makeEngine();
  let k = 0;
  for (const fen of mine) {
    if (out[fen]) continue;
    const r = await engine.evalFen(fen, DEPTH);
    out[fen] = { cp: r.cp, mate: r.mate, depth: DEPTH };
    if (++k % 20 === 0) {
      fs.writeFileSync(shardOut(I), JSON.stringify(out));
      console.log(`[deepen ${I}/${N}] ${Object.keys(out).length}/${mine.length}`);
    }
  }
  fs.writeFileSync(shardOut(I), JSON.stringify(out));
  engine.quit();
  console.log(`[deepen ${I}/${N}] done: ${Object.keys(out).length}/${mine.length}`);
  process.exit(0);
})();
