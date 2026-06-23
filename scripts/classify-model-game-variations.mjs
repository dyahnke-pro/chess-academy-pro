#!/usr/bin/env node
// Tag each model game with the VARIATION it actually played, deterministically
// (David 2026-05-30, fix #1). Two-tier, PERFECT MATCH FIRST:
//   1. EXACT — the game follows a variation's IDENTIFYING PREFIX (the plies up
//      to where that variation diverges from the main line AND every sibling),
//      so it unambiguously played that variation. Prefer the most specific.
//   2. FALLBACK — if no exact match, the DEEPEST OPENING MATCH (David: "if you
//      can't find a match just use the model game with the deep opening
//      matching"): the variation the game follows furthest, as long as it
//      follows that variation deeper than it follows the MAIN line (so it
//      genuinely diverged down that variation's path).
// Compared by UCI (immune to SAN disambiguation drift). A game that follows the
// main line deepest stays untagged (= main line). Run with --write to persist.
import fs from 'node:fs';
import { Chess } from 'chess.js';
const WRITE = process.argv.includes('--write');
const rep = JSON.parse(fs.readFileSync('src/data/repertoire.json', 'utf8'));
const pro = JSON.parse(fs.readFileSync('src/data/pro-repertoires.json', 'utf8'));
const games = JSON.parse(fs.readFileSync('src/data/model-games.json', 'utf8'));
// pro-repertoires.json is { players, openings } — include its openings so pro
// model games file under their variation tab too (David 2026-06-23).
const proOpenings = Array.isArray(pro) ? pro : (pro.openings || []);
const openings = [...(Array.isArray(rep) ? rep : []), ...proOpenings];
const byId = new Map(openings.map((o) => [o.id, o]));

function uciList(pgnOrMoves) {
  const c = new Chess();
  const moves = Array.isArray(pgnOrMoves) ? pgnOrMoves : pgnOrMoves.trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const m of moves) { let mv; try { mv = c.move(m); } catch { break; } if (!mv) break; out.push(mv.from + mv.to + (mv.promotion || '')); }
  return out;
}
// Position list (board+turn+castling+ep, ignoring move counters) after each ply.
// Transposition-aware matching keys off these — a line reached via a different
// move order visits the SAME positions once it converges, so it still matches.
function posList(pgnOrMoves) {
  const c = new Chess();
  const moves = Array.isArray(pgnOrMoves) ? pgnOrMoves : pgnOrMoves.trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const m of moves) { let mv; try { mv = c.move(m); } catch { break; } if (!mv) break; out.push(c.fen().split(' ').slice(0, 4).join(' ')); }
  return out;
}
function commonLen(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
// Deepest ply of `linePositions` the game visits (set membership), transposition-proof.
function deepestReached(gameSet, linePositions) {
  let best = 0;
  for (let j = 0; j < linePositions.length; j++) if (gameSet.has(linePositions[j])) best = j + 1;
  return best;
}

// Per opening: the main-line UCI + each variation's full UCI and its
// identifying-prefix length (unique once past the longest prefix shared with
// the main line or any sibling).
function analyze(o) {
  const mainU = uciList(o.pgn || '');
  const vars = (o.variations || []).map((v) => ({ name: v.name, u: uciList(v.pgn || ''), p: posList(v.pgn || '') })).filter((v) => v.u.length);
  const others = (i) => [mainU, ...vars.filter((_, j) => j !== i).map((v) => v.u)];
  const ids = vars.map((v, i) => {
    let maxShared = 0;
    for (const ou of others(i)) maxShared = Math.max(maxShared, commonLen(v.u, ou));
    const L = Math.min(maxShared + 1, v.u.length);
    return { name: v.name, u: v.u, p: v.p, prefix: v.u.slice(0, L), L };
  });
  return { mainU, ids };
}

// Tier 3 floor: a transposition match must reach this many plies into the
// variation (set membership) to count — deep enough that the position is
// specific to that line, not a shared early tabiya.
const T3_FLOOR = 8;

const cache = new Map();
let exact = 0, deep = 0, transpose = 0, untagged = 0; const dist = {};
for (const g of games) {
  const o = byId.get(g.openingId);
  delete g.variation;
  if (!o) { untagged++; continue; }
  if (!cache.has(o.id)) cache.set(o.id, analyze(o));
  const { mainU, ids } = cache.get(o.id);
  const gu = uciList(g.pgn || '');
  const gset = new Set(posList(g.pgn || ''));

  // Tier 1 — exact (identifying-prefix) match; prefer the most specific.
  let best = null;
  for (const v of ids) {
    if (v.prefix.length > 0 && gu.length >= v.prefix.length && commonLen(gu, v.prefix) === v.prefix.length) {
      if (!best || v.L > best.L) best = v;
    }
  }
  let tier = best ? 'exact' : null;

  // Tier 2 — fallback: deepest opening match, deeper than the main line.
  if (!best) {
    const mainShare = commonLen(gu, mainU);
    let deepest = null, deepestLen = mainShare;
    for (const v of ids) {
      const cl = commonLen(gu, v.u);
      if (cl > deepestLen) { deepest = v; deepestLen = cl; }
    }
    if (deepest) { best = deepest; tier = 'deep'; }
  }

  // Tier 3 — transposition-aware (David 2026-06-23): a game that reaches the
  // taught variation via a different move order (e.g. Caro Classical via 2.Nd2,
  // QGD via an early Nf3) never matches the UCI prefix, so it fell through to
  // "untagged" and never surfaced under its variation tab. Tag it to the
  // variation it reaches DEEPEST by position, when that is clearly the deepest
  // (unique max) and deep enough (>= T3_FLOOR) to be specific to that line.
  if (!best) {
    const scored = ids.map((v) => ({ v, d: deepestReached(gset, v.p) })).sort((a, b) => b.d - a.d);
    const top = scored[0], second = scored[1];
    if (top && top.d >= T3_FLOOR && (!second || top.d > second.d)) { best = top.v; tier = 'transpose'; }
  }

  if (best) {
    g.variation = best.name;
    if (tier === 'exact') exact++; else if (tier === 'deep') deep++; else transpose++;
    const k = `${g.openingId} :: ${best.name} [${tier}]`;
    dist[k] = (dist[k] || 0) + 1;
  } else { untagged++; }
}
console.log(`exact ${exact}, deep-fallback ${deep}, transpose ${transpose}, untagged(main) ${untagged}, total ${games.length}`);
console.log('\ndistribution:');
Object.entries(dist).sort().forEach(([k, n]) => console.log(`  ${n}  ${k}`));
if (WRITE) { fs.writeFileSync('src/data/model-games.json', JSON.stringify(games, null, 2) + '\n'); console.log('\n[written]'); }
