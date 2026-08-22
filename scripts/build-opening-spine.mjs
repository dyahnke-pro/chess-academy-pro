#!/usr/bin/env node
// Data-driven opening spine builder (David 2026-05-29 — the masterclass rebuild
// engine). Walks the MOST-PLAYED move at every ply from the masters explorer
// (Lichess strong-player fallback for depth) while the position stays common,
// then mandatory-extends along the most-played move — NEVER below LOWFLOOR
// games, NEVER to 0 (never invented) — until a real middlegame is reached
// (>= MIDGAME_PLY). Emits the spine + per-ply game counts + the real branch
// points (variation tabs = a fork where the top move is a plurality and a
// sibling is also heavily played).
//
// This is the canonical "deep theory = the line the most games actually
// follow" build. If no games reached a position, it isn't theory — the walk
// can only step where games already are. Output backs lesson spines; narration
// is then authored ON the real moves (the LLM never picks a move — G3).
//
// Run: node scripts/build-opening-spine.mjs <openingId> "<seed SAN moves>"
//   e.g. node scripts/build-opening-spine.mjs italian-game "e4 e5 Nf3 Nc6 Bc4"
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const COMMON = Number(process.env.COMMON ?? 60);      // common-theory floor
const LOWFLOOR = Number(process.env.LOWFLOOR ?? 8);    // mandatory-extend floor (never 0)
const MIDGAME_PLY = Number(process.env.MIDGAME_PLY ?? 20); // must reach >= move 10
const BRANCH_PCT = 0.60, VAR_MIN = 150;                // a real variation tab
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uci = (ms) => { const c = new Chess(); return ms.map((m) => { const x = c.move(m); return x.from + x.to + (x.promotion ?? ''); }); };
const g = (m) => (m.white || 0) + (m.draws || 0) + (m.black || 0);
async function exp(ms, src) { const e = src === 'lichess' ? '&ratings=2000,2200,2500&speeds=blitz,rapid,classical' : ''; const r = await fetch(`${PROXY}?source=${src}&play=${uci(ms).join(',')}${e}`); return r.ok ? r.json() : null; }
async function node(ms) { let j = await exp(ms, 'masters'); await sleep(100); let src = 'masters', tot = j ? g(j) : 0; if (tot < COMMON) { const k = await exp(ms, 'lichess'); await sleep(100); if (k) { j = k; src = 'lichess'; tot = g(k); } } return { j, src, tot }; }

const [openingId, seedStr] = process.argv.slice(2);
if (!openingId || !seedStr) { console.error('usage: build-opening-spine.mjs <openingId> "<seed moves>"'); process.exit(1); }

(async () => {
  const seed = seedStr.trim().split(/\s+/);
  const line = [...seed], counts = [], branches = [];
  for (let i = 0; i < 50; i++) {
    const { j, src, tot } = await node(line);
    if (!j || !j.moves?.length) break;
    const top = j.moves[0], tg = g(top), pct = tot ? tg / tot : 0, ply = line.length;
    if (j.moves[1] && g(j.moves[1]) >= VAR_MIN && pct < BRANCH_PCT) {
      branches.push({ afterMove: Math.ceil(ply / 2), main: top.san, mainPct: Math.round(pct * 100), alt: j.moves[1].san, altGames: g(j.moves[1]) });
    }
    const reachedMid = line.length >= MIDGAME_PLY;
    if (tot < COMMON && reachedMid) break;       // common AND middlegame done → hand to plan
    if (tg < LOWFLOOR) break;                     // won't go thinner than LOWFLOOR (never invent)
    counts.push({ ply: ply + 1, move: Math.ceil((ply + 1) / 2), gamesAtPosition: tot, played: top.san, pct: Math.round(pct * 100), playedGames: tg, source: src });
    line.push(top.san);
  }
  const out = { openingId, seed, spine: line, plies: line.length, throughMove: Math.ceil(line.length / 2), reachedMiddlegame: line.length >= MIDGAME_PLY, counts, branches, floors: { COMMON, LOWFLOOR, MIDGAME_PLY }, generatedAt: new Date().toISOString() };
  mkdirSync('data/sources/opening-spines', { recursive: true });
  writeFileSync(`data/sources/opening-spines/${openingId}.json`, JSON.stringify(out, null, 2) + '\n');
  console.log(`[spine] ${openingId}: ${line.length} plies (move ${out.throughMove}), reachedMiddlegame=${out.reachedMiddlegame}, ${branches.length} branches`);
  console.log(`  ${line.join(' ')}`);
})();
