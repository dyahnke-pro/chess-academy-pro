#!/usr/bin/env node
/**
 * FULL-PGN harvest (David 2026-05-27): the provenance dump truncated each game
 * to 16 plies and then dropped even that. This pulls every chess.com game for a
 * pro and keeps the COMPLETE movetext (SAN) so we can mine the actual variation
 * lines + winning games he plays — no live one-off fetches, no generic explorer.
 *
 *   PLAYERS=naroditsky node scripts/harvest-pro-full-pgns.mjs
 *
 * Output: docs/audit-runs/2026-05-27-pro-provenance/full-pgns/<playerId>.json
 *   { playerId, handle, total, generatedAt, games: [{ color, eco, opening,
 *     result, tc, url, whiteElo, blackElo, date, pgn (full SAN) }] }
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = 'docs/audit-runs/2026-05-27-pro-provenance/full-pgns';
const MAX = Number(process.env.MAX_CC ?? 20000);
const CC_DELAY_MS = 250;

const HANDLES = {
  naroditsky: 'danielnaroditsky',
  gothamchess: 'gothamchess',
  ericrosen: 'imrosen',
  carlsen: 'magnuscarlsen',
  hikaru: 'hikaru',
  caruana: 'fabianocaruana',
  firouzja: 'firouzja2003',
  dubov: 'duhless',
  gukesh: 'gukeshdommaraju',
  praggnanandhaa: 'rpragchess',
  niemann: 'hansontwitch',
  annacramling: 'annacramling',
  chesswithakeem: 'chesswithakeem',
  samayraina: 'samayraina',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = (pgn, name) => { const m = pgn.match(new RegExp(`\\[${name} "([^"]*)"\\]`)); return m ? m[1] : null; };

async function fetchJson(url, ms = 45000) {
  for (let a = 0; a < 4; a += 1) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'ChessAcademyPro harvest (dyahnke@gmail.com)' }, signal: AbortSignal.timeout(ms) });
      if (r.status === 429) { await sleep(3000 * (a + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(1500 * (a + 1)); }
  }
  return null;
}

/** Full SAN movetext: strip the header block, comments, NAG/clock annotations,
 *  move numbers and the result token — keep every move. */
function fullMovetext(pgn) {
  const body = pgn.split(/\n\n/).slice(1).join('\n\n');
  return body
    .replace(/\{[^}]*\}/g, '')
    .replace(/\$\d+/g, '')
    .replace(/\d+\.(\.\.)?/g, '')
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function harvest(handle) {
  const arch = await fetchJson(`https://api.chess.com/pub/player/${handle}/games/archives`);
  if (!arch?.archives?.length) return [];
  const months = [...arch.archives].reverse();
  const out = [];
  for (const url of months) {
    if (out.length >= MAX) break;
    await sleep(CC_DELAY_MS);
    const data = await fetchJson(url);
    for (const g of data?.games ?? []) {
      if (!g.pgn || g.rules !== 'chess') continue;
      const w = (g.white?.username ?? '').toLowerCase();
      const color = w === handle ? 'white' : 'black';
      const res = g.white?.result === 'win' ? '1-0' : g.black?.result === 'win' ? '0-1' : '1/2-1/2';
      out.push({
        color,
        eco: tag(g.pgn, 'ECO'),
        opening: tag(g.pgn, 'ECOUrl')?.split('/openings/')[1]?.replace(/-/g, ' ') ?? null,
        result: res,
        tc: g.time_class,
        url: g.url,
        whiteElo: g.white?.rating ?? null,
        blackElo: g.black?.rating ?? null,
        date: tag(g.pgn, 'Date'),
        pgn: fullMovetext(g.pgn),
      });
    }
    process.stderr.write(`\r  ${out.length} games...`);
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const ids = (process.env.PLAYERS ?? 'naroditsky').split(',').map((s) => s.trim()).filter(Boolean);
  for (const playerId of ids) {
    const handle = HANDLES[playerId];
    if (!handle) { process.stderr.write(`skip unknown ${playerId}\n`); continue; }
    process.stderr.write(`\n=== ${playerId} (${handle}) ===\n`);
    const games = await harvest(handle);
    const payload = { playerId, handle, total: games.length, generatedAt: new Date().toISOString(), games };
    await writeFile(join(OUT_DIR, `${playerId}.json`), JSON.stringify(payload));
    process.stderr.write(`\n  -> wrote ${playerId}.json (${games.length} full-PGN games)\n`);
  }
  process.stderr.write('DONE\n');
}

main();
