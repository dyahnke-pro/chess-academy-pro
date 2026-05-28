#!/usr/bin/env node
/**
 * Build a position-frequency index per pro from his harvested game dump.
 * Output: src/data/pro-game-anchors/<proId>.json
 *   { "<fen-key>": ["san1","san2",...] }  // moves the pro actually played from this position
 *
 * The pro's own games ARE the grounding database for HIS lessons (David
 * 2026-05-28: "use his real games. That's the database!"). This index lets
 * dbAnchor.ts treat a line as G3-anchored when each ply of the spine reaches
 * a position from which the pro played that move in ≥2 of his real games.
 *
 * USAGE: PLAYERS=gothamchess,naroditsky node scripts/build-pro-anchor-index.mjs
 *
 * SIZE control: only positions through PLY_CAP plies + only moves with ≥MIN_COUNT
 * occurrences are kept (filters one-off transpositions).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';

const PLY_CAP = 24;
const MIN_COUNT = 2;
const DUMP_DIR = 'docs/audit-runs/2026-05-27-pro-provenance/full-pgns';
const OUT_DIR = 'src/data/pro-game-anchors';

function positionKey(fen) {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ');
}

function buildIndex(dumpPath) {
  const dump = JSON.parse(readFileSync(dumpPath, 'utf-8'));
  const positions = new Map(); // key → Map(san → count)
  for (const g of dump.games) {
    if (!g.pgn) continue;
    const moves = g.pgn.split(' ').filter(Boolean);
    const c = new Chess();
    for (let i = 0; i < Math.min(moves.length, PLY_CAP); i += 1) {
      const key = positionKey(c.fen());
      let mv;
      try { mv = c.move(moves[i]); } catch { break; }
      if (!positions.has(key)) positions.set(key, new Map());
      const sanMap = positions.get(key);
      sanMap.set(mv.san, (sanMap.get(mv.san) ?? 0) + 1);
    }
  }
  const out = {};
  for (const [key, sanMap] of positions) {
    const sans = [...sanMap.entries()].filter(([, n]) => n >= MIN_COUNT).map(([s]) => s);
    if (sans.length) out[key] = sans;
  }
  return { positions: out, total: dump.games.length };
}

const players = (process.env.PLAYERS ?? 'gothamchess,naroditsky').split(',').map((s) => s.trim()).filter(Boolean);
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
for (const p of players) {
  const src = `${DUMP_DIR}/${p}.json`;
  if (!existsSync(src)) { console.warn(`[skip] no dump at ${src}`); continue; }
  const idx = buildIndex(src);
  const dst = `${OUT_DIR}/${p}.json`;
  writeFileSync(dst, JSON.stringify(idx) + '\n');
  const sizeKB = (JSON.stringify(idx).length / 1024).toFixed(0);
  console.log(`[${p}] ${Object.keys(idx.positions).length} positions from ${idx.total} games → ${dst} (${sizeKB} KB)`);
}
