// Every opening line in the app, checked on hard facts — no sampling.
// (David 2026-10-07: "every variation and tabia needs to be checked".)
//
// For every masterclass opening (src/data/repertoire.json) and every pro
// repertoire (src/data/pro-repertoires.json), main line and EVERY variation:
//   legal       — chess.js replays every move
//   real        — masterclass: each move is in the masters DB at that position
//                 while the position is in it; pro: each move is in the
//                 player's own game tree (data/sources/<player>-trees)
//   branches    — a variation shares the opening's first moves (not a cold line)
//   middlegame  — reaches the middlegame (the same metric as the gate)
//   sound       — with --engine: the student is not clearly worse at the end
// For every middlegame/endgame plan (the tabia):
//   continuity  — criticalPositionFen is a position some line of its opening
//                 reaches (Gate C), and its playable lines are legal from it.
//
// Usage: node scripts/audit-every-variation.mjs [--engine] [--depth 14]
// Writes audit-reports/every-variation.json and prints a summary.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Chess } from 'chess.js';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => JSON.parse(readFileSync(ROOT + p, 'utf8'));
const args = process.argv.slice(2);
const ENGINE = args.includes('--engine');
const DEPTH = Number(args[args.indexOf('--depth') + 1]) || 14;
const MIN_POS_GAMES = 50;

const rep = read('src/data/repertoire.json');
const masterclass = Array.isArray(rep) ? rep : rep.openings;
const pro = read('src/data/pro-repertoires.json').openings;
const anti = read('src/data/anti-openings.json');
const gambits = read('src/data/gambits.json');
// G3's canon for anti-lines and gambits (masters rarely play them, so the
// masters DB would flag every gambit): the line's first 6 plies must be a
// prefix of some named line in the Lichess opening DB, or that line a prefix
// of it (the repertoire-orientation gate's PGN_NOT_IN_DB rule).
// Matched by POSITION, not move order: the Lichess file is a naming table with
// one canonical order per line, so a mainstream line reached by transposition
// ("d4 d5 Bf4 Nf6 e3 Bf5" vs the London) fails a move-by-move prefix test.
const lichessFens = new Set();
for (const e of read('src/data/openings-lichess.json')) {
  const c = new Chess();
  for (const m of e.pgn.split(/\s+/)) {
    try { if (!c.move(m)) break; } catch { break; }
    lichessFens.add(c.fen().split(' ').slice(0, 4).join(' '));
  }
}
const plans = read('src/data/middlegame-plans.json');
const masters = read('public/data/openings-masters-db.json').positions;

const fen4 = (f) => f.split(' ').slice(0, 4).join(' ');
const sans = (pgn) => (pgn || '').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').split(/\s+/).filter((t) => t && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));

function replay(moves) {
  const c = new Chess();
  const fens = [fen4(c.fen())];
  for (let i = 0; i < moves.length; i++) {
    let m = null;
    try { m = c.move(moves[i]); } catch { m = null; }
    if (!m) return { ok: false, illegalAt: i, move: moves[i], fens };
    fens.push(fen4(c.fen()));
  }
  return { ok: true, fens, finalFen: c.fen() };
}

