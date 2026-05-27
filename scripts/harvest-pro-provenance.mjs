#!/usr/bin/env node
/**
 * Phase 0 provenance harvest (David 2026-05-27): for each pro, pull what they
 * ACTUALLY play from the Lichess per-player explorer, walking the most-frequent
 * line at each ply to surface their real main systems with frequencies + scores.
 *
 * Source: explorer.lichess.ovh/player?player=<handle>&color=<c>&play=<uci,csv>
 * (reachable direct from this sandbox 2026-05-27 — no proxy needed).
 *
 * This is grounding, not authoring: output is a per-player tree of real lines we
 * can bind variations to. Run: node scripts/harvest-pro-provenance.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = 'https://explorer.lichess.ovh/player';
const DELAY_MS = 1500; // player explorer is slow + rate-limited; be gentle
const MIN_GAMES = 20; // a "line he plays" floor at any node
const MIN_SHARE = 0.03; // ≥3% at its fork
const MAX_DEPTH = 12; // plies
const MAX_BRANCH_AT_PLAYER = 3; // capture up to 3 of the player's own choices

// Wave 1. handles verified from scripts/fetch-pro-games-local.mjs + live probes.
const WAVE1 = [
  { playerId: 'naroditsky', handle: 'Daniel_Naroditsky', type: 'teacher' },
  { playerId: 'gothamchess', handle: 'levyrozman', type: 'teacher' },
  { playerId: 'ericrosen', handle: 'EricRosen', type: 'teacher' },
  { playerId: 'carlsen', handle: 'DrNykterstein', type: 'elite', note: 'lichess=blitz; OTB repertoire needs masters-DB cross-check' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function node(handle, color, playUcis) {
  const params = new URLSearchParams({
    player: handle, color, recentGames: '0', moves: '12',
    play: playUcis.join(','),
    speeds: 'blitz,rapid,classical',
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(`${BASE}?${params}`, {
        headers: { Accept: 'application/x-ndjson', 'User-Agent': 'ChessAcademyPro provenance harvest (dyahnke@gmail.com)' },
        signal: AbortSignal.timeout(180_000),
      });
      if (res.status === 429) { await sleep(5000 * (attempt + 1)); continue; }
      if (!res.ok) return null;
      // NDJSON stream: progress lines carry queuePosition while Lichess indexes
      // the player's games; the FINAL line is the completed result. res.text()
      // resolves only once the stream closes (= indexing done).
      const text = await res.text();
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i -= 1) {
        try {
          const obj = JSON.parse(lines[i]);
          if (Array.isArray(obj.moves)) return obj; // last complete result
        } catch { /* skip partial */ }
      }
      return null;
    } catch { await sleep(2000 * (attempt + 1)); }
  }
  return null;
}

function isPlayerMove(color, ply) {
  // ply = number of half-moves already played. White moves on even ply (0,2,..).
  return color === 'white' ? ply % 2 === 0 : ply % 2 === 1;
}

// Walk: always follow the most-frequent move; at the PLAYER's own choice points
// near the root, branch into up to MAX_BRANCH_AT_PLAYER to capture multiple systems.
async function walk(handle, color, play, sans, depth, branchBudget, sink) {
  if (depth >= MAX_DEPTH) return;
  const data = await node(handle, color, play);
  await sleep(DELAY_MS);
  if (!data || !data.moves || data.moves.length === 0) return;
  const total = data.white + data.draws + data.black;
  const playerMove = isPlayerMove(color, play.length);
  const branch = playerMove && depth < 6 ? Math.min(branchBudget, MAX_BRANCH_AT_PLAYER) : 1;
  const picks = data.moves
    .filter((m) => (m.white + m.draws + m.black) >= MIN_GAMES)
    .filter((m) => (m.white + m.draws + m.black) / total >= (playerMove ? MIN_SHARE : 0.05))
    .slice(0, branch);
  for (const m of picks) {
    const g = m.white + m.draws + m.black;
    const score = Math.round(((color === 'white' ? m.white : m.black) + m.draws / 2) / g * 100);
    const line = [...sans, m.san];
    if (playerMove && depth >= 2) {
      sink.push({
        line: line.join(' '),
        eco: m.opening?.eco ?? null,
        name: m.opening?.name ?? null,
        games: g, share: +(g / total).toFixed(3), score, depth: line.length,
      });
    }
    await walk(handle, color, [...play, m.uci], line, depth + 1, branch > 1 ? branchBudget : 1, sink);
  }
}

async function main() {
  const out = { generatedAt: new Date().toISOString(), source: 'lichess /player explorer', floors: { MIN_GAMES, MIN_SHARE }, players: {} };
  const only = (process.env.PLAYERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const roster = only.length ? WAVE1.filter((p) => only.includes(p.playerId)) : WAVE1;
  for (const p of roster) {
    process.stderr.write(`\n=== ${p.playerId} (${p.handle}) ===\n`);
    const rec = { handle: p.handle, type: p.type, note: p.note ?? null, white: [], black: [] };
    for (const color of ['white', 'black']) {
      const sink = [];
      // For black, seed the two main white first moves so we read his replies.
      if (color === 'black') {
        for (const seed of [['e2e4', 'e4'], ['d2d4', 'd4']]) {
          await walk(p.handle, color, [seed[0]], [seed[1]], 1, MAX_BRANCH_AT_PLAYER, sink);
        }
      } else {
        await walk(p.handle, color, [], [], 0, MAX_BRANCH_AT_PLAYER, sink);
      }
      // keep the deepest, most-played representative lines (dedupe by eco+name, keep max depth)
      const byKey = new Map();
      for (const e of sink) {
        const k = `${e.eco}|${e.name}`;
        const prev = byKey.get(k);
        if (!prev || e.depth > prev.depth) byKey.set(k, e);
      }
      rec[color] = [...byKey.values()].sort((a, b) => b.games - a.games).slice(0, 12);
      process.stderr.write(`  ${color}: ${rec[color].length} lines\n`);
      rec[color].slice(0, 8).forEach((e) => process.stderr.write(`    ${String(e.games).padStart(4)}g ${e.score}%  ${e.eco ?? '?'} ${e.name ?? ''} :: ${e.line}\n`));
    }
    out.players[p.playerId] = rec;
  }
  await mkdir('docs/audit-runs/2026-05-27-pro-provenance', { recursive: true });
  await writeFile('docs/audit-runs/2026-05-27-pro-provenance/wave1.json', JSON.stringify(out, null, 2));
  process.stderr.write('\nwrote docs/audit-runs/2026-05-27-pro-provenance/wave1.json\n');
}

main();
