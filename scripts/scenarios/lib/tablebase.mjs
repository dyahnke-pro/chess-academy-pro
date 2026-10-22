// The lichess endgame tablebase (Syzygy, exact for ≤ 7 pieces) as the ground
// truth for the scenario builders (Lane R, 2026-10-22). A plain JSON query —
// https://tablebase.lichess.ovh/standard?fen=… — answered with the position's
// category and EVERY legal move's category.
//
// Categories: the position's is from the side to move's point of view; each
// MOVE's is from the point of view of the side to move AFTER it — a move
// whose category is "loss" wins for the mover (checked on a K+Q vs K board
// before this was written: every queen move is "loss", the one that hangs the
// queen is "draw").
//
// Polite by construction: one request at a time, a pause between requests,
// backoff on 429, and an on-disk cache (TB_CACHE, default in the OS temp dir)
// so a re-run asks nothing twice. The cache is research data, never shipped.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CACHE = process.env.TB_CACHE ?? join(tmpdir(), 'chess-academy-tablebase-cache.json');
const PAUSE_MS = 250;
let cache = null;
let dirty = 0;
let lastAt = 0;

function load() {
  if (cache) return cache;
  cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
  return cache;
}
export function flushTablebaseCache() {
  if (cache && dirty > 0) { writeFileSync(CACHE, JSON.stringify(cache)); dirty = 0; }
}
process.on('exit', flushTablebaseCache);

/** The cache key: placement, side to move, castling, en passant (no clocks). */
export const tbKey = (fen) => fen.split(' ').slice(0, 4).join(' ');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * `{ category, dtz, moves: [{ uci, san, category, dtz, zeroing }] }` for `fen`.
 * Throws after repeated failures — a builder must never guess a verdict.
 */
export async function probe(fen) {
  const c = load();
  const key = tbKey(fen);
  if (c[key]) return c[key];
  for (let attempt = 0; attempt < 8; attempt++) {
    const wait = lastAt + PAUSE_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    let res;
    try {
      res = await fetch(`https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`, { signal: AbortSignal.timeout(20_000) });
    } catch {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 429) { await sleep(60_000); continue; }
    if (!res.ok) { await sleep(1000 * (attempt + 1)); continue; }
    const d = await res.json();
    const out = {
      category: d.category,
      dtz: d.dtz,
      moves: d.moves.map((m) => ({ uci: m.uci, san: m.san, category: m.category, dtz: m.dtz, zeroing: m.zeroing })),
    };
    c[key] = out;
    if (++dirty % 25 === 0) flushTablebaseCache();
    return out;
  }
  throw new Error(`tablebase: no answer for ${fen}`);
}

/** Exact categories only — a cursed win, blessed loss, "maybe" or unknown is
 *  not a verdict a scenario may rest on. */
export const EXACT = new Set(['win', 'draw', 'loss']);
