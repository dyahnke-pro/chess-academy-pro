#!/usr/bin/env node
// L6: sum the one-price measurement shards (recordReprice.measure.test.ts)
// against David's stored record, and spot-check changed rows at depth 20.
//   node scripts/record-reprice-report.mjs [--spot 5]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';

const DROP = 'audit-reports/.fixtures/data-drop-david.json';
const DIR = 'audit-reports/record-reprice';
const MISTAKE_CP = 100; // movePlayedCleanly's bar (capabilityEvidence)
const FAULT = new Set(['inaccuracy', 'mistake', 'blunder']);

const raw = JSON.parse(readFileSync(DROP, 'utf8'));
const t = raw.stores ?? raw.tables ?? raw;
const games = new Map(t.games.map((g) => [g.id, g]));

const priced = new Map(); // `${game}|${fen}|${san}` -> { cost, cls, old }
let gamesRead = 0, movesPriced = 0;
const annChanges = {};
for (const f of readdirSync(DIR).filter((x) => /^shard-\d+\.jsonl$/.test(x))) {
  for (const line of readFileSync(`${DIR}/${f}`, 'utf8').split('\n').filter(Boolean)) {
    const g = JSON.parse(line);
    if (g.skipped) continue;
    gamesRead += 1;
    movesPriced += g.priced;
    for (const c of g.costs) priced.set(`${g.id}|${c.fen}|${c.san}`, c);
    for (const ch of g.changes) {
      const k = `${ch.before.classification}→${ch.after.classification}`;
      annChanges[k] = (annChanges[k] ?? 0) + 1;
    }
  }
}

const tally = (rows, label) => {
  const out = { rows: rows.length, matched: 0, bandMoved: 0, notAFault: 0, unchanged: 0, transitions: {} };
  const moved = [];
  for (const r of rows) {
    const p = priced.get(`${r.gid}|${r.fen}|${r.san}`);
    if (!p) continue;
    out.matched += 1;
    const old = r.old ?? p.old;
    if (!FAULT.has(p.cls)) { out.notAFault += 1; out.transitions[`${old}→not a fault`] = (out.transitions[`${old}→not a fault`] ?? 0) + 1; moved.push({ ...r, old, now: 'not a fault', cost: p.cost }); continue; }
    if (p.cls !== old) { out.bandMoved += 1; out.transitions[`${old}→${p.cls}`] = (out.transitions[`${old}→${p.cls}`] ?? 0) + 1; moved.push({ ...r, old, now: p.cls, cost: p.cost }); } else out.unchanged += 1;
  }
  return { label, ...out, moved };
};

const tags = tally(t.misconceptionTags.filter((r) => r.source === 'auto-analysis' && r.sourceGameId)
  .map((r) => ({ id: r.id, gid: r.sourceGameId, fen: r.fen, san: r.playedSan, old: r.grade, oldCost: r.cpLoss })), 'slip rows');
const puzzles = tally(t.mistakePuzzles.filter((p) => p.sourceGameId)
  .map((p) => ({ id: p.id, gid: p.sourceGameId, fen: p.fen, san: p.playerMoveSan, old: p.classification, oldCost: p.cpLoss })), 'mistake puzzles');

// Capability rows: outcome is "clean" under 100cp. Only a cost-decided row can
// flip; a row the board's geometry broke stays broken (old cost < 100 + broken).
const ev = { rows: 0, matched: 0, heldToBroken: 0, brokenToHeld: 0 };
for (const r of t.capabilityEvidence) {
  if (r.origin !== 'review' || !r.sourceGameId) continue;
  ev.rows += 1;
  const p = priced.get(`${r.sourceGameId}|${r.fen}|${r.playedSan}`);
  if (!p) continue;
  ev.matched += 1;
  const nowClean = p.cost < MISTAKE_CP;
  if (r.outcome === 'held' && !nowClean) ev.heldToBroken += 1;
  else if (r.outcome === 'broken' && nowClean) {
    // Was it broken by its cost? Re-read the old two-read cost from the annotation.
    const g = games.get(r.sourceGameId);
    const a = g?.annotations?.find((x) => x.san === r.playedSan && x.bestMoveEval != null && x.evaluation != null);
    const oldCost = a ? Math.max(0, (a.bestMoveEval - a.evaluation) * (a.color === 'white' ? 1 : -1)) : null;
    if (oldCost !== null && oldCost >= MISTAKE_CP) ev.brokenToHeld += 1;
  }
}

// Spot-check: N changed slip rows, best vs played at depth 20 in one search.
const spotN = Number(process.argv[process.argv.indexOf('--spot') + 1] || 5);
const spots = tags.moved.filter((m, i) => i % Math.max(1, Math.floor(tags.moved.length / spotN)) === 0).slice(0, spotN);
async function d20(fen, best, played) {
  return new Promise((resolve) => {
    const p = spawn('/usr/games/stockfish');
    let buf = ''; const last = new Map();
    p.stdout.on('data', (d) => {
      buf += d.toString(); let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        const m = /\bdepth 20 .*\bmultipv (\d+) .*\bscore (cp|mate) (-?\d+).*\bpv (\S+)/.exec(line);
        if (m) last.set(m[4], m[2] === 'cp' ? Number(m[3]) : (Number(m[3]) > 0 ? 10000 : -10000));
        if (line.startsWith('bestmove')) { p.stdin.write('quit\n'); resolve(last); }
      }
    });
    p.stdin.write(`uci\nsetoption name Threads value 4\nsetoption name MultiPV value 2\nposition fen ${fen}\ngo depth 20 searchmoves ${best} ${played}\n`);
  });
}
const checked = [];
for (const s of spots) {
  const g = games.get(s.gid);
  const a = g.annotations.find((x) => x.san === s.san && x.bestMove);
  const c = new Chess(s.fen); const mv = c.move(s.san);
  const playedUci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
  const sc = await d20(s.fen, a.bestMove, playedUci);
  const d20cost = sc.has(a.bestMove) && sc.has(playedUci) ? sc.get(a.bestMove) - sc.get(playedUci) : null;
  checked.push({ game: s.gid, fen: s.fen, move: s.san, best: a.bestMove, oldLabel: s.old, oldCost: s.oldCost, newLabel: s.now, newCost: s.cost, d20Cost: d20cost });
}

const report = { gamesRead, movesPriced, annotationChanges: annChanges, tags: { ...tags, moved: undefined }, puzzles: { ...puzzles, moved: undefined }, evidence: ev, spotCheck: checked };
writeFileSync(`${DIR}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
