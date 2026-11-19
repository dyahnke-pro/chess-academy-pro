// FIT THE READ DECIDER'S WEIGHTS on Danya's reads (research tool, never part
// of the app). Every fact the app computed on his boards is labelled by
// whether one of his ideas on that board matched it (the have-check by
// meaning) — half a point when no idea of his matched it but a reader flagged
// it GOOD teaching — and by whether a reader flagged it FALSE / RESTATE /
// REPEAT or the have-check called it wrong. The weight of a fact is its smoothed rate of
// "Danya says this", minus its smoothed rate of being wrong, shrunk level by
// level toward its parent: (bucket, on the best move, from, kind, computer) →
// … → kind → the global rate. Fitted on the TRAIN videos only, so the held-out
// videos measure it.
//   node scripts/danya/fit-read-weights.mjs [--all]   (--all: fit every video)
// Writes src/data/read-decider-weights.json.
import fs from 'node:fs';

const H = 'audit-reports/danya-havecheck/';
const A = 6; // shrinkage toward the parent level
const LAM = 1; // how hard a wrong / flagged fact is pushed down
const BAR = 0.06; // the bar a fact clears to be said (chosen on train)
const GOOD = 0.5; // a reader's GOOD, where no idea of his matched
const ALL = process.argv.includes('--all');

const boards = fs.readFileSync(H + 'board-facts-2026-11-19-unlocked.jsonl', 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const hc = JSON.parse(fs.readFileSync(H + 'havecheck-by-meaning-2026-11-19.json', 'utf8'));
const flagFiles = ['narration-flags-A.json', 'narration-flags-B.json'].filter((f) => fs.existsSync(H + f));
const byId = new Map(boards.map((b) => [b.id, b]));

/** The split, by video, from the video's name alone (FNV-1a), so every tool
 *  that measures the decider splits the same way. */
export function videoSplit(video) {
  let x = 2166136261;
  for (const c of Buffer.from('danya' + video)) x = Math.imul(x ^ c, 16777619) >>> 0;
  return x % 10 < 7 ? 'train' : 'held';
}

const matchFact = (b, txt) => {
  if (!txt) return -1;
  const exact = b.facts.findIndex((x) => x.text === txt);
  if (exact >= 0) return exact;
  return b.facts.findIndex((x) => x.text.includes(txt.slice(0, 40)) || txt.includes(x.text.slice(0, 40)));
};
const label = new Map();
const lab = (id, i) => { const k = `${id}#${i}`; if (!label.has(k)) label.set(k, { pos: 0, bad: 0, good: 0 }); return label.get(k); };
for (const r of hc.rows) {
  const b = byId.get(r.board); if (!b) continue;
  const i = matchFact(b, r.appText); if (i < 0) continue;
  if (r.verdict === 'said' || r.verdict === 'partial') lab(r.board, i).pos += 1;
  if (r.verdict === 'wrong') lab(r.board, i).bad += 1;
}
for (const f of flagFiles) {
  for (const fl of JSON.parse(fs.readFileSync(H + f, 'utf8')).flags) {
    const bad = ['FALSE', 'RESTATE', 'REPEAT'].includes(fl.flag);
    if (!bad && fl.flag !== 'GOOD') continue;
    const b = byId.get(fl.id); if (!b) continue;
    const s = fl.sentence.replace(/[.…]+$/, '').slice(0, 50);
    b.facts.forEach((x, i) => { if (s && x.text.includes(s)) lab(fl.id, i)[bad ? 'bad' : 'good'] += 1; });
  }
}

// The dump predates the bare-verdict kind: a standing with no reason after it.
const BARE = /^(You're [a-z ]+|Roughly balanced|They have a forced mate here|There is a forced mate here for you)\.$/;
const kindOf = (x) => (x.kind === 'standing' && BARE.test(x.text) ? 'standing-bare' : x.kind);
const bucketOf = (b) => {
  const t = (b.lines ?? [])[0];
  if (!t) return 'open';
  if (t.mate != null) return 'decided';
  return Math.abs(t.cp ?? 0) >= 300 ? 'decided' : 'open';
};
const bestSquares = (b) => { const m = (b.lines ?? [])[0]?.moves?.[0]; return m ? [m.slice(0, 2), m.slice(2, 4)] : []; };
const squaresIn = (t) => [...new Set(t.match(/\b[a-h][1-8]\b/g) ?? [])];

/** The keys of a fact, most specific first — the same list `readDecider`
 *  builds in the app (`weightKeys`). */
export function weightKeys(bucket, onBest, from, kind, computer) {
  const c = computer ?? '-';
  const ob = onBest ? 'B' : 'n';
  return [`${bucket}|${ob}|${from}:${kind}:${c}`, `${ob}|${from}:${kind}:${c}`, `${bucket}|${from}:${kind}:${c}`, `${bucket}|${from}:${kind}`, `${from}:${kind}:${c}`, `${from}:${kind}`, kind];
}

const stat = new Map();
const facts = [];
for (const b of boards) {
  if (!ALL && videoSplit(b.id.split('#')[0]) !== 'train') continue;
  const bk = bucketOf(b); const best = new Set(bestSquares(b));
  b.facts.forEach((x, i) => {
    const l = label.get(`${b.id}#${i}`) ?? { pos: 0, bad: 0, good: 0 };
    const onBest = squaresIn(x.text).some((s) => best.has(s));
    const keys = weightKeys(bk, onBest, x.from, kindOf(x), x.computer);
    facts.push(keys);
    for (const k of keys) {
      const s = stat.get(k) ?? { n: 0, pos: 0, bad: 0 };
      s.n += 1; s.pos += l.pos > 0 ? 1 : l.good > 0 ? GOOD : 0; s.bad += l.bad > 0 ? 1 : 0;
      stat.set(k, s);
    }
  });
}
const kindLevel = [...stat.entries()].filter(([k]) => !k.includes(':') && !k.includes('|'));
const p0 = kindLevel.reduce((a, [, s]) => a + s.pos, 0) / kindLevel.reduce((a, [, s]) => a + s.n, 0);
const memo = new Map();
const est = (keys) => {
  if (keys.length === 0) return p0;
  const id = keys.join('>');
  if (memo.has(id)) return memo.get(id);
  const parent = est(keys.slice(1));
  const s = stat.get(keys[0]);
  const v = s ? (s.pos + A * parent) / (s.n + A) - (LAM * s.bad) / (s.n + A) : parent;
  memo.set(id, v);
  return v;
};
const weights = {};
for (const keys of facts) for (let i = 0; i < keys.length; i += 1) weights[keys[i]] = Math.round(est(keys.slice(i)) * 10000) / 10000;
const sorted = Object.fromEntries(Object.entries(weights).sort(([a], [b]) => (a < b ? -1 : 1)));
fs.writeFileSync('src/data/read-decider-weights.json', JSON.stringify({
  fitted: '2026-11-19', on: ALL ? 'all videos' : 'train videos', A, LAM, good: GOOD, bar: BAR, prior: Math.round(p0 * 10000) / 10000, weights: sorted,
}, null, 1) + '\n');
console.log('weights', Object.keys(sorted).length, 'prior', p0.toFixed(4), 'facts', facts.length);