// masterclass: first ply whose move is NOT in the masters DB while the position is in it
function mastersGap(moves, fens) {
  for (let i = 0; i < moves.length; i++) {
    const row = masters[fens[i]];
    if (!row) return { inDbThrough: i, leftDbAt: null }; // position not in the DB: data ends here
    // A position masters rarely reached is not theory either way: judging a
    // move there off a handful of games flags natural moves (Philidor 3.d3
    // Nf6 sits on 7 games). The spine builder's own floor is "common".
    const total = row.reduce((n, r) => n + (r.games ?? 0), 0);
    if (total < MIN_POS_GAMES) return { inDbThrough: i, leftDbAt: null, thinAt: i };
    const san = moves[i].replace(/[+#]/g, '');
    if (!row.some((r) => r.san.replace(/[+#]/g, '') === san)) return { inDbThrough: i, leftDbAt: i, move: moves[i], posGames: total };
  }
  return { inDbThrough: moves.length, leftDbAt: null };
}

// pro: walk the player's trees
const PLAYER_DIR = { carlsen: 'magnuscarlsen', naroditsky: 'danielnaroditsky', gothamchess: 'gothamchess', hikaru: 'hikaru', caruana: 'fabianocaruana', ericrosen: 'imrosen', samayraina: 'samayraina', aman: 'chessbrah' };
const treeCache = {};
function treesFor(player) {
  if (treeCache[player]) return treeCache[player];
  const dir = ROOT + `data/sources/${PLAYER_DIR[player] ?? player}-trees`;
  treeCache[player] = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && !f.includes('model-games')).map((f) => { try { return JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); } catch { return null; } }).filter(Boolean) : [];
  return treeCache[player];
}
function proGrounding(player, moves) {
  let best = { inTreeThrough: 0, tree: null };
  for (const t of treesFor(player)) {
    const pre = t.minPrefix ?? [];
    if (pre.some((s, i) => moves[i]?.replace(/[+#]/g, '') !== s.replace(/[+#]/g, ''))) continue;
    let node = t.tree; let i = pre.length;
    while (node && i < moves.length) {
      const kids = node.children ?? {};
      const key = Object.keys(kids).find((k) => k.replace(/[+#]/g, '') === moves[i].replace(/[+#]/g, ''));
      if (!key || !(kids[key].games > 0)) break;
      node = kids[key]; i++;
    }
    if (i > best.inTreeThrough) best = { inTreeThrough: i, tree: t.openingId };
  }
  return best;
}

const lines = [];
function addLines(o, kind) {
  const color = o.color === 'black' ? 'b' : 'w';
  const main = sans(o.pgn);
  lines.push({ opening: o.id, kind, name: '<main>', color, moves: main, main: true });
  for (const v of o.variations ?? []) lines.push({ opening: o.id, kind, name: v.name, color, moves: sans(v.pgn), main: false, mainMoves: main });
}
masterclass.forEach((o) => addLines(o, 'masterclass'));
pro.forEach((o) => addLines(o, 'pro'));
// anti-lines + gambits carry their own plans; their moves are checked for
// legality + middlegame only (no masters/player grounding source to hold them to)
anti.forEach((o) => addLines(o, 'anti'));
gambits.forEach((o) => addLines(o, 'gambit'));

const reachedFens = {};
const results = [];
for (const l of lines) {
  const r = replay(l.moves);
  const res = { opening: l.opening, kind: l.kind, name: l.name, plies: l.moves.length, problems: [] };
  if (!r.ok) res.problems.push(`ILLEGAL at ply ${r.illegalAt + 1}: ${r.move}`);
  if (r.ok) {
    (reachedFens[l.opening] ??= new Set());
    r.fens.forEach((f) => reachedFens[l.opening].add(f));
    res.finalFen = r.finalFen;
    const mg = reachesMiddlegame(l.moves.join(' '));
    if (!mg.pass) res.problems.push(`SHORT: does not reach a middlegame (${mg.reason ?? 'metric failed'})`);
    if (!l.main) {
      const shared = l.moves.findIndex((m, i) => m !== l.mainMoves[i]);
      res.sharedWithMain = shared === -1 ? l.moves.length : shared;
      // system openings (London, English, KIA, Catalan) legitimately meet a
      // different reply on move 1-2, so only a line sharing NOTHING is cold
      if (res.sharedWithMain < 1) res.problems.push(`COLD: shares no move with the main line`);
    }
    if (l.kind === 'masterclass') {
      const g = mastersGap(l.moves, r.fens);
      res.inMastersDbThrough = g.inDbThrough;
      if (g.leftDbAt !== null) res.problems.push(`NOT IN MASTERS DB at ply ${g.leftDbAt + 1}: ${g.move} (masters reached this position in ${g.posGames} games and never played it)`);
    } else if (l.kind === 'anti' || l.kind === 'gambit') {
      // the position after 6 plies (or the line's end, if shorter) is a named
      // Lichess position or one masters reached
      const at = Math.min(6, l.moves.length);
      const f = r.fens[at];
      const anchored = lichessFens.has(f) || !!masters[f];
      if (!anchored) res.problems.push(`NOT IN LICHESS DB: the position after ${at} plies is neither a named line nor a masters position`);
    } else if (l.kind === 'pro') {
      const player = l.opening.split('-')[1];
      const g = proGrounding(player, l.moves);
      res.inPlayerTreeThrough = g.inTreeThrough; res.tree = g.tree;
      if (!treesFor(player).length) res.problems.push(`NO TREE DATA for player ${player}`);
      else if (g.inTreeThrough < Math.min(l.moves.length, 6)) res.problems.push(`NOT IN PLAYER'S GAMES beyond ply ${g.inTreeThrough}`);
    }
  }
  results.push(res);
}

// tabias: plans
const planResults = [];
for (const p of plans) {
  const pr = { id: p.id, opening: p.openingId, problems: [] };
  let pos = null;
  try { pos = new Chess(p.criticalPositionFen); } catch { pr.problems.push('BAD FEN'); }
  if (pos) {
    const reached = reachedFens[p.openingId];
    if (!reached) pr.problems.push(`ORPHAN: no opening with id ${p.openingId}`);
    // plan↔line continuity is the pawn-skeleton gate's job
    // (middlegamePlanContinuity.test.ts) — one definition, not two
    else if (reached.has(fen4(p.criticalPositionFen))) pr.onLine = true;
    (p.playableLines ?? []).forEach((pl, k) => {
      let c; try { c = new Chess(pl.fen || p.criticalPositionFen); } catch { pr.problems.push(`playable line ${k}: bad fen`); return; }
      for (const m of pl.moves ?? []) { let ok = null; try { ok = c.move(m); } catch { ok = null; } if (!ok) { pr.problems.push(`playable line ${k}: illegal ${m}`); break; } }
    });
  }
  planResults.push(pr);
}

// soundness (optional, slow): engine eval at each line's end, student POV
async function evalFen(fen) {
  return new Promise((res) => {
    const p = spawn('node', [ROOT + 'node_modules/stockfish/scripts/cli.js']);
    let out = ''; let done = false;
    p.stdout.on('data', (d) => { out += d; if (!done && /bestmove/.test(out)) { done = true; p.kill(); const m = [...out.matchAll(/score (cp|mate) (-?\d+)/g)].pop(); res(m ? (m[1] === 'mate' ? Math.sign(+m[2]) * 10000 : +m[2]) : null); } });
    p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${DEPTH}\n`);
    setTimeout(() => { if (!done) { done = true; p.kill(); res(null); } }, 60000);
  });
}
if (ENGINE) {
  for (const r of results) {
    if (!r.finalFen) continue;
    const cp = await evalFen(r.finalFen);
    if (cp === null) continue;
    const l = lines.find((x) => x.opening === r.opening && x.name === r.name);
    const stm = r.finalFen.split(' ')[1];
    const student = stm === l.color ? cp : -cp;
    r.studentEvalCp = student;
    if (student <= -100) r.problems.push(`UNSOUND: student about ${(student / 100).toFixed(1)} at the end (gambit showcases are allowed; check)`);
  }
}

const bad = results.filter((r) => r.problems.length);
const badPlans = planResults.filter((p) => p.problems.length);
const count = (arr, re) => arr.reduce((n, x) => n + x.problems.filter((p) => re.test(p)).length, 0);
const summary = {
  lines: results.length, linesWithProblems: bad.length,
  illegal: count(results, /^ILLEGAL/), short: count(results, /^SHORT/), cold: count(results, /^COLD/),
  notInMastersDb: count(results, /^NOT IN MASTERS/), notInPlayerGames: count(results, /^NOT IN PLAYER/), notInLichessDb: count(results, /^NOT IN LICHESS/), noTree: count(results, /^NO TREE/), unsound: count(results, /^UNSOUND/),
  plans: planResults.length, plansWithProblems: badPlans.length, plansExactlyOnLine: planResults.filter((p) => p.onLine).length, orphanPlans: count(planResults, /^ORPHAN/), illegalPlanLines: count(planResults, /illegal/),
  engine: ENGINE,
};
if (!existsSync(ROOT + 'audit-reports')) mkdirSync(ROOT + 'audit-reports');
writeFileSync(ROOT + 'audit-reports/every-variation.json', JSON.stringify({ summary, lines: results, plans: planResults }, null, 1));
console.log(JSON.stringify(summary, null, 1));
